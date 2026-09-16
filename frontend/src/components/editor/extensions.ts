import { StarterKit } from '@tiptap/starter-kit'
import { ListKit } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import { TextStyleKit } from '@tiptap/extension-text-style'
import { Image } from '@tiptap/extension-image'
import { TextAlign } from '@tiptap/extension-text-align'
import { Highlight } from '@tiptap/extension-highlight'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { Placeholder } from '@tiptap/extension-placeholder'
import { CharacterCount } from '@tiptap/extension-character-count'
import { Typography } from '@tiptap/extension-typography'
import { Youtube } from '@tiptap/extension-youtube'
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details'
import { createLowlight, common } from 'lowlight'

import { BlockMathDollar, InlineMathDollar } from './mathInputRules'

// lowlight 的语法集。用 common 这一档（约 35 种常用语言），
// 体积和覆盖率对博客够用；要全量换成 `all` 会让构建产物明显变大。
const lowlight = createLowlight(common)

export type MathClickPayload = {
  latex: string
  pos: number
  /** true = 块级公式 */
  block: boolean
}

type FactoryOptions = {
  /** 点击已有公式时回调。扩展自身只给这一个人机接口，弹框得由外面接。 */
  onMathClick?: (payload: MathClickPayload) => void
}

/**
 * 编辑器用到的全部扩展。
 *
 * 关于 v3 的 Kit：TableKit 已含 Table/TableRow/TableHeader/TableCell，
 * ListKit 已含 BulletList/OrderedList/ListItem/ListKeymap/TaskList/TaskItem，
 * TextStyleKit 已含 TextStyle/Color/BackgroundColor/FontFamily/FontSize/LineHeight。
 * 所以这些子扩展都不需要单独装包，装了反而会重名。
 *
 * 做成工厂而不是直接导出数组：数学扩展的 onClick 得闭包到组件里的 setState，
 * 模块级常量闭不到。useEditor 只在首次渲染用这个数组，所以内部 new 出来的
 * 扩展实例不会随渲染泄漏。
 */
