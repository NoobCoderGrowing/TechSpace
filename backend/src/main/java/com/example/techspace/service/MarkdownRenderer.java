package com.example.techspace.service;

import org.commonmark.ext.autolink.AutolinkExtension;
import org.commonmark.ext.gfm.strikethrough.StrikethroughExtension;
import org.commonmark.node.AbstractVisitor;
import org.commonmark.node.Heading;
import org.commonmark.node.Image;
import org.commonmark.node.Link;
import org.commonmark.node.Node;
import org.commonmark.node.Paragraph;
import org.commonmark.node.StrongEmphasis;
import org.commonmark.node.Text;
import org.commonmark.parser.Parser;
import org.commonmark.renderer.html.HtmlRenderer;
import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.regex.Pattern;

/**
 * 评论正文：Markdown → HTML → 白名单消毒。
 *
 * 这是本站唯一一处"任意互联网用户都能喂内容进来"的入口，所以整条链是按
 * 最坏情况设计的：解析器负责排版，消毒器负责安全，两道都过才写出库。
 *
 * 每一步的行为都是先在 /tmp 的探针脚本里逐条跑出来确认过的，不是照文档写的。
 * 关键的三条：
 *   1. commonmark 默认会把内联/块级 HTML 原样透传，<script> 直接进输出。
 *      所以 escapeHtml(true) 不是可选项。
 *   2. 消毒器对白名单外的标签是"剥标签、留文字"，只有 script/style/iframe
 *      连同内容一起丢。所以标题不降级的话会变成没有块级包裹的裸文字，
 *      CSS 里所有 > p 的间距规则都吃不到它。
 *   3. 消毒器会剥掉 class，所以代码块的语言信息要在白名单里显式放行
 *      language-* 才能留给前端做语法高亮。
 *
 * Parser / HtmlRenderer / PolicyFactory 都是线程安全的不可变对象，可以单例复用。
 */
@Component
public class MarkdownRenderer {

    /** 代码块的语言标记。只放行 language-* 这一种形态，其余 class 一律剥掉。 */
    private static final Pattern LANGUAGE_CLASS = Pattern.compile("language-[A-Za-z0-9_+#-]+");

    private final Parser parser;
    private final HtmlRenderer renderer;
    private final PolicyFactory policy;

    public MarkdownRenderer() {
        List<org.commonmark.Extension> extensions =
                List.of(AutolinkExtension.create(), StrikethroughExtension.create());

        this.parser = Parser.builder().extensions(extensions).build();

        this.renderer = HtmlRenderer.builder()
                .extensions(extensions)
                // 不设这条，用户写什么标签就出什么标签
                .escapeHtml(true)
                .build();

        this.policy = new HtmlPolicyBuilder()
                // 只放行评论里真会用到的那几种块级/行内元素。
                // 刻意不含 h1-h6 —— 评论标题不该和文章标题抢层级（降级处理见 Downgrader）；
                // 刻意不含 img —— 否则评论区就成了追踪像素和 NSFW 广告的投放位；
                // 不含 table/details 等 —— 用得少，而每多一个标签就多一份要维护的样式。
                .allowElements("p", "br", "strong", "em", "del", "code", "pre",
                        "blockquote", "ul", "ol", "li")
                .allowElements("a")
                .allowUrlProtocols("http", "https", "mailto")
                .allowAttributes("href", "title").onElements("a")
                // 同时给外链补上 rel="nofollow"（配合 target="_blank" 还会补
                // noopener noreferrer，不过评论目前不设 target）
                .requireRelNofollowOnLinks()
                .allowAttributes("class").matching(LANGUAGE_CLASS).onElements("code")
                .toFactory();
    }

    /**
     * @param markdown 用户原始输入，可以是 null
     * @return 可以安全地塞进 dangerouslySetInnerHTML 的 HTML；输入为空时返回空串
     */
    public String render(String markdown) {
        if (!StringUtils.hasText(markdown)) {
            return "";
        }
        Node document = parser.parse(markdown);
        document.accept(new Downgrader());
        return policy.sanitize(renderer.render(document));
    }

    /**
     * 把白名单里没有的两个元素在**渲染前**改写成等价的允许元素。
     *
     * 为什么不在渲染后再改：那时已经是一串 HTML 文本了，正则替换必然会写错。
     * 改 AST 用的是 commonmark 公开的节点操作 API，行为确定，也不依赖渲染器优先级
     * —— 自定义 NodeRenderer 在 0.30.0 里 signature 变过（render 只收一个参数），
     * 而且能否盖过内置渲染器没有保证。
     */
    static class Downgrader extends AbstractVisitor {

        /** # 标题 → <p><strong>标题</strong></p>，保住块级包裹和内联格式。 */
        @Override
        public void visit(Heading heading) {
            Paragraph paragraph = new Paragraph();
            StrongEmphasis strong = new StrongEmphasis();
            moveChildren(heading, strong);
            paragraph.appendChild(strong);
            heading.insertBefore(paragraph);
            heading.unlink();
            // 搬完再走一遍新子树：标题里可能还嵌着图片，不重入的话 visit(Image) 就轮不到它
            paragraph.accept(this);
        }

        /**
         * ![alt](url) → <a href="url">alt</a> [图片]
         *
         * 不保留 <img>，但也不能让它无声消失 —— 末尾那个标记是必要的，
         * 否则读者会以为对方只贴了个链接。href 这里不做校验，
         * commonmark 渲染时会丢掉 javascript:/data: 这类危险协议，
         * 后面消毒器还有一道，两层都过不去才轮到浏览器。
         */
        @Override
        public void visit(Image image) {
            Link link = new Link(image.getDestination(), image.getTitle());
            moveChildren(image, link);
            image.insertBefore(link);
            image.insertAfter(new Text(" [图片]"));
            image.unlink();
        }

        private static void moveChildren(Node from, Node to) {
            Node child = from.getFirstChild();
            while (child != null) {
                Node next = child.getNext();
                child.unlink();
                to.appendChild(child);
                child = next;
            }
        }
    }
}
