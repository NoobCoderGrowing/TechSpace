package com.example.techspace.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class LikesService {

    @Autowired
    RedisTemplate<Object, Object> redisTemplate;


    public int getHomeLikes(){
        int likesCount = (int) redisTemplate.opsForValue().get("likesCount");
        return likesCount;
    }

    public synchronized int incHomeLikes(){
        int likesCount = (int) redisTemplate.opsForValue().get("likesCount");
        likesCount += 1;
        redisTemplate.opsForValue().set("likesCount", likesCount);
        return likesCount;
    }

    public int setHomeLikes(int likesCount){
        redisTemplate.opsForValue().set("likesCount", likesCount);
        return likesCount;
    }

}
