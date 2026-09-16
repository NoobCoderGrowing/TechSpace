package com.example.techspace.entity;

import lombok.Data;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * 一条评论。读的时候直接把 {@link #html} 吐给前端（已消毒），
 * {@link #content} 是原始 Markdown，只留档，不参与渲染。
 *
 * 线程结构是"存储不限层、显示两层"：
 *   rootId   —— 顶层评论为 null；任何层级的回复都指向它所属的那条顶层评论。
 *                所以一条回复的回复，存储上认得出父亲，显示上和一级回复平铺。
 *   parentId —— 直接父节点。只用来算 rootId，以及回答"这条在回谁"。
 * 两层显示不需要在存储上做任何裁剪，将来想改成三层只动渲染。
 *
 * 时间统一用 ISO-8601 UTC 字符串（和 {@link Article#getDate()} 的风格一致）。
 * 定长 + 'Z' 结尾，所以字典序 == 时间序，Mongo 直接按字符串排序就是对的。
 */
@Data
@Document(collection = "comments")
public class Comment {

    String _id;

    /** 所属文章 id（articles 集合的 _id）。写入前会校验文章存在。 */
    String articleId;

    /** 直接父评论 id；顶层为 null。 */
    String parentId;

    /** 所属顶层评论 id；顶层自己为 null。 */
    String rootId;

    /**
     * 被回复者的用户名，冗余存一份。
     * 存下来是为了显示"回复 @xxx"时不用回查父评论 —— 父评论可能已被作者删除，
     * 但线程关系还得读得出来。
     */
    String parentAuthorLogin;

    /** GitHub 数字 id（转成字符串）或 "admin:<用户名>"。用不可变的 id，不用可改的 login。 */
    String authorId;

    String authorLogin;

    /** 头像地址，由数字 id 拼出来；站主走表单登录时没有头像，为 null，前端退化成首字母圆牌。 */
    String authorAvatar;

    /** 写入时该会话是否持有 ROLE_ADMIN。存下来才能让"博主"标记跟着评论走。 */
    boolean byOwner;

    /** 原始 Markdown。 */
    String content;

    /** Markdown 渲染 + 白名单消毒后的 HTML，读接口直接返回这个。 */
    String html;

    String createdAt;

    /**
     * 软删除。置真之后读接口就再也不返回它了（连同它底下的回复），
     * 页面上等于彻底消失；库里留着这一行只是为了保住 parentId / rootId 的指向，
     * 以及留一个反悔的余地。{@link #content} 和 {@link #html} 会同时被清空 ——
     * 软删除也得真的删掉内容，不能只是不显示。
     */
    boolean deleted;
}
