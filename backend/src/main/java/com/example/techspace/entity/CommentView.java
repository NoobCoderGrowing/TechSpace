package com.example.techspace.entity;

/**
 * 评论的对外形态。刻意和 {@link Comment} 分开：
 * 库里有原始 Markdown 和作者的数字 id，这两样都不该出现在响应里
 * —— 前者是留档用的，读者只需要已经消毒好的 HTML；后者是隐私。
 *
 * 这里**没有** deleted 字段：软删除只存在于存储层，读接口一律不返回已删除的
 * 评论（见 CommentService.listByArticle），所以到了这一层它已经是个不存在的概念，
 * 把标记透出去只会让前端多一个永远不会为真的分支。
 *
 * @param id        评论 id
 * @param rootId    所属顶层评论 id；顶层评论自己是 null
 * @param replyTo   被回复者的显示名；顶层评论为 null
 * @param author    作者显示名
 * @param avatar    头像地址，可能为 null（站主走表单登录时没有）
 * @param byOwner   是否博主
 * @param mine      是否是当前请求者自己写的（前端据此显示删除按钮）
 * @param html      已消毒的正文 HTML
 * @param createdAt ISO-8601 UTC
 */
public record CommentView(
        String id,
        String rootId,
        String replyTo,
        String author,
        String avatar,
        boolean byOwner,
        boolean mine,
        String html,
        String createdAt
) {
}
