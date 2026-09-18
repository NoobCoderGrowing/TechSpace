package com.example.techspace.controller;


import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.example.techspace.ArticleRepository;
import com.example.techspace.CommentRepository;
import com.example.techspace.entity.Article;
import com.example.techspace.service.ArticleService;
import com.mongodb.client.result.UpdateResult;
import jakarta.annotation.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReadWriteLock;

@RestController
@CrossOrigin(origins = "*")
@RequestMapping(value = "/admin")
@EnableMethodSecurity
public class ContentMangement {

    @Autowired
    @Qualifier("articleLock")
    ReadWriteLock articleLock;


    @Resource
    ArticleRepository articleRepository;

    @Autowired
    @Qualifier("articleMap")
    ConcurrentHashMap<String, ConcurrentHashMap<String, ConcurrentHashMap<String,String>>> articleMap;

    @Resource
    ArticleService articleService;

    @Resource
    CommentRepository commentRepository;

    @Resource
    MongoTemplate mongoTemplate;

    @RequestMapping(value = "/upload/article", method = {RequestMethod.POST, RequestMethod.GET})
    @ResponseBody
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN')")
    public HashMap<String, Boolean> uploadArticle(@RequestBody Map<String,String> submitArticle){
        String params = JSONObject.toJSONString(submitArticle);
        Article article = JSON.parseObject(params, Article.class);
        String title = article.getTitle();
        String category = article.getCategory();
        HashMap<String, Boolean> response = new HashMap<String, Boolean>();
        if (!articleMap.containsKey(category) || !articleMap.get(category).containsKey(title)){
            while(!articleLock.writeLock().tryLock()){}
            try {
                articleRepository.save(article);
                response.put("uploaded", true);
                return response;
            }finally {
                articleLock.writeLock().unlock();
                articleService.hourlyUpdate();
            }
        }
        response.put("uploaded", false);
        return response;
    }

    @RequestMapping(value = "/delete/articleByID", method = RequestMethod.POST)
    @ResponseBody
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN')")
    public Map<String, Boolean> deleteArticleByID(@RequestBody Map<String,String> request){

        HashMap<String, Boolean> response = new HashMap<String, Boolean>();
        String id = request.get("id");
        while(!articleLock.writeLock().tryLock()){}
        try {
            articleRepository.deleteById(id);
            // 文章没了，它的评论就再也读不到了（读接口按 articleId 查）。
            // 不清的话这些行只会在库里越积越多，成为永远不可见的孤儿。
            commentRepository.deleteByArticleId(id);
            response.put("success", true);
            return response;
        }finally {
            articleLock.writeLock().unlock();
            articleService.hourlyUpdate();
        }
    }

