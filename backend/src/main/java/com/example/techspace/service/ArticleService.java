package com.example.techspace.service;

import com.example.techspace.entity.Article;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReadWriteLock;

import com.example.techspace.ArticleRepository;


@EnableScheduling
@Service
public class ArticleService {

    @Resource
    ArticleRepository articleRepository;

    @Autowired
    @Qualifier("articleMap")
    ConcurrentHashMap<String, ConcurrentHashMap<String, ConcurrentHashMap<String,String>>>  articleMap;

    @Autowired
    @Qualifier("articleLock")
    ReadWriteLock articleLock;

    @Scheduled(cron = "0 0 * * * ?")
    @PostConstruct
    @Async
    public void hourlyUpdate(){
        articleLock.writeLock().lock();
        try {
            articleMap.clear();
            List<Article> articles = articleRepository.findAll();
            for (Article article : articles) {
                ConcurrentHashMap<String, ConcurrentHashMap<String,String>> titleArticleMap;
                String title = article.getTitle();
                String id = article.get_id();
                String category = article.getCategory();
                String date = article.getDate();
                if(!articleMap.containsKey(category)){
                    titleArticleMap = new ConcurrentHashMap<>();
                    articleMap.put(category, titleArticleMap);
                }else{
                    titleArticleMap = articleMap.get(category);
                }
                ConcurrentHashMap<String,String> articlePropertiesMap = new ConcurrentHashMap<>();
                articlePropertiesMap.put("id", id);
                articlePropertiesMap.put("date", date);
                titleArticleMap.put(title,articlePropertiesMap);
            }
        }finally {
            articleLock.writeLock().unlock();
        }
    }
}
