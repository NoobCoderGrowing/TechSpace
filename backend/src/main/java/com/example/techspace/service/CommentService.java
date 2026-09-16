package com.example.techspace.service;

import com.example.techspace.ArticleRepository;
import com.example.techspace.CommentRepository;
import com.example.techspace.entity.Comment;
import com.example.techspace.entity.CommentView;
import com.example.techspace.entity.Commenter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * 评论的读写。
 *
 * 写路径上有三道闸，顺序是有意的：
 *   1. 参数校验（空、超长、文章/父评论是否存在）—— 便宜，先做
 *   2. 限流 —— 中等代价，而且被拒的请求不该占用配额，所以放在校验之后
 *   3. Markdown 渲染 + 消毒 —— 最贵，最后做
 *
 * 读路径上有两条硬规则：
 *   1. **返回 CommentView，绝不返回 Comment** —— 原始 Markdown 和作者的数字
 *      id 留在库里，不出响应
 *   2. **已删除的评论一律不返回** —— 页面上一律看不到它。被删的是顶层时，
 *      它底下的回复也一起不返回（详见 listByArticle）
 */
@Service
public class CommentService {

    /** 单条评论 Markdown 的长度上限。 */
    static final int MAX_LENGTH = 10_000;

    /**
     * 一次最多加载多少条顶层评论。超出的部分不返回（并置 truncated 标记）。
     * 个人博客量级下够用，真要撑爆了再谈游标分页 —— 现在上分页只会
     * 把"排序键是最后活跃时间"这件事搞得很难看。
     */
    static final int ROOT_LIMIT = 50;

    /** 限流：一分钟 5 条、一小时 40 条。 */
    private static final int POSTS_PER_MINUTE = 5;
    private static final int POSTS_PER_HOUR = 40;
    private static final long MINUTE_MS = 60_000L;
    private static final long HOUR_MS = 3_600_000L;

    private final CommentRepository commentRepository;
    private final ArticleRepository articleRepository;
    private final MarkdownRenderer markdownRenderer;

    /**
     * 按作者 id 记的发帖时间戳（毫秒），滑动窗口用。
     *
     * 用进程内 Map 而不是 Redis：本站单实例部署，这样不引依赖也不加一次网络往返。
     * 代价是重启后配额清零、将来多实例部署时限流会失效 —— 那时换成 Redis 即可，
     * 接口不变。这只是防刷，不是安全边界。
     */
    private final Map<String, Deque<Long>> recentPosts = new ConcurrentHashMap<>();

    public CommentService(CommentRepository commentRepository,
                          ArticleRepository articleRepository,
                          MarkdownRenderer markdownRenderer) {
        this.commentRepository = commentRepository;
        this.articleRepository = articleRepository;
        this.markdownRenderer = markdownRenderer;
    }

    /**
     * 读一页评论：顶层按最后活跃时间倒序，每条顶层后面紧跟它全部的回复（按时间正序）。
     *
     * 已删除的一条都不出现在结果里。被删的是回复时只少那一条，兄弟回复照常；
     * 被删的是顶层时**整条线程都不返回** —— 回复的 rootId 指向的是一个读接口
     * 永远不会给出的父节点，留着它只会在页面上变成一串没有来处的孤儿。
     */

    public CommentPage listByArticle(String articleId, Commenter me) {
        if (!StringUtils.hasText(articleId)) {
            return new CommentPage(List.of(), false);
        }

        Page<Comment> rootPage = commentRepository.findByArticleIdAndRootIdIsNull(
                articleId,
                PageRequest.of(0, ROOT_LIMIT, Sort.by(Sort.Direction.DESC, "createdAt")));
        // 已删除的顶层连同它整条线程一起丢掉。
        // 过滤写在 Java 里而不是塞进查询条件：查询条件得依赖 deleted 字段一定
        // 被写进了文档（字段缺失时 $eq:false 匹配不到，那些评论会凭空消失），
        // 而数据本来就已经在内存里了，这里过滤是免费的。
        // 代价是被删掉的顶层会占掉 ROOT_LIMIT 的一个名额 —— 50 条的量级下可以接受。
        List<Comment> roots = rootPage.getContent().stream()
                .filter(root -> !root.isDeleted())
                .collect(Collectors.toCollection(ArrayList::new));
        if (roots.isEmpty()) {
            return new CommentPage(List.of(), rootPage.hasNext());
        }

        // 一次把这批顶层底下的回复全查出来，不要逐条顶层去查（N+1）。
        // 注意只查这批顶层底下的：顶层被截断时，回复也不能单独漏出来，
        // 否则页面上会出现一堆没有父节点的回复。
        // 已删除的回复同样滤掉：它不该占位置，也不该把线程顶到列表前面去
        // （lastActivity 用的是过滤之后的列表）。
        List<String> rootIds = roots.stream().map(Comment::get_id).toList();
        Map<String, List<Comment>> repliesByRoot = commentRepository
                .findByRootIdInOrderByCreatedAtAsc(rootIds).stream()
                .filter(reply -> !reply.isDeleted())
                .collect(Collectors.groupingBy(Comment::getRootId));

        // 顶层按最后活跃时间排：一条新回复能把老帖顶回列表前面。
        // 纯按创建时间倒序的话，新回复会沉在几十条老帖底下，等于没人看得到。
        roots.sort(Comparator.comparing((Comment root) -> lastActivity(root, repliesByRoot)).reversed());

        List<CommentView> out = new ArrayList<>();
        for (Comment root : roots) {
            out.add(view(root, me));
            // 两层显示：不管这条回复是回谁的，都平铺在同一个顶层底下，
            // 具体回谁由 replyTo 那个 "回复 @xxx" 前缀表达。
            for (Comment reply : repliesByRoot.getOrDefault(root.get_id(), List.of())) {
                out.add(view(reply, me));
            }
        }
        return new CommentPage(out, rootPage.hasNext());
    }

