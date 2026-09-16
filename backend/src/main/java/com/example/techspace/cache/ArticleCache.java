package com.example.techspace.cache;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
public class ArticleCache {

    @Bean(name = "articleMap")
    public ConcurrentHashMap articleMapInit(){
        ConcurrentHashMap<String, ConcurrentHashMap<String, ConcurrentHashMap<String,String>>> articleMap =
                new ConcurrentHashMap<>();
        return articleMap;
    }

}
