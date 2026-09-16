import { InputRule } from '@tiptap/core'
import { InlineMath, BlockMath } from '@tiptap/extension-mathematics'

/**
 * 把 TipTap 官方的公式分隔符换成通用的那套。
 *
 * 官方用的是 $$行内$$ / $$$块级$$$，跟 Markdown、MathJax、Typora、remark-math
 * 的习惯正好错开一位，写起来老是要数美元符。这里改成：
 *
 *   $x^2$        行内
 *   $$x^2$$      块级（必须独占一行）
 *
 * 只重写 addInputRules，其余全部继承 —— 序列化、NodeView、insert/update/delete
 * 命令都不动。序列化本来就只吐 `data-latex`，KaTeX 渲染只发生在 NodeView 里，
 * 而 NodeView 不参与序列化，所以存进库的永远只有 LaTeX 源码。
 */

// 行内：$x^2$
export const InlineMathDollar = InlineMath.extend({
  addInputRules() {
    return [
      new InputRule({
        // (?<!\$) 和 (?!\$) 这两个环视是必需的，不是保险。
        // 没有它们，$$x^2$$ 会被这条规则从中间咬掉一口，块级规则永远等不到机会：
        // 匹配引擎会从第二个 $ 起找到 "x^2" 再配到第三个 $，把块级语法吃成一个行内公式。
        //
        // (?!\d+\$) / (?!\d) 是抄官方 migrateMathStrings 的货币保护，
        // 让 $100$ 这种不变成公式。
        find: /(?<!\$)\$(?!\d+\$)([^$\n]+?)\$(?!\d)/,
        handler: ({ state, range, match }) => {
          const latex = match[1]
          const { tr } = state
          tr.replaceWith(range.from, range.to, this.type.create({ latex }))
        },
      }),
    ]
  },
})

// 块级：$$x^2$$ 独占一行
export const BlockMathDollar = BlockMath.extend({
  addInputRules() {
    return [
      new InputRule({
        // ^...$ 锚定是关键：只有整段文字恰好是 $$...$$ 时才升级成块级节点。
        find: /^\$\$([^$]+)\$\$$/,
        handler: ({ state, range, match }) => {
          const latex = match[1]
          const { tr } = state
          tr.replaceWith(range.from, range.to, this.type.create({ latex }))
        },
      }),
    ]
  },
})

/**
 * 注册顺序有语义：ProseMirror 按扩展顺序依次试输入规则，
 * BlockMath 必须排在 InlineMath 前面，否则块级语法会被行内规则先截胡。
 * 官方 Mathematics 包装扩展的 addExtensions 也是这个顺序，保持一致。
 */
export const mathExtensions = [BlockMathDollar, InlineMathDollar]
