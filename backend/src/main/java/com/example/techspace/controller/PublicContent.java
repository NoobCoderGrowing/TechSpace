package com.example.techspace.controller;


import com.example.techspace.ArticleRepository;
import com.example.techspace.entity.Article;
import com.example.techspace.entity.ArticleSummary;
import com.mongodb.client.result.UpdateResult;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.web.bind.annotation.*;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReadWriteLock;


@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/public")
@EnableMethodSecurity
public class PublicContent {

    /**
     * 会话里记「这个人已经看过哪些文章」的属性名前缀 —— 每篇文章一个键
     * （{@code viewed_article:<id>}），值是不参与判断的 {@link Boolean#TRUE}。
     *
     * 记在会话而不是靠前端 localStorage：localStorage 是用户随手能清的，
     * 而且换设备就认不出来是同一个人。会话是服务端说了算。
     *
     * **为什么按篇一个键，而不是往一个 Set 里塞 id** —— 并发会丢更新：
     * 同一会话同时打开两篇不同文章时，两个请求各自从 Redis 反序列化出同一份
     * 集合、各自 add、各自把**整份**集合写回去，后写的覆盖先写的。
     * 被覆盖掉的那个 id 之后会被重复计数。per-article 键各写各的 hash 字段，
     * 不存在覆盖；顺带也不需要类型校验了（判 null 就够，不用 instanceof 兜脏数据）。
     */
    private static final String VIEWED_ATTR_PREFIX = "viewed_article:";

    @Resource
    ArticleRepository articleRepository;

    @Resource
    MongoTemplate mongoTemplate;

    @Autowired
    @Qualifier("articleMap")
    ConcurrentHashMap articleMap;

    @Autowired
    @Qualifier("articleLock")
    ReadWriteLock articleLock;

    @RequestMapping(value = "/retrieve/articleMap", method = RequestMethod.GET)
    @ResponseBody
    public ConcurrentHashMap retrieveArticleMap(){
        while(!articleLock.readLock().tryLock()){}
        try {
            return articleMap;
        }finally {
            articleLock.readLock().unlock();
        }
    }

    @RequestMapping(value = "/retrieve/articleByID", method = RequestMethod.POST)
    @ResponseBody
    public Article retrieveArticleByID(@RequestBody Map<String,String> request){
        articleLock.readLock().lock();
        try{
            String id = request.get("id");
            Article article = articleRepository.findById(id).get();
            return article;
        }finally {
            articleLock.readLock().unlock();
        }
    }

    /**
     * 首页「Top 5 Hits」的列表。
     *
     * 走 {@link ArticleSummary}，不回整篇 content —— 首页只要 5 条元数据，
     * 而 content 是整篇富文本 HTML，带上就是纯白流量（还是 5 篇一起）。
     *
     * 这里**不持 articleLock**，和上面两个方法不同：那两个要么直接返回
     * articleMap，要么和上传路径抢同一份内存状态，而这个查询直连 Mongo、
     * 完全不碰那个缓存，拿读锁只是多一层没有保护对象的串行化。
     */
    @RequestMapping(value = "/retrieve/topArticles", method = RequestMethod.GET)
    @ResponseBody
    public List<ArticleSummary> retrieveTopArticles(){
        return articleRepository.findTop5ByOrderByHitsDescDateDesc().stream()
                .map(a -> new ArticleSummary(a.get_id(), a.getTitle(), a.getDate(),
                                             a.getCategory(), a.getHits()))
                .toList();
    }

