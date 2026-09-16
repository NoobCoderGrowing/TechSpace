package com.example.techspace.controller;

import com.example.techspace.entity.Commenter;
import com.example.techspace.service.CommentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 评论读写。
 *
 * 路径放在 /api/comment 而不是 /public —— 后者的 web.ignoring() 会绕开整条
 * 安全过滤器链，SecurityContextHolder 里永远是空的，那样就没法知道谁在发言。
 *
 * 不写 @CrossOrigin：跨域统一由 WebConfig 的全局 CorsFilter 处理。
 */
@RestController
@RequestMapping("/api/comment")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    /** 读评论不需要登录 —— 任何人都能看，包括搜索引擎。 */
    @GetMapping("/list")
    public Map<String, Object> list(@RequestParam(required = false) String articleId) {
        CommentService.CommentPage page = commentService.listByArticle(articleId, currentUser());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("comments", page.comments());
        // 顶层评论被上限截断过。如实告诉前端，让页面能说明"还有更多"，
        // 而不是让人以为评论区就这么多。
        body.put("truncated", page.truncated());
        return body;
    }

    /**
     * 发评论 / 回复。登录由 SecurityConfig 保证 —— 未登录根本进不到这里，
     * 所以 who 一定不为 null。
     */
    @PostMapping("/create")
    public Map<String, Object> create(@RequestBody CreateRequest request) {
        Commenter who = currentUser();
        commentService.create(request.articleId(), request.parentId(), request.content(), who);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("ok", true);
        return body;
    }

    @PostMapping("/delete")
    public Map<String, Object> delete(@RequestBody DeleteRequest request) {
        commentService.delete(request.id(), currentUser());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("ok", true);
        return body;
    }

    /**
     * 校验失败统一返回 400 + 人话。这些消息是直接给用户看的
     * （"发得有点快""评论太长了"），所以措辞在 service 里就定好了。
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> onBadRequest(IllegalArgumentException e) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("ok", false);
        body.put("message", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    private static Commenter currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return Commenter.of(auth);
    }

    public record CreateRequest(String articleId, String parentId, String content) {
    }

    public record DeleteRequest(String id) {
    }
}
