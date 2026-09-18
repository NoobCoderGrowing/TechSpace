package com.example.techspace.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class LikesService {

    private static final String LIKES_COUNT_KEY = "likesCount";

    @Autowired
    RedisTemplate<Object, Object> redisTemplate;


    /**
     * 读当前计数。**键不存在时是 0，不是异常。**
     *
     * 原来两个方法都直接写 `(int) redisTemplate.opsForValue().get(LIKES_COUNT_KEY)`。
     * 键不存在时 get 返回 null，`(int) null` 拆箱抛 NullPointerException → 接口 500。
     * 而"键不存在"其实是**正常状态**：redis 容器没挂卷（docker-compose 里 mongo 挂了
     * mongo-data，redis 什么都没有），每次重启数据就全没了，于是重启之后第一次读必炸。
     * 前端那边又把 500 的响应体当成功结果读，`result['likesCount']` 得到 undefined、
     * 覆盖掉 reducer 里默认的 0 —— 表现是"计数器不显示数字"，跟真实原因隔了好几层。
     *
     * 值本身是 JDK 序列化的 Integer：RedisConfig 里那个 RedisTemplate 没有设序列化器，
     * 走的是默认的 JdkSerializationRedisSerializer（afterPropertiesSet 里设的），
     * 所以转 Integer 是安全的。
     */
    private int readLikesCount(){
        Integer likesCount = (Integer) redisTemplate.opsForValue().get(LIKES_COUNT_KEY);
        return likesCount == null ? 0 : likesCount;
    }

    public int getHomeLikes(){
        return readLikesCount();
    }

    public synchronized int incHomeLikes(){
        int likesCount = readLikesCount() + 1;
        redisTemplate.opsForValue().set(LIKES_COUNT_KEY, likesCount);
        return likesCount;
    }

    public int setHomeLikes(int likesCount){
        redisTemplate.opsForValue().set(LIKES_COUNT_KEY, likesCount);
        return likesCount;
    }

}
