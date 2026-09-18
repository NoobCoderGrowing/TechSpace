package com.example.techspace.entity;

/**
 * 文章在列表里的对外形态。和 {@link CommentView} 同一个理由：不把实体直接扔出去。
 *
 * 这里图的是**不把 content 带出去**。首页只要 5 条元数据，而 content 是整篇正文
 * （富文本 HTML，几十上百 KB）—— 带上就是纯白流量，而且是 5 篇一起。
 *
 * 注意分量名是 {@code id}，Jackson 序列化出去是 {@code "id"}；
 * 而已有接口返回的是原始 {@link Article}，前端那边读的是 {@code "_id"}。
 * 两种形状会并存，前端新接口按 id 读，别混。
 *
 * @param id       文章 id
 * @param title    标题
 * @param date     ISO-8601 日期字符串
 * @param category 分类
 * @param hits     浏览量；老文档没有这个字段，映射出来是 0
 */
public record ArticleSummary(String id, String title, String date, String category, int hits) {
}
