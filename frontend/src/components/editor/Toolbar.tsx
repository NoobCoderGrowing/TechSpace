import { useState } from 'react'
import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { Button, Divider, Dropdown, Select, Tooltip, ColorPicker } from 'antd'
import type { MenuProps } from 'antd'
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  CodeOutlined,
  ClearOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  CheckSquareOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  LinkOutlined,
  DisconnectOutlined,
  PictureOutlined,
  TableOutlined,
  YoutubeOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  MenuOutlined,
  UndoOutlined,
  RedoOutlined,
  FunctionOutlined,
  NodeCollapseOutlined,
  DeleteRowOutlined,
  DeleteColumnOutlined,
  InsertRowAboveOutlined,
  InsertRowLeftOutlined,
  MergeCellsOutlined,
  SelectOutlined,
  DownOutlined,
} from '@ant-design/icons'

import { LinkDialog } from './LinkDialog'
import { ImageDialog } from './ImageDialog'
import { YoutubeDialog } from './YoutubeDialog'
import { MathDialog } from './MathDialog'
import type { MathDialogMode } from './MathDialog'

/* ------------------------------------------------------------------ *
 * 常量表
 * ------------------------------------------------------------------ */

// 字号/行高/字体都是 TextStyleKit 提供的自由文本属性，没有默认候选。
// 这三张表就是工具栏上能选到的全部取值。
const FONT_FAMILIES = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Microsoft YaHei',
  'SimSun',
  'KaiTi',
]

const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px']

const LINE_HEIGHTS = ['1', '1.15', '1.5', '2', '2.5', '3']

const HEADING_OPTIONS = [
  { value: 0, label: '正文' },
  { value: 1, label: '标题 1' },
  { value: 2, label: '标题 2' },
  { value: 3, label: '标题 3' },
  { value: 4, label: '标题 4' },
  { value: 5, label: '标题 5' },
  { value: 6, label: '标题 6' },
]

/* ------------------------------------------------------------------ *
 * 单选按钮
 * ------------------------------------------------------------------ */

