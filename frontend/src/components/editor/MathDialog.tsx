import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Input, Button } from 'antd'
import katex from 'katex'
import 'katex/dist/katex.min.css'

export type MathDialogMode = 'insert-inline' | 'insert-block' | 'edit-inline' | 'edit-block'

type props = {
  open: boolean
  mode: MathDialogMode
  initialLatex: string
  onCancel: () => void
  onConfirm: (latex: string) => void
}

const TITLES: Record<MathDialogMode, string> = {
  'insert-inline': 'Insert inline formula',
  'insert-block': 'Insert block formula',
  'edit-inline': 'Edit inline formula',
  'edit-block': 'Edit block formula',
}

/**
 * 公式的输入/编辑弹框。TipTap 的 mathematics 扩展只给了 `onClick(node, pos)` 回调，
 * 不带任何 UI，所以这个弹框得自己搭。
 *
 * 两种模式共用一套输入 + 实时预览：
 *   - 插入：先在这里拿到 latex，再去调 insertInlineMath/insertBlockMath。
 *     不能反过来"先插一个空节点再打开弹框编辑" —— insertInlineMath 在 latex
 *     为空字符串时直接返回 false，什么都不做。
 *   - 编辑：由扩展的 onClick 触发，确认后调 updateInlineMath/updateBlockMath。
 */
export function MathDialog({ open, mode, initialLatex, onCancel, onConfirm }: props) {
  const [latex, setLatex] = useState<string>(initialLatex)
  const isBlock = mode === 'insert-block' || mode === 'edit-block'

  // 每次打开都用传进来的值重置。组件不卸载（Modal 只是 hidden），
  // 不重置的话会残留上一次编辑的公式。
  //
  // 只在 open 翻到 true 的那一刻重置：initialLatex 来自父组件的
  // `mathRequest ?? localMath`，父组件重渲染时它可能是个新值，
  // 不加这层判断会把用户正在输入的公式替换掉。
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current) setLatex(initialLatex)
    wasOpen.current = open
  }, [open, initialLatex])

  const preview = useMemo(() => {
    if (!latex.trim()) return ''
    // throwOnError: false 让 KaTeX 把错误渲染成红色的行内提示，
    // 而不是抛异常。用户边打字边预览，中途必然是残缺的 LaTeX。
    return katex.renderToString(latex, {
      displayMode: isBlock,
      throwOnError: false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latex, isBlock])

  function handleOk() {
    const value = latex.trim()
    if (!value) return
    onConfirm(value)
  }

  return (
    <Modal
      open={open}
      title={TITLES[mode]}
      onCancel={onCancel}
      width={640}
      footer={[
        <Button key="cancel" onClick={onCancel}>Cancel</Button>,
        <Button key="ok" type="primary" disabled={!latex.trim()} onClick={handleOk}>OK</Button>,
      ]}
    >
      <Input.TextArea
        // 不用 autoFocus 是因为 Modal 的入场动画还没结束时聚焦会被打断
        autoFocus
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
        placeholder={isBlock ? 'x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}' : 'a^2+b^2=c^2'}
        autoSize={{ minRows: 3, maxRows: 8 }}
        style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
        onKeyDown={(e) => {
          // Ctrl/Cmd+Enter 直接确认。Enter 本身要留给换行 ——
          // LaTeX 里 \\ 换行很常见，不能把回车吃掉。
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            handleOk()
          }
        }}
      />
      <div className="math-dialog-preview">
        {preview
          ? <span dangerouslySetInnerHTML={{ __html: preview }} />
          : <span className="math-dialog-preview-empty">preview</span>}
      </div>
    </Modal>
  )
}
