package com.example.techspace.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;

/**
 * 评论正文渲染 + 消毒的回归测试。
 *
 * 这一层是有 GitHub 账号的任何人 → 本站后台之间**唯一**的屏障，所以它的行为
 * 不能靠"读文档觉得应该没问题"。这些用例全部是先写探针脚本把实际行为跑出来，
 * 再照着钉下来的 —— 换句话说，每一条都对应一个曾经被验证过的事实，
 * 而不是一个期望。
 *
 * 不启 Spring 上下文：MarkdownRenderer 是无参构造，依赖只有两个 jar。
 *
 * ⚠️ 写这里的断言时注意一件事，两种写法看着像其实完全不同：
 *      html.contains("onerror")   ← 错。用户输入的标签被转义成**可见文字**之后，
 *                                    输出里照样含有这几个字符，这条永远为真，
 *                                    测不出任何东西。
 *      html.contains("<img")      ← 对。只有真的生成了标签才会命中。
 *   判断"有没有被剥掉"必须盯着**活标签**，不能盯着子串。
 */
class MarkdownRendererTest {

    private final MarkdownRenderer renderer = new MarkdownRenderer();

    // ─────────────────────────── 安全边界 ───────────────────────────

    @Test
    void scriptTagIsEscapedNotExecuted() {
        String html = renderer.render("<script>fetch('/admin/delete/articleByID')</script>");
        // commonmark 默认会把裸 HTML 原样透传（探针实测），
        // 所以这条测的是 escapeHtml(true) 有没有生效
        assertFalse(html.contains("<script"), "script 标签必须被转义：" + html);
        assertTrue(html.contains("&lt;script&gt;"), "应当作为文本保留：" + html);
    }

    @Test
    void eventHandlerAttributesAreDropped() {
        String html = renderer.render("<img src=x onerror=alert(1)>");
        // 断言的是没有生成 <img> 元素。**不能**断言 !contains("onerror") ——
        // 整条标签被转义成可见文字后，输出里照样有这几个字符
        // （实测输出：<p>&lt;img src&#61;x onerror&#61;alert(1)&gt;</p>），
        // 那条断言恒为假，等于什么都没测。
        assertFalse(html.contains("<img"), "评论里不允许出现 img 元素：" + html);
        // 内容本身要留着，不能因为不安全就整段吞掉
        assertTrue(html.contains("&lt;img"), "应当作为文本保留：" + html);
    }

    @Test
    void dangerouslySchemedLinksAreDropped() {
        for (String scheme : new String[]{"javascript:alert(1)", "data:text/html;base64,PHNjcmlwdD4=", "vbscript:msgbox(1)"}) {
            String html = renderer.render("[点我](" + scheme + ")");
            assertFalse(html.contains("javascript:"), scheme + " 不该出现：" + html);
            assertFalse(html.contains("data:"), scheme + " 不该出现：" + html);
            assertFalse(html.contains("vbscript:"), scheme + " 不该出现：" + html);
        }
    }

    @Test
    void dangerouslySchemedImageUrlsAreDropped() {
        // 图片会被降级成链接，而链接的 href 同样要过协议白名单。
        // commonmark 自己在渲染 Link 时会先丢掉一次，消毒器再挡一次。
        String html = renderer.render("![x](javascript:alert(1))");
        assertFalse(html.contains("javascript:"), html);
        // 降级标记还在，说明这条没有整段消失
        assertTrue(html.contains("[图片]"), html);
    }

    @Test
    void disallowedBlockElementsAreStripped() {
        assertFalse(renderer.render("<iframe src='//evil'></iframe>").contains("<iframe"));
        assertFalse(renderer.render("<style>body{display:none}</style>").contains("<style"));
        assertFalse(renderer.render("<div style='position:fixed'>覆盖层</div>").contains("<div"));
    }

    @Test
    void tableAndHeadingElementsAreNotInTheWhitelist() {
        // 白名单里刻意没有 h1-h6 和 table
        assertFalse(renderer.render("| a | b |\n|---|---|\n| 1 | 2 |").contains("<table"));
    }

    @Test
    void codeBlockLanguageClassInjectionIsDropped() {
        // info string 里塞引号想把 class 提前闭合，commonmark 会把它编码掉，
        // 消毒器再按 language-* 的模式匹配剥一次，两层都过不去
        String html = renderer.render("```x\" class=\"evil\" onclick=\"a\nbody\n```");
        assertFalse(html.contains("evil"), html);
        assertFalse(html.contains("onclick"), html);
        assertTrue(html.contains("<pre>"), html);
    }

