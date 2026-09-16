import hljs from 'highlight.js/lib/core'
import { common } from 'lowlight'

/**
 * 阅读端的代码高亮。
 *
 * 为什么需要这个模块：编辑器里的高亮是 CodeBlockLowlight 用
 * `Decoration.inline(from, to, {class: 'hljs-keyword'})` 做的，而 Decoration 是
 * ProseMirror 的**视图层**概念 —— `editor.getHTML()` 只序列化 doc（state 层），
 * 拿不到 decoration。所以存进库的永远是裸代码：
 *
 *   <pre><code class="language-js">const a = 1</code></pre>
 *
 * 结果就是写的时候满屏彩色、发出来一片黑白。必须在渲染端重新做一次高亮。
 *
 * 语法集直接复用 lowlight 的 `common`（37 种语言），和编辑器那边
 * `createLowlight(common)` 是同一份 grammar —— 两边语言覆盖严格一致，
 * 不会出现"编辑器里能高亮、阅读页高亮不出来"的错位。
 * 换语言集时这两处必须同步改。
 */
for (const [name, grammar] of Object.entries(common)) {
  hljs.registerLanguage(name, grammar as Parameters<typeof hljs.registerLanguage>[1])
}

/**
 * 把源码高亮成带 `<span class="hljs-*">` 的 HTML 片段。
 *
 * 返回的是 HTML 字符串（要配 dangerouslySetInnerHTML 用），
 * 所以**转义是必须的** —— 代码里的 `<div>` 不转义会被当标签解析掉。
 * highlight.js 正常路径下自己会转义，但 catch 分支里没有，那条路径要手动补。
 */
export function highlightCode(source: string, lang?: string): string {
  try {
    // 指定了语言且确实注册过 → 按语言高亮。ignoreIllegals 让语法不完整
    // 的代码片段（比如只贴了半段 JSX）也能出高亮，而不是整块抛错。
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(source, { language: lang, ignoreIllegals: true }).value
    }
    // 没标语言（或标了不认识的语言）→ 自动识别。
    return hljs.highlightAuto(source).value
  } catch {
    // 高亮再怎么说也只是锦上添花，绝不能让一篇代码块里的怪字符把整页搞白屏。
    return source.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string)
  }
}
