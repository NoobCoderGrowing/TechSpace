package com.example.techspace;

import com.example.techspace.entity.Article;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ArticleRepository extends MongoRepository<Article, String> {
    public Article findByTitle(String title);

    /**
     * 首页「Top 5 Hits」：按浏览量降序，并列时按日期降序。
     *
     * {@code DateDesc} 这个次级排序键不是装饰。文章刚发布时 hits 要么是 0
     * 要么字段还不存在，会**全部并列**，没有第二排序键时顺序由 Mongo 的自然顺序
     * 决定 —— 同一批数据两次查询可能给出不同顺序，看起来像随机。
     * date 是 ISO-8601 定长字符串，字典序 == 时间序，直接按字符串比就是对的。
     *
     * 另外注意这里**不筛掉浏览量为 0 / 缺字段的文章**。这是有意的：排序按缺失字段
     * 是能排的（不像相等条件会漏掉没有该字段的文档 —— 项目在 CommentService 里
     * 为这个坑把过滤从查询条件挪进了 Java），所以一篇文章都没人看过时，
     * 列表是「按日期排的完整文章榜」，而不是一个空列表。
     */
    public List<Article> findTop5ByOrderByHitsDescDateDesc();
}