    /**
     * 上报一次浏览。同一会话内同一篇文章只算一次。
     *
     * 用 POST 而不是 GET：站点现有的 incHomeLikes 是 GET，那种会改状态的 GET
     * 任何 `<img src>` 都能触发。新接口不重复这个错误。
     *
     * ⚠ 这个去重是 **UX 语义，不是反滥用控制**。接口无认证、csrf 也是关的，
     * 脚本每次不带 cookie jar 请求都会新建会话、每次都被计数。
     * 同类问题在站内是既有的且更弱：`GET /comment/home/incHomeLikes` 一个
     * `<img>` 标签就能刷，连 method 都不用换。爬虫抓文章页同样会推高计数。
     * 个人博客不值得为这个加 bot 过滤，但别把它当安全边界用。
     */
    @RequestMapping(value = "/report/articleView", method = RequestMethod.POST)
    @ResponseBody
    public Map<String, Object> reportArticleView(@RequestBody Map<String,String> request,
                                                 HttpServletRequest httpRequest){
        String id = request.get("id");
        if (id == null || id.isBlank()) {
            return result(false, false);
        }

        // getSession(true)：会话是去重的载体，第一次浏览必须把它建起来，
        // 否则下一次请求还是认不出这个人。
        // 这里会绕过 Spring Security 的过滤器链（/public/** 在 web.ignoring 里），
        // 但不影响 Spring Session —— SessionRepositoryFilter 是它自己注册的独立
        // filter，匿名访客照样能拿到会话，Set-Cookie 也照常下发。
        //
        // 去重窗口是**会话的空闲超时**（30m，见 server.servlet.session.timeout），
        // 不是"关掉浏览器为止"：读了 40 分钟再回来看同一篇会算第二次。
        HttpSession session = httpRequest.getSession(true);
        String viewedKey = VIEWED_ATTR_PREFIX + id;

        // 先查会话再打 Mongo：刷新页面时这一步就能短路掉。
        if (session.getAttribute(viewedKey) != null) {
            return result(true, false);
        }

        boolean counted;
        try {
            // 原子自增。不用「读出来 +1 再 save」：那是读-改-写，并发下两个请求
            // 会读到同一个旧值，各写回一次，丢一次计数。
            // $inc 对**缺 hits 字段**的老文档同样有效（字段不存在就按 0 建），
            // 所以老文章不需要任何数据迁移。
            UpdateResult updated = mongoTemplate.updateFirst(
                    Query.query(Criteria.where("_id").is(id)),
                    new Update().inc("hits", 1),
                    Article.class);
            // matchedCount 用来说明文章是否真的存在。不存在的 id **不记进会话**，
            // 否则任何人都能拿一串随机 id 把会话撑大。
            counted = updated.getMatchedCount() > 0;
        } catch (RuntimeException e) {
            // 坏 id 走的是这条路，不是 matchedCount == 0：_id 在库里是 ObjectId，
            // QueryMapper 把 String 转 ObjectId 时遇到不合法的十六进制会直接抛，
            // 而不是安静地匹配不到。不兜的话 {"id":"abc"} 回 500 ——
            // 而契约是回 counted:false，前端那边会变成一个未捕获的 rejection。
            counted = false;
        }

        if (counted) {
            // ★ 必须走 setAttribute，不能只改一个取出来的对象。
            // 会话存在 Redis，Spring Session 的 RedisSession.save() 只写 delta，
            // 而 delta 只由 setAttribute / removeAttribute 填充
            // （默认 saveMode = ON_SET_ATTRIBUTE，getAttribute 不进 delta）。
            // 少了这一行，这次的记录会被**静默丢弃**：不报错、不回滚，
            // 下次请求读到的还是没有 —— 表现是"去重完全没生效，每次刷新都 +1"，
            // 从这个现象几乎不可能反推回原因。
            session.setAttribute(viewedKey, Boolean.TRUE);
        }
        return result(true, counted);
    }

    /**
     * 统一的响应形态：{@code {"ok": <处理没出错>, "counted": <这次真的 +1 了没>}}。
     *
     * 两者分开是因为重复访问和坏 id 都**不算失败**（都不该让前端进错误分支），
     * 但调用方需要能区分它们 —— 排查去重问题时看的就是 counted。
     */
    private static Map<String, Object> result(boolean ok, boolean counted){
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("ok", ok);
        response.put("counted", counted);
        return response;
    }
}