    public Comment create(String articleId, String parentId, String content, Commenter who) {
        if (!StringUtils.hasText(articleId)) {
            throw new IllegalArgumentException("缺少文章 id");
        }
        if (!StringUtils.hasText(content)) {
            throw new IllegalArgumentException("评论不能为空");
        }
        String trimmed = content.strip();
        if (trimmed.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("评论太长了，上限 " + MAX_LENGTH + " 字");
        }
        if (!articleRepository.existsById(articleId)) {
            throw new IllegalArgumentException("文章不存在");
        }

        Comment parent = null;
        if (StringUtils.hasText(parentId)) {
            parent = commentRepository.findById(parentId)
                    .orElseThrow(() -> new IllegalArgumentException("要回复的评论不存在"));
            if (parent.isDeleted()) {
                throw new IllegalArgumentException("这条评论已被删除，无法回复");
            }
            // 光看 parentId 存在还不够：不带这一条，就能把 A 文章的评论挂到 B 文章的线程上
            if (!articleId.equals(parent.getArticleId())) {
                throw new IllegalArgumentException("评论和文章对不上");
            }
        }

        checkRate(who.id());

        Comment comment = new Comment();
        comment.setArticleId(articleId);
        comment.setContent(trimmed);
        comment.setHtml(markdownRenderer.render(trimmed));
        comment.setAuthorId(who.id());
        comment.setAuthorLogin(who.login());
        comment.setAuthorAvatar(who.avatar());
        comment.setByOwner(who.owner());
        comment.setCreatedAt(Instant.now().toString());
        if (parent != null) {
            comment.setParentId(parent.get_id());
            comment.setParentAuthorLogin(parent.getAuthorLogin());
            // 存储不限层级：回复的回复也直接挂到最初那条顶层评论底下。
            // parent 自己就是顶层时它的 rootId 是 null，取它自己的 id。
            comment.setRootId(parent.getRootId() != null ? parent.getRootId() : parent.get_id());
        }
        return commentRepository.save(comment);
    }

    /**
     * 本人或站主可删。
     *
     * 不真删，只打标记并清空正文和渲染结果 —— 正规文本真删掉才是对的。
     * 但读接口会把带标记的一律滤掉（连同被删顶层底下的回复），所以对读者来说
     * 它已经彻底消失了，库里留这一行只是为了保住 parentId / rootId 的指向，
     * 以及留一个反悔的余地。
     */
    public void delete(String id, Commenter who) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("评论不存在"));
        if (comment.isDeleted()) {
            return;
        }
        boolean mine = who.id().equals(comment.getAuthorId());
        if (!mine && !who.owner()) {
            throw new IllegalArgumentException("只能删自己的评论");
        }
        comment.setDeleted(true);
        // 正文和渲染结果都清掉 —— 软删除也要真的删掉内容，不能只是前端不显示
        comment.setContent("");
        comment.setHtml("");
        commentRepository.save(comment);
    }

    private void checkRate(String authorId) {
        long now = System.currentTimeMillis();
        Deque<Long> stamps = recentPosts.computeIfAbsent(authorId, k -> new ArrayDeque<>());
        synchronized (stamps) {
            // 队列按时间有序，从头上把一小时前的剔掉
            while (!stamps.isEmpty() && now - stamps.peekFirst() > HOUR_MS) {
                stamps.pollFirst();
            }
            long lastMinute = stamps.stream().filter(t -> now - t <= MINUTE_MS).count();
            if (lastMinute >= POSTS_PER_MINUTE) {
                throw new IllegalArgumentException("发得有点快，休息一分钟再来");
            }
            if (stamps.size() >= POSTS_PER_HOUR) {
                throw new IllegalArgumentException("一小时内的评论有点多，晚点再来");
            }
            stamps.addLast(now);
        }
        pruneIfCrowded(now);
    }

    /** 访客量大时避免这个 Map 无限长。阈值取得比正常活跃作者数高得多，正常情况不会触发。 */
    private void pruneIfCrowded(long now) {
        if (recentPosts.size() < 5_000) {
            return;
        }
        recentPosts.entrySet().removeIf(entry -> {
            Deque<Long> stamps = entry.getValue();
            synchronized (stamps) {
                Long last = stamps.peekLast();
                return last == null || now - last > HOUR_MS;
            }
        });
    }

    private static String lastActivity(Comment root, Map<String, List<Comment>> repliesByRoot) {
        List<Comment> replies = repliesByRoot.get(root.get_id());
        if (replies == null || replies.isEmpty()) {
            return root.getCreatedAt();
        }
        // 已按 createdAt 正序查出来，最后一条就是最新的
        return replies.get(replies.size() - 1).getCreatedAt();
    }

    /** 调用方保证不会传已删除的评论进来（listByArticle 已经滤掉了）。 */
    private static CommentView view(Comment comment, Commenter me) {
        boolean mine = me != null && me.id().equals(comment.getAuthorId());
        return new CommentView(
                comment.get_id(),
                comment.getRootId(),
                comment.getParentAuthorLogin(),
                comment.getAuthorLogin(),
                comment.getAuthorAvatar(),
                comment.isByOwner(),
                mine,
                comment.getHtml(),
                comment.getCreatedAt());
    }

    /**
     * @param comments  按显示顺序排好的扁平列表：顶层评论后面紧跟它全部的回复。
     *                  **已删除的一条都不在里面**
     * @param truncated 顶层评论是否被 ROOT_LIMIT 截断过
     */
    public record CommentPage(List<CommentView> comments, boolean truncated) {
    }
}
