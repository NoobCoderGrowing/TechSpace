package com.example.techspace.controller;


import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONObject;
import com.example.techspace.ArticleRepository;
import com.example.techspace.CommentRepository;
import com.example.techspace.entity.Article;
import com.example.techspace.service.ArticleService;
import jakarta.annotation.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
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
}