    /**
     * 编辑一篇已发布的文章：标题 / 日期 / 分类 / 正文四个字段全可改。
     *
     * 和 upload 的两个关键差别：
     *
     * 1. **结构上不碰 `_id`，也不碰 `hits`。** 用 `$set` 而不是 `save()`：save 是
     *    按 _id 全量替换，而请求体反序列化出来的 hits 永远是 0（Article.java 里
     *    @ReadOnlyProperty 那段注释就是为这条路写的）；而且 save 是读-改-写，
     *    和并发的 $inc hits 会互相覆盖。$set 是一次原子写。
     *    `_id` 不变还有一个好处：评论是按 articleId 关联的，所以改名不丢评论。
     *
     * 2. **改完立刻重建目录缓存。** articleMap 按 (分类, 标题) 索引，而这两个
     *    正好是能改的字段 —— 不重建的话目录会脏着最多一小时（下次整点 cron）：
     *    旧标题还挂着、新标题搜不到、旧分类下还挂着它，而文章页直连 Mongo
     *    显示的是新标题，两边自相矛盾。缓存的键和叶是 title/date/category，
     *    content 不在缓存里（永远走库）。
     */
    @RequestMapping(value = "/update/article", method = RequestMethod.POST)
    @ResponseBody
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN')")
    public Map<String, Object> updateArticle(@RequestBody Map<String,String> request){
        // 字段从 Map 里直接读，**不**照 uploadArticle 那样用 fastjson 反序列化成
        // Article：Article 的字段叫 _id，body 里的 "id" 根本填不进去。
        String id = request.get("id");
        String title = request.get("title");
        String date = request.get("date");
        String content = request.get("content");
        String category = request.get("category");

        // 空值必须在服务端挡下。这不是"前端已经校验过了"的多余一道：
        // hourlyUpdate() 里是 articleMap.put(category, ...)，ConcurrentHashMap 的
        // key 为 null 会抛 NPE，而它是**先 clear() 再重建**的 —— 一个空分类会让
        // 整张目录表在中途炸掉、只留下一半。空标题同理，title 是下一层的 key。
        if (isBlank(id) || isBlank(title) || isBlank(date)
                || isBlank(content) || isBlank(category)){
            return result(false, "empty");
        }

        while(!articleLock.writeLock().tryLock()){}
        try {
            Article existing;
            try {
                existing = articleRepository.findById(id).orElse(null);
            } catch (RuntimeException e) {
                // 坏 id 走的是这条路，不是 orElse(null)：_id 在库里是 ObjectId，
                // QueryMapper 把 String 转 ObjectId 时遇到不合法的十六进制直接抛
                // （同 reportArticleView 里那段 catch）。不兜的话 {"id":"abc"} 回 500。
                existing = null;
            }
            if (existing == null){
                return result(false, "not_found");
            }

            // 同名检查**只在标题或分类真的变了的时候做**。
            // 无条件查会把历史重复数据锁死：上传的同名检查读的是锁外那份过期
            // 缓存（见 uploadArticle 第一行），并发上传能绕过它，库里可能已经有
            // 同分类同名的两篇 —— 那样这两篇会连正文都改不了，一改就撞"同名"。
            boolean renamed = !title.equals(existing.getTitle())
                           || !category.equals(existing.getCategory());
            if (renamed && isTakenByOther(category, title, id)){
                return result(false, "duplicate");
            }

            UpdateResult updated = mongoTemplate.updateFirst(
                    Query.query(Criteria.where("_id").is(id)),
                    new Update().set("title", title)
                                .set("date", date)
                                .set("content", content)
                                .set("category", category),
                    Article.class);
            // 判 matchedCount，**不要**用 modifiedCount：值没变时它是 0
            // （打开编辑页一个字不改直接点保存就会撞上），会被误判成文章不存在。
            if (updated.getMatchedCount() == 0){
                return result(false, "not_found");
            }
            return result(true, null);
        }finally {
            articleLock.writeLock().unlock();
            // 解锁**之后**再调：hourlyUpdate 自己还要拿同一把写锁（它内部是
            // lock() 而不是 tryLock()，持着锁调就是死锁）。
            articleService.hourlyUpdate();
        }
    }

    /** 这个 (分类, 标题) 是不是已经被**别的**文章占了。 */
    private boolean isTakenByOther(String category, String title, String id){
        List<Article> sameName = articleRepository.findByCategoryAndTitle(category, title);
        for (Article other : sameName){
            if (!id.equals(other.get_id())){
                return true;
            }
        }
        return false;
    }

    private static boolean isBlank(String value){
        return value == null || value.isBlank();
    }

    /**
     * 响应形态：{@code {"updated": <改成了没>, "reason": <没改成的原因>}}。
     *
     * 给 reason 而不是像 upload 那样只回一个 {@code {"uploaded":false}} ——
     * 那个把"没权限"和"重名"混成一句，前端只能显示
     * "Unauthorized upload or duplicate article"。重名是**可操作**的
     * （换个标题就行），得让用户知道是哪一种；not_found 和 empty 同理。
     * 成功时不带 reason 键。
     */
    private static Map<String, Object> result(boolean updated, String reason){
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("updated", updated);
        if (reason != null){
            response.put("reason", reason);
        }
        return response;
    }
}
