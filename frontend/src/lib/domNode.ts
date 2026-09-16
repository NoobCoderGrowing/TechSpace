import { DOMNode } from 'html-react-parser'

/**
 * html-react-parser 传给 `replace` 回调的节点的读取工具。
 *
 * 抽到 lib 里是因为文章正文（ArticleView）和评论正文（CommentSection）
 * 都要用：两处都要在渲染时接管 <pre> 去做语法高亮，而判断节点的办法是同一套。
 */

/**
 * 鸭子类型的元素判定。
 *
 * 不用 `domNode instanceof Element`：Element 来自 domhandler，而
 * html-react-parser 和 html-dom-parser 各自依赖它，版本一旦不去重，
 * instanceof 会静默返回 false —— 表现就是公式和代码高亮全都不渲染，
 * 而且一个错都不报。判字段则跟包的实例无关。
 */
export type AnyEl = {
  name: string
  attribs: Record<string, string>
  children: DOMNode[]
}

// 参数收 unknown 而不是 DOMNode：这个判定完全靠字段鸭子类型，
// 所以它对已经归一化过的 AnyEl 同样成立，没必要为了类型在两个辅助函数之间
// 来回断言。
export function asEl(node: unknown): AnyEl | null {
  const n = node as Partial<AnyEl>
  if (!n || typeof n !== 'object') return null
  if (typeof n.name !== 'string' || typeof n.attribs !== 'object' || n.attribs === null) return null
  return { name: n.name, attribs: n.attribs, children: (n.children ?? []) as DOMNode[] }
}

/** 取元素的纯文本（递归），用于拿代码块的源码 */
export function textOf(node: unknown): string {
  if ((node as { type?: string })?.type === 'text') {
    return (node as { data?: string }).data ?? ''
  }
  const el = asEl(node)
  return el ? el.children.map(textOf).join('') : ''
}
