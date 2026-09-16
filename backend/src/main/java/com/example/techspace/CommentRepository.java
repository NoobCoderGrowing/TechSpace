package com.example.techspace;

import com.example.techspace.entity.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;

public interface CommentRepository extends MongoRepository<Comment, String> {

    /**
     * 顶层评论（rootId 为 null，或字段不存在 —— Mongo 的 $eq:null 两者都匹配）。
     * 带 Pageable 是为了给"最多加载 N 条顶层"留一个可控的上界。
     */
    Page<Comment> findByArticleIdAndRootIdIsNull(String articleId, Pageable pageable);

    /**
     * 给定若干顶层评论底下的全部回复，不分层级，按时间正序。
     * 一次查完而不是逐条顶层去查，是为了不出现 N+1。
     */
    List<Comment> findByRootIdInOrderByCreatedAtAsc(Collection<String> rootIds);

    /** 删文章时连带清理。 */
    void deleteByArticleId(String articleId);
}
