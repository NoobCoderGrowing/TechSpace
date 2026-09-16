import { useMemo } from 'react'
import classes from './ArticleView.module.css'
import { Article } from './TypeDefinition'
import parse, { DOMNode } from 'html-react-parser'
import katex from 'katex'
import elon_zuk from '../assets/elon-musk-mark-zuckerberg.gif'
import { highlightCode } from '../lib/highlight'
// KaTeX 的样式跟着渲染端走。它原先 import 在 TextEditor.tsx 里（Quill 的
// formula 模块要用），编辑器那边现在只负责输入，样式归这里。
import 'katex/dist/katex.min.css'
// 删掉 Quill 之后，正文排版全部由这个文件提供（编辑器和阅读页共用）。
import './ArticleContent.css'

type props = {
  article: Article | undefined
}

/**
 * 鸭子类型的元素判定。
 *
 * 不用 `domNode instanceof Element`：Element 来自 domhandler，而
 * html-react-parser 和 html-dom-parser 各自依赖它，版本一旦不去重，
 * instanceof 会静默返回 false —— 表现就是公式和代码高亮全都不渲染，
 * 而且一个错都不报。判字段则跟包的实例无关。
 */
type AnyEl = {
  name: string
  attribs: Record<string, string>
  children: DOMNode[]
}

// 参数收 unknown 而不是 DOMNode：这个判定完全靠字段鸭子类型，
// 所以它对已经归一化过的 AnyEl 同样成立，没必要为了类型在两个辅助函数之间
// 来回断言。
function asEl(node: unknown): AnyEl | null {
  const n = node as Partial<AnyEl>
  if (!n || typeof n !== 'object') return null
  if (typeof n.name !== 'string' || typeof n.attribs !== 'object' || n.attribs === null) return null
  return { name: n.name, attribs: n.attribs, children: (n.children ?? []) as DOMNode[] }
}

/** 取元素的纯文本（递归），用于拿代码块的源码 */
function textOf(node: unknown): string {
  if ((node as { type?: string })?.type === 'text') {
    return (node as { data?: string }).data ?? ''
  }
  const el = asEl(node)
  return el ? el.children.map(textOf).join('') : ''
}

function renderMath(latex: string, displayMode: boolean) {
  // 空的 data-latex 直接吞掉，别在页面上留一个看不见的空元素
  if (!latex.trim()) return <></>

  let html: string
  try {
    html = katex.renderToString(latex, {
      displayMode,
      // 关键：坏公式渲染成红色的行内报错，而不是抛异常。
      // 不设的话，一篇旧文里一个手滑的 \frac{ 就能让整个文章页白屏。
      throwOnError: false,
    })
  } catch {
    // throwOnError: false 基本已经吃掉 ParseError，这里只兜非 ParseError 的意外
    return displayMode
      ? <div className="article-math-block article-math-error">{latex}</div>
      : <span className="article-math-inline article-math-error">{latex}</span>
  }

  return displayMode
    ? <div className="article-math-block" dangerouslySetInnerHTML={{ __html: html }} />
    : <span className="article-math-inline" dangerouslySetInnerHTML={{ __html: html }} />
}

/**
 * 正文渲染的接管逻辑。定义在组件外：它只依赖 domNode，不依赖任何 props/state，
 * 放在里面每次渲染都会新建一个函数引用，白白让下面的 useMemo 失效。
 */
function replaceNode(domNode: DOMNode) {
  const el = asEl(domNode)
  if (!el) return

  const dataType = el.attribs['data-type']

  // ── 公式 ──
  // 序列化出来的节点是空的：<span data-type="inline-math" data-latex="x^2"></span>
  // KaTeX 渲染只发生在编辑器的 NodeView 里，而 NodeView 不参与序列化 ——
  // 这正是库里存的永远是 LaTeX 源码、而不是 KaTeX 那一堆 span 的原因，
  // 也意味着不在这里补一次渲染，页面上就是一片空白。
  if (dataType === 'inline-math' && el.name === 'span') {
    return renderMath(el.attribs['data-latex'] ?? '', false)
  }
  if (dataType === 'block-math' && el.name === 'div') {
    return renderMath(el.attribs['data-latex'] ?? '', true)
  }

  // ── 代码块 ──
  // 编辑器里的高亮是 CodeBlockLowlight 用 ProseMirror Decoration 做的，
  // 而 Decoration 属于视图层，getHTML() 拿不到，所以库里只有裸代码：
  //   <pre><code class="language-js">const a = 1</code></pre>
  // 不在这里重新高亮，写的时候是彩色的、发出来就变黑白。
  if (el.name === 'pre') {
    const code = el.children.map(asEl).find((c) => c?.name === 'code')
    if (!code) return
    const lang = /language-([\w-]+)/.exec(code.attribs.class ?? '')?.[1]
    const source = textOf(code)
    return (
      <pre>
        <code
          // hljs 主题的基线色挂在 .hljs 上，而编辑器那边的 decoration 只给
          // token 加 class、不会给 code 加 .hljs，这里补上才能和编辑器一致。
          className={['hljs', code.attribs.class].filter(Boolean).join(' ')}
          dangerouslySetInnerHTML={{ __html: highlightCode(source, lang) }}
        />
      </pre>
    )
  }

  // ── 任务列表的复选框 ──
  // TaskItem 序列化出的是 <input type="checkbox" checked="checked">。
  // 原样交给 React 会报 "You provided a `checked` prop to a form field
  // without an `onChange` handler"。加 readOnly 消除警告 ——
  // 不要用 disabled，那会让勾选框变灰，阅读页上看着像不可用。
  if (el.name === 'input' && el.attribs.type === 'checkbox') {
    return <input type="checkbox" checked={'checked' in el.attribs} readOnly />
  }

  // 其余节点返回 undefined，交回 html-react-parser 的默认处理
  return
}

export default function ArticleView({ article }: props) {
  const content = article?.content

  // parse 会把整篇文档过一遍，里面还夹着 KaTeX 渲染和 highlight.js 高亮，
  // 都是重活。不 memo 的话父组件任何一次无关重渲染都会重跑全文。
  // 依赖只取 content 字符串：article 是 redux 来的，每次都是新引用。
  //
  // hooks 必须无条件调用，所以这一步放在下面那个 if 分支之前。
  const rendered = useMemo(
    () => (typeof content === 'string' && content ? parse(content, { replace: replaceNode }) : null),
    [content],
  )

  if (article !== null && article !== undefined) {
    return (
      // .container 是那层浅色底（顺带负责长文滚动），.card 才是白卡。
      // 卡片必须是个真元素而不是靠 .container 的 background + padding 拼出来 ——
      // 圆角、投影和顶部那条强调线都要求有一个独立盒子，挂在 .container 上
      // 会让圆角长在滚动容器的边上，投影也会被 overflow: auto 裁掉。
      <div className={classes.container}>
        <div className={classes.card}>
          <h1 className={classes.title}>{article.title}</h1>
          <h5 className={classes.date}>{article.date}</h5>
          <div className="article-content">{rendered}</div>
        </div>
      </div>
    )
  } else {
    return (
      <div className={classes.imageContainer}>
        <img className={classes.elonzuk} src={elon_zuk} alt="elon and zuk" />
      </div>
    )
  }
}
