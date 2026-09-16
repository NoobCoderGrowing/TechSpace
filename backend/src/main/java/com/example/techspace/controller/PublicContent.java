package com.example.techspace.controller;

import com.example.techspace.ArticleRepository;
import com.example.techspace.entity.Article;
import jakarta.annotation.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReadWriteLock;


@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/public")
@EnableMethodSecurity
public class PublicContent {

    @Resource
    ArticleRepository articleRepository;

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
}