export function createEditorExtensions({ onMathClick }: FactoryOptions = {}) {
  // 两个数学节点的点击处理是同一套逻辑，只是 block 标记不同。
  // 扩展点击时已经算好了 pos（内部走 view.posAtDOM），直接透传即可。
  // 参数用结构化类型而不是 prosemirror 的 Node，省得为它多引一个传递依赖。
  const handleMathClick =
    (block: boolean) => (node: { attrs: { latex?: string } }, pos: number) => {
      onMathClick?.({ latex: node.attrs.latex ?? '', pos, block })
    }

  return [
    StarterKit.configure({
      // StarterKit v3 自带这五个，会和下面的 ListKit / CodeBlockLowlight 重名。
      // TipTap 遇到重复扩展名会告警并可能行为不确定，必须显式关掉。
      bulletList: false,
      orderedList: false,
      listItem: false,
      listKeymap: false,
      codeBlock: false,

      // openOnClick 默认是 true —— 编辑时点链接会直接跳走，那就没法改它了。
      // autolink 保留：粘一个 URL 自动变成链接很方便。
      link: { openOnClick: false, autolink: true },
    }),

    // 换掉 StarterKit 的列表，多出任务列表（复选框）
    ListKit.configure({
      taskItem: { nested: true },
    }),

    // 代码块 + 真正的语法高亮（Quill 那边是没有的）
    CodeBlockLowlight.configure({ lowlight }),

    // 字体/字号/文字色/背景色/行高 五件套
    TextStyleKit,

    TableKit.configure({
      table: { resizable: true },
    }),

    // 图片只走 URL。allowBase64 关掉，从源头防止又把 base64 塞进 content 字段
    // —— Quill 时代的做法会让一篇长文轻松涨到几 MB，MongoDB 单文档上限才 16MB。
    //
    // resize：这是 3.31.3 自带的能力，走的是免费的 ResizableNodeView（在 @tiptap/core 里），
    // 不是 Pro 功能。原先以为换掉 quill-image-resize-module-react 就永久失去拖拽缩放，
    // 那个判断是错的 —— 一行配置就能拿回来。
    // 拖拽结束时会把 width/height 写进节点属性，这两个是**会序列化**的，
    // 所以正文 CSS 里的 `img{max-width:100%;height:auto}` 是必需项，否则窄屏溢出。
    //
    // 方位值注意是 kebab-case（'top-right'）。包里 JSDoc 的示例写的是 camelCase
    // 的 topRight，照抄那个不会报错，只是默默不生成手柄。
    Image.configure({
      allowBase64: false,
      inline: false,
      resize: {
        enabled: true,
        directions: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'left', 'right'],
        minWidth: 80,
        minHeight: 40,
        alwaysPreserveAspectRatio: true,
      },
    }),

    TextAlign.configure({ types: ['heading', 'paragraph'] }),

    // multicolor 关掉的话高亮只能是一个固定色，工具栏上那个色板就没意义了
    Highlight.configure({ multicolor: true }),

    Subscript,
    Superscript,

    Placeholder.configure({
      placeholder: 'Write something…  行内公式写 $x^2$，块级公式独占一行写 $$x^2$$',
    }),

    CharacterCount,

    // 智能标点：把 -- 变破折号、... 变省略号、直引号变弯引号等，写散文时很受用。
    //
    // 但它的字符替换规则会和 LaTeX 正面冲突，必须关掉其中四条。
    // 关键在于**执行顺序**：输入规则是按扩展注册顺序依次试的，Typography 排在
    // 数学扩展前面，所以每次按键都先过它一遍 —— 而这个时机公式节点根本还没成型
    // （那时用户只敲到 `$f'`，没有收尾的 $，行内公式规则匹配不上）。
    // 等公式规则终于轮到的时候，用户敲的字符已经被替换掉了。
    //
    //   closeSingleQuote / openSingleQuote —— `$f'(x)$` 的撇号是 LaTeX 的求导符号，
    //       被转成弯引号 ’ 之后 KaTeX 渲染不出来。求导写法在技术文里太常见了。
    //   superscriptTwo / superscriptThree —— 敲 `x^2`，那个 2 会当场变成 ²。
    //       虽然渲染出来差不多，但存进库的 LaTeX 已经不是用户写的东西了，
    //       而且 `x^4` 没事、`x^2` 有事，行为不一致本身就是坑。
    //   emDash —— `--` 在 LaTeX 里是有含义的（连接号），不该被吃掉。
    //
    // 选项类型是 `false | string`，传 false 是官方支持的关闭方式（源码里每条规则
    // 都写成 `if (this.options.xxx !== false)`），不是取巧。
    // 其余规则（省略号、箭头、©®™、±≠×、½¼¾）全部保留：它们要么不会出现在
    // LaTeX 里，要么出现的形态（\pm、\neq）根本匹配不上这些正则。
    Typography.configure({
      closeSingleQuote: false,
      openSingleQuote: false,
      superscriptTwo: false,
      superscriptThree: false,
      emDash: false,
    }),

    Youtube.configure({ nocookie: true }),

    // persist 默认是 false，此时 details 的 open 属性**不进 HTML** ——
    // 阅读页上所有折叠块都会是收起状态，作者在编辑器里展开的那个状态传不过去。
    // 打开它，展开状态才能序列化进 content。
    Details.configure({ persist: true }),
    DetailsContent,
    DetailsSummary,

    // 注册顺序有语义：ProseMirror 按扩展顺序依次试输入规则，
    // 块级必须排在行内前面，否则 $$x^2$$ 会被行内规则先截胡。
    // 这里没有复用 mathInputRules.ts 导出的 mathExtensions 数组，
    // 是因为两者都要额外 configure 一个 onClick，索性就地展开。
    BlockMathDollar.configure({ onClick: handleMathClick(true) }),
    InlineMathDollar.configure({ onClick: handleMathClick(false) }),
  ]
}
