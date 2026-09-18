package com.example.techspace.entity;

import lombok.Data;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.annotation.ReadOnlyProperty;

@Data
@Document(collection = "articles")
public class Article {
    String _id;
    String title;
    String date;
    String content;
    String category;

    /**
     * 浏览量。首页「Top 5 Hits」就是按它排的。
     *
     * 这个字段是后加的，库里已有的老文档都没有它。**读出来是 0**，等同于
     * 「还没人看过」—— 这正是用 primitive int 而不是 Long 的理由：包装类型
     * 缺字段时是 null，页面上会显示成空白，排序和求和还要到处判 null。
     * 之所以能这样指望，是因为 @Data **不生成全参构造**，MappingMongoConverter
     * 走的是隐含的无参构造，缺字段的属性就停在 Java 默认值上（0），
     * 不会被赋值成 null。换成 record 或者加了 @AllArgsConstructor 就没这个保证了。
     *
     * 写入只在 PublicContent.reportArticleView 里用 $inc 做，是原子的。
     *
     * {@link ReadOnlyProperty} 是防"将来"的：这个类**同时充当上传接口的请求体**
     * （ContentMangement.uploadArticle 拿 fastjson 把 body 反序列化成 Article 再
     * save()）。现在上传的 body 不带 _id，走的是 insert，碰不到已有文档的计数；
     * 但一旦以后加了"编辑已有文章"——save() 是按 _id 全量替换，而反序列化出来的
     * hits 永远是 0——**计数就会静默清零**。加上这个注解后 save() 不再写 hits，
     * 那条路就断了。
     *
     * 三个方向都确认过：写（save）不写它；读不受影响（读的判据是
     * isIdentifier/isConstructorArgument，和 isWritable 无关）；
     * $inc 走 MongoTemplate 不经过 converter，照常自增。
     */
    @ReadOnlyProperty
    int hits;
}
