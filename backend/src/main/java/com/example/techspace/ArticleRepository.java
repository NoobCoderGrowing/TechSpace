package com.example.techspace;

import com.example.techspace.entity.Article;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ArticleRepository extends MongoRepository<Article, String> {
    public Article findByTitle(String title);

    /**
     * 编辑接口的同名检查用（ContentMangement.updateArticle）。
     *
     * 返回**列表**而不是单个 Article，因为标题在库层本来就没有唯一约束
     * （上传时的同名检查读的是内存里的 articleMap，而且是锁外的，并发上传能绕过它）
     * —— 库里可能存在同分类同名的多篇，单值查询遇到这种数据会抛
     * IncorrectResultSizeDataAccessException。
     *
     * 也**不要**为此加唯一索引：会让已有的重复数据直接报错，还会把上传接口
     * 那句 {"uploaded":false} 变成 500。几十篇的规模不值得。
     */
    public List<Article> findByCategoryAndTitle(String category, String title);

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