    @Test
    void overlongAttributeDoesNotHang() {
        // 超长未闭合标签是常见的拖死解析器的输入
        String html = assertTimeoutPreemptively(
                java.time.Duration.ofSeconds(5),
                () -> renderer.render("<" + "a".repeat(100_000) + ">"));

        // 超时是主断言。内容方面：这一整条会被 commonmark 当成普通段落文字，
        // 转义进一个 <p> 里 —— 所以这里**不是**空串。
        // （空串那个结果来自只跑消毒器的探针，整条流水线不会那样。）
        assertFalse(html.contains("<aaa"), "不能生成活标签：" + html.substring(0, 60));
        assertTrue(html.contains("&lt;a"), "应当作为文本保留");
    }

    // ─────────────────────── 降级（避免静默消失） ───────────────────────

    @Test
    void headingIsDowngradedToParagraphWithStrong() {
        String html = renderer.render("# 一级\n\n## 二级");
        // 关键点不是"标题没了"，而是**它有块级包裹**。直接让消毒器剥标签的话
        // 会留下两段没有 <p> 的裸文字，评论区的间距规则全都吃不到。
        assertTrue(html.contains("<p><strong>一级</strong></p>"), html);
        assertTrue(html.contains("<p><strong>二级</strong></p>"), html);
    }

    @Test
    void headingKeepsInlineFormatting() {
        String html = renderer.render("## 带 **粗体** 和 `代码` 的标题");
        assertTrue(html.contains("<strong>"), html);
        assertTrue(html.contains("<code>代码</code>"), html);
    }

    @Test
    void imageInsideHeadingIsAlsoDowngraded() {
        // 标题降级后要重入访问新子树，否则标题里的图片会绕过图片处理
        String html = renderer.render("## 看图 ![图](https://e.com/a.png)");
        assertTrue(html.contains("[图片]"), html);
        assertFalse(html.contains("<img"), html);
    }

    @Test
    void imageBecomesLinkWithVisibleMarker() {
        String html = renderer.render("![我的截图](https://example.com/a.png)");
        // 不保留 <img>（否则评论区就是追踪像素的投放位），
        // 但也不能无声消失，否则读者以为对方只贴了个链接
        assertTrue(html.contains("<a href=\"https://example.com/a.png\""), html);
        assertTrue(html.contains("我的截图"), html);
        assertTrue(html.contains("[图片]"), html);
        assertFalse(html.contains("<img"), html);
    }

    // ─────────────────────────── 正常内容 ───────────────────────────

    @Test
    void codeBlockKeepsLanguageClass() {
        String html = renderer.render("```java\nint x = 1;\n```");
        // 前端靠这个 class 做语法高亮，剥掉了代码块就变成一片黑白
        assertTrue(html.contains("class=\"language-java\""), html);
        assertTrue(html.contains("<pre><code"), html);
    }

    @Test
    void allWhitelistedElementsSurvive() {
        String html = renderer.render("""
                ## 补充

                正文 **粗** *斜* `代码` ~~删除~~

                > 引用

                - 一
                - 二

                1. 三

                ```java
                int x = 1;
                ```

                [链接](https://example.com)
                """);

        for (String tag : new String[]{"<p>", "<strong>", "<em>", "<code>", "<del>",
                "<blockquote>", "<ul>", "<li>", "<ol>", "<pre>"}) {
            assertTrue(html.contains(tag), "缺少 " + tag + "：" + html);
        }
        // 外链必须带 nofollow
        assertTrue(html.contains("rel=\"nofollow\""), html);
    }

    @Test
    void linkRelIsAlwaysAdded() {
        assertTrue(renderer.render("[x](https://example.com)").contains("rel=\"nofollow\""));
    }

    @Test
    void autolinkAndStrikethroughExtensionsAreActive() {
        // 裸 URL 自动变链接
        assertTrue(renderer.render("看 https://example.com/x 这里").contains("<a href=\"https://example.com/x\""));
        // ~~删除线~~
        assertTrue(renderer.render("~~删掉~~").contains("<del>"));
    }

    @Test
    void codeBlockContentIsEscaped() {
        String html = renderer.render("```\n<script>alert(1)</script>\n```");
        assertTrue(html.contains("&lt;script&gt;"), html);
        assertFalse(html.contains("<script"), html);
    }

    // ─────────────────────────── 边界输入 ───────────────────────────

    @Test
    void blankInputYieldsEmptyString() {
        assertEquals("", renderer.render(null));
        assertEquals("", renderer.render(""));
        assertEquals("", renderer.render("   \n  "));
    }
}