type ToolButtonProps = {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolButton({ onClick, active, disabled, title, children }: ToolButtonProps) {
  return (
    <Tooltip title={title} mouseEnterDelay={0.4}>
      <Button
        type={active ? 'primary' : 'text'}
        size="small"
        disabled={disabled}
        // 按下时阻止默认行为，焦点就不会从编辑器跑到按钮上。
        // 焦点一走，ProseMirror 的选区虽然还在 state 里，
        // 但用户看不出选中的是哪段文字，命令的落点会变得难以预期。
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className="tb-btn"
      >
        {children}
      </Button>
    </Tooltip>
  )
}

/* ------------------------------------------------------------------ *
 * 工具栏
 * ------------------------------------------------------------------ */

/** 由 TextEditor 从数学扩展的 onClick 里回传过来 */
export type MathRequest = {
  mode: MathDialogMode
  /** 编辑模式才有：要改的那个节点的位置 */
  pos?: number
  latex: string
}

type props = {
  editor: Editor
  mathRequest: MathRequest | null
  /** 外部来的 mathRequest 处理完了，通知 TextEditor 清掉 */
  onMathRequestHandled: () => void
}

export function Toolbar({ editor, mathRequest, onMathRequestHandled }: props) {
  /* 四个弹框的状态。'none' 之外的都是互斥的，一次只开一个。 */
  const [linkOpen, setLinkOpen] = useState(false)
  const [imageOpen, setImageOpen] = useState(false)
  const [youtubeOpen, setYoutubeOpen] = useState(false)
  const [localMath, setLocalMath] = useState<MathRequest | null>(null)

  // 工具栏按钮的激活态全靠这里。v3 的 useEditor（不带 immediatelyRender:false 时）
  // 默认不随 transaction 重渲染，所以订阅必须显式做，否则按钮永远是灭的。
  //
  // selector 必须返回**扁平**对象：useEditorState 默认用 fast-deep-equal 比较，
  // 嵌套对象不但比较成本高，还容易因为每帧新建引用而误判成"变了"。
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),

      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      code: e.isActive('code'),
      subscript: e.isActive('subscript'),
      superscript: e.isActive('superscript'),
      highlight: e.isActive('highlight'),

      blockquote: e.isActive('blockquote'),
      codeBlock: e.isActive('codeBlock'),
      details: e.isActive('details'),
      bulletList: e.isActive('bulletList'),
      orderedList: e.isActive('orderedList'),
      taskList: e.isActive('taskList'),
      inTable: e.isActive('table'),
      link: e.isActive('link'),

      // 段落/H1–H6 归一成一个数字，0 表示正文
      heading:
        ([1, 2, 3, 4, 5, 6] as const).find((l) => e.isActive('heading', { level: l })) ?? 0,

      // textAlign 设在 heading 或 paragraph 上，用属性匹配一次问清楚，
      // 省得先判断在哪个节点里再取属性。
      align: e.isActive({ textAlign: 'center' })
        ? 'center'
        : e.isActive({ textAlign: 'right' })
          ? 'right'
          : e.isActive({ textAlign: 'justify' })
            ? 'justify'
            : 'left',

      // 这几个读的是 textStyle mark 上的属性，没设过时是 undefined
      fontFamily: (e.getAttributes('textStyle').fontFamily as string) || '',
      fontSize: (e.getAttributes('textStyle').fontSize as string) || '',
      color: (e.getAttributes('textStyle').color as string) || '#000000',
      lineHeight: (e.getAttributes('textStyle').lineHeight as string) || '',
      backgroundColor: (e.getAttributes('highlight').color as string) || '#ffff00',

      // 缩进没有官方等价物，映射到列表的嵌套上；不在列表里时按钮置灰
      canSink: e.can().sinkListItem('listItem'),
      canLift: e.can().liftListItem('listItem'),

      characters: (e.storage.characterCount?.characters?.() as number) ?? 0,
      words: (e.storage.characterCount?.words?.() as number) ?? 0,
    }),
  })

  const chain = () => editor.chain().focus()

  /* ---------------- 表格二级菜单 ---------------- */

  const tableItems: MenuProps['items'] = [
    { key: 'insertTable', label: '插入 3×3 表格', icon: <TableOutlined /> },
    // 光标不在表格里时，下面这些都是无意义的操作，直接不渲染
    ...(s.inTable
      ? ([
          { type: 'divider' },
          { key: 'addColumnBefore', label: '左侧插入列', icon: <InsertRowLeftOutlined /> },
          { key: 'addColumnAfter', label: '右侧插入列', icon: <InsertRowLeftOutlined /> },
          { key: 'addRowBefore', label: '上方插入行', icon: <InsertRowAboveOutlined /> },
          { key: 'addRowAfter', label: '下方插入行', icon: <InsertRowAboveOutlined /> },
          { type: 'divider' },
          { key: 'deleteColumn', label: '删除当前列', icon: <DeleteColumnOutlined />, danger: true },
          { key: 'deleteRow', label: '删除当前行', icon: <DeleteRowOutlined />, danger: true },
          { key: 'deleteTable', label: '删除整个表格', danger: true },
          { type: 'divider' },
          { key: 'mergeOrSplit', label: '合并 / 拆分单元格', icon: <MergeCellsOutlined /> },
          { key: 'toggleHeaderRow', label: '切换表头行', icon: <SelectOutlined /> },
          { key: 'toggleHeaderColumn', label: '切换表头列', icon: <SelectOutlined /> },
        ] as MenuProps['items'])
      : []),
  ]

  function handleTableMenu({ key }: { key: string }) {
    const c = editor.chain().focus()
    switch (key) {
      case 'insertTable':
        // withHeaderRow: true —— 表格没有表头在技术文章里基本没法用
        c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        break
      case 'addColumnBefore': c.addColumnBefore().run(); break
      case 'addColumnAfter': c.addColumnAfter().run(); break
      case 'addRowBefore': c.addRowBefore().run(); break
      case 'addRowAfter': c.addRowAfter().run(); break
      case 'deleteColumn': c.deleteColumn().run(); break
      case 'deleteRow': c.deleteRow().run(); break
      case 'deleteTable': c.deleteTable().run(); break
      case 'mergeOrSplit': c.mergeOrSplit().run(); break
      case 'toggleHeaderRow': c.toggleHeaderRow().run(); break
      case 'toggleHeaderColumn': c.toggleHeaderColumn().run(); break
    }
  }

  /* ---------------- 公式 ---------------- */

  // 外部（点击已有公式）优先；没有就用手动点按钮发起的那次
  const mathDialog = mathRequest ?? localMath

  function closeMathDialog() {
    if (mathRequest) onMathRequestHandled()
    else setLocalMath(null)
  }

  function confirmMath(latex: string) {
    if (!mathDialog) return
    switch (mathDialog.mode) {
      case 'insert-inline':
        editor.chain().focus().insertInlineMath({ latex }).run()
        break
      case 'insert-block':
        editor.chain().focus().insertBlockMath({ latex }).run()
        break
      case 'edit-inline':
        editor.chain().focus().updateInlineMath({ latex, pos: mathDialog.pos }).run()
        break
      case 'edit-block':
        editor.chain().focus().updateBlockMath({ latex, pos: mathDialog.pos }).run()
        break
    }
    closeMathDialog()
  }

  /* ---------------- 链接 ---------------- */

  // 选中文字后打开链接弹框，把选中的文字带进去当"显示文字"
  const selectedText = (() => {
    const { from, to } = editor.state.selection
    return from === to ? '' : editor.state.doc.textBetween(from, to, ' ')
  })()

  function confirmLink(href: string, text: string, newTab: boolean) {
    // 显式写出形状，不用 Record<string,string>：setLink 的参数类型把 href 标成
    // 必填，Record 的索引签名满足不了它，TS 会直接拒绝。
    const attributes: { href: string; target?: string; rel?: string } = { href }
    if (newTab) {
      attributes.target = '_blank'
      // 不加 rel 的话新标签页能通过 window.opener 反过来操作本站
      attributes.rel = 'noopener noreferrer nofollow'
    }
    const c = editor.chain().focus()
    if (selectedText) {
      // 已有选区：直接给选中的文字套上链接
      c.extendMarkRange('link').setLink(attributes).run()
    } else {
      // 没选区：先把文字插进去，再对刚插入的那段应用链接
      c.insertContent({ type: 'text', text, marks: [{ type: 'link', attrs: attributes }] }).run()
    }
    setLinkOpen(false)
  }

  return (
    <div className="tiptap-toolbar" data-testid="tiptap-toolbar">
      {/* ---- 撤销 / 重做 ---- */}
      <ToolButton title="撤销 (Ctrl+Z)" disabled={!s.canUndo} onClick={() => chain().undo().run()}>
        <UndoOutlined />
      </ToolButton>
      <ToolButton title="重做 (Ctrl+Shift+Z)" disabled={!s.canRedo} onClick={() => chain().redo().run()}>
        <RedoOutlined />
      </ToolButton>

      <Divider type="vertical" />

      {/* ---- 块级 ---- */}
      <Select
        size="small"
        className="tb-select"
        style={{ width: 96 }}
        value={s.heading}
        onChange={(level) => {
          if (level === 0) chain().setParagraph().run()
          else chain().setHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run()
        }}
        options={HEADING_OPTIONS}
      />
      <ToolButton title="引用" active={s.blockquote} onClick={() => chain().toggleBlockquote().run()}>
        <span className="tb-glyph">❝</span>
      </ToolButton>
      <ToolButton title="代码块" active={s.codeBlock} onClick={() => chain().toggleCodeBlock().run()}>
        <span className="tb-glyph">{'{ }'}</span>
      </ToolButton>
      {/* Details 扩展只给了 setDetails / unsetDetails，没有 toggle，
          这里自己按当前状态二选一。 */}
      <ToolButton
        title="可折叠区块"
        active={s.details}
        onClick={() => (s.details ? chain().unsetDetails() : chain().setDetails()).run()}
      >
        <NodeCollapseOutlined />
      </ToolButton>
      <ToolButton title="分割线" onClick={() => chain().setHorizontalRule().run()}>
        <span className="tb-glyph">―</span>
      </ToolButton>

      <Divider type="vertical" />

      {/* ---- 对齐 ---- */}
      <ToolButton title="左对齐" active={s.align === 'left'} onClick={() => chain().setTextAlign('left').run()}>
        <AlignLeftOutlined />
      </ToolButton>
      <ToolButton title="居中" active={s.align === 'center'} onClick={() => chain().setTextAlign('center').run()}>
        <AlignCenterOutlined />
      </ToolButton>
      <ToolButton title="右对齐" active={s.align === 'right'} onClick={() => chain().setTextAlign('right').run()}>
        <AlignRightOutlined />
      </ToolButton>
      <ToolButton title="两端对齐" active={s.align === 'justify'} onClick={() => chain().setTextAlign('justify').run()}>
        <MenuOutlined />
      </ToolButton>

      <Divider type="vertical" />

      {/* ---- 文本 ---- */}
      <ToolButton title="加粗 (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}>
        <BoldOutlined />
      </ToolButton>
      <ToolButton title="斜体 (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}>
        <ItalicOutlined />
      </ToolButton>
      <ToolButton title="下划线 (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}>
        <UnderlineOutlined />
      </ToolButton>
      <ToolButton title="删除线" active={s.strike} onClick={() => chain().toggleStrike().run()}>
        <StrikethroughOutlined />
      </ToolButton>
      <ToolButton title="行内代码" active={s.code} onClick={() => chain().toggleCode().run()}>
        <CodeOutlined />
      </ToolButton>
      <ToolButton title="上标 x²" active={s.superscript} onClick={() => chain().toggleSuperscript().run()}>
        <span className="tb-glyph">x²</span>
      </ToolButton>
      <ToolButton title="下标 x₂" active={s.subscript} onClick={() => chain().toggleSubscript().run()}>
        <span className="tb-glyph">x₂</span>
      </ToolButton>

      {/* 高亮：点图标切换开关，右边的色块单独选颜色。
          两者拆开是有意的 —— 点图标是"加/去高亮"，色块是"换成这个颜色"，
          合成一个按钮的话想改颜色就得先取消再重加。 */}
      <ToolButton title="高亮" active={s.highlight} onClick={() => chain().toggleHighlight().run()}>
        <span className="tb-glyph tb-glyph-mark">A</span>
      </ToolButton>
      <Tooltip title="高亮颜色" mouseEnterDelay={0.4}>
        <ColorPicker
          size="small"
          value={s.backgroundColor}
          // onChangeComplete 而不是 onChange：onChange 在色板上拖动时每帧都触发，
          // 一次拖拽能往 undo 栈里塞几十条记录，撤销就废了。
          onChangeComplete={(color) => chain().setHighlight({ color: color.toHexString() }).run()}
          presets={[{ label: '常用', colors: ['#ffff00', '#a0d911', '#40a9ff', '#ff85c0', '#ffa940', '#d9d9d9'] }]}
        />
      </Tooltip>

      <ToolButton
        title="清除格式"
        onClick={() => chain().unsetAllMarks().clearNodes().run()}
      >
        <ClearOutlined />
      </ToolButton>

      <Divider type="vertical" />

      {/* ---- 样式 ---- */}
      <Select
        size="small"
        className="tb-select"
        style={{ width: 118 }}
        placeholder="字体"
        allowClear
        value={s.fontFamily || undefined}
        onChange={(v) =>
          v ? chain().setFontFamily(v).run() : chain().unsetFontFamily().run()
        }
        options={FONT_FAMILIES.map((f) => ({
          value: f,
          label: <span style={{ fontFamily: f }}>{f}</span>,
        }))}
      />
      <Select
        size="small"
        className="tb-select"
        style={{ width: 78 }}
        placeholder="字号"
        allowClear
        value={s.fontSize || undefined}
        onChange={(v) => (v ? chain().setFontSize(v).run() : chain().unsetFontSize().run())}
        options={FONT_SIZES.map((v) => ({ value: v, label: v }))}
      />
      <Tooltip title="文字颜色" mouseEnterDelay={0.4}>
        <ColorPicker
          size="small"
          value={s.color}
          onChangeComplete={(color) => chain().setColor(color.toHexString()).run()}
          presets={[
            {
              label: '常用',
              colors: ['#000000', '#595959', '#8c8c8c', '#cf1322', '#d46b08', '#d4b106', '#389e0d', '#096dd9', '#531dab'],
            },
          ]}
        />
      </Tooltip>
      <Select
        size="small"
        className="tb-select"
        style={{ width: 84 }}
        placeholder="行高"
        allowClear
        value={s.lineHeight || undefined}
        onChange={(v) => (v ? chain().setLineHeight(v).run() : chain().unsetLineHeight().run())}
        options={LINE_HEIGHTS.map((v) => ({ value: v, label: v }))}
      />

      <Divider type="vertical" />

      {/* ---- 列表 ---- */}
      <ToolButton title="无序列表" active={s.bulletList} onClick={() => chain().toggleBulletList().run()}>
        <UnorderedListOutlined />
      </ToolButton>
      <ToolButton title="有序列表" active={s.orderedList} onClick={() => chain().toggleOrderedList().run()}>
        <OrderedListOutlined />
      </ToolButton>
      <ToolButton title="任务列表" active={s.taskList} onClick={() => chain().toggleTaskList().run()}>
        <CheckSquareOutlined />
      </ToolButton>
      {/* 缩进：ProseMirror 里对应列表项的嵌套，不在列表内时无意义 */}
      <ToolButton
        title="减少缩进"
        disabled={!s.canLift}
        onClick={() => chain().liftListItem('listItem').run()}
      >
        <DoubleLeftOutlined />
      </ToolButton>
      <ToolButton
        title="增加缩进"
        disabled={!s.canSink}
        onClick={() => chain().sinkListItem('listItem').run()}
      >
        <DoubleRightOutlined />
      </ToolButton>

      <Divider type="vertical" />

      {/* ---- 插入 ---- */}
      <ToolButton
        title={s.link ? '编辑链接' : '插入链接'}
        active={s.link}
        onClick={() => setLinkOpen(true)}
      >
        <LinkOutlined />
      </ToolButton>
      <ToolButton
        title="取消链接"
        disabled={!s.link}
        onClick={() => chain().extendMarkRange('link').unsetLink().run()}
      >
        <DisconnectOutlined />
      </ToolButton>
      <ToolButton title="图片 (URL)" onClick={() => setImageOpen(true)}>
        <PictureOutlined />
      </ToolButton>
      <ToolButton title="行内公式" onClick={() => setLocalMath({ mode: 'insert-inline', latex: '' })}>
        <span className="tb-glyph">$x$</span>
      </ToolButton>
      <ToolButton title="块级公式" onClick={() => setLocalMath({ mode: 'insert-block', latex: '' })}>
        <FunctionOutlined />
      </ToolButton>
      <Dropdown
        menu={{ items: tableItems, onClick: handleTableMenu }}
        trigger={['click']}
        placement="bottomLeft"
      >
        <Button
          type={s.inTable ? 'primary' : 'text'}
          size="small"
          className="tb-btn"
          onMouseDown={(e) => e.preventDefault()}
        >
          <TableOutlined /> <DownOutlined style={{ fontSize: 8 }} />
        </Button>
      </Dropdown>
      <ToolButton title="YouTube 视频" onClick={() => setYoutubeOpen(true)}>
        <YoutubeOutlined />
      </ToolButton>

      <Divider type="vertical" />

      {/* ---- 状态 ---- */}
      <span className="tb-count" title="字符数 / 词数">
        {s.characters} 字 · {s.words} 词
      </span>

      {/* ---- 弹框 ---- */}
      <LinkDialog
        open={linkOpen}
        initialHref={s.link ? (editor.getAttributes('link').href as string) || '' : ''}
        initialText={selectedText}
        onCancel={() => setLinkOpen(false)}
        onConfirm={confirmLink}
      />
      <ImageDialog
        open={imageOpen}
        onCancel={() => setImageOpen(false)}
        onConfirm={(src, alt, title) => {
          chain().setImage({ src, alt, title }).run()
          setImageOpen(false)
        }}
      />
      <YoutubeDialog
        open={youtubeOpen}
        onCancel={() => setYoutubeOpen(false)}
        onConfirm={(src) => {
          chain().setYoutubeVideo({ src }).run()
          setYoutubeOpen(false)
        }}
      />
      <MathDialog
        open={mathDialog !== null}
        mode={mathDialog?.mode ?? 'insert-inline'}
        initialLatex={mathDialog?.latex ?? ''}
        onCancel={closeMathDialog}
        onConfirm={confirmMath}
      />
    </div>
  )
}
