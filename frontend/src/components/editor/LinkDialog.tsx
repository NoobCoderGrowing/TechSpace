import { useEffect, useRef, useState } from 'react'
import { Modal, Input, Button, Checkbox } from 'antd'

type props = {
  open: boolean
  /** 光标落在已有链接里时传原文，用来做"编辑"而不是"新建" */
  initialHref: string
  initialText: string
  onCancel: () => void
  onConfirm: (href: string, text: string, newTab: boolean) => void
}

/**
 * 链接弹框。TipTap 的 Link 扩展只有命令没有 UI，setLink 要求先把选区选中。
 *
 * 选中文字后打开 → "显示文字"预填选中的内容，确认时只改 href，不动文字。
 * 没选中任何文字 → 显示文字可用，确认时先把文字插进去再包链接。
 */
export function LinkDialog({ open, initialHref, initialText, onCancel, onConfirm }: props) {
  const [href, setHref] = useState('')
  const [text, setText] = useState('')
  const [newTab, setNewTab] = useState(true)

  // Modal 是隐藏不是卸载，重新打开必须重置，否则会带着上一次的内容。
  //
  // 只在 open 从 false 翻到 true 的那一刻重置，靠 wasOpen 记住上一次的值。
  // 不能写成 `if (open) 重置` 加 deps [open, initialHref, initialText] ——
  // initialText 是父组件每次渲染现算的（读编辑器当前选区），父组件一重渲染
  // 它就"变化"，正在输入的内容会被当场冲掉。
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current) {
      setHref(initialHref)
      setText(initialText)
      setNewTab(true)
    }
    wasOpen.current = open
  }, [open, initialHref, initialText])

  const hasText = initialText.length > 0
  const canSubmit = href.trim().length > 0 && (hasText || text.trim().length > 0)

  return (
    <Modal
      open={open}
      title={initialHref ? 'Edit link' : 'Insert link'}
      onCancel={onCancel}
      width={520}
      footer={[
        <Button key="cancel" onClick={onCancel}>Cancel</Button>,
        <Button
          key="ok"
          type="primary"
          disabled={!canSubmit}
          onClick={() => onConfirm(href.trim(), text.trim(), newTab)}
        >
          OK
        </Button>,
      ]}
    >
      <div className="editor-dialog-field">
        <label>URL</label>
        <Input
          autoFocus
          value={href}
          onChange={(e) => setHref(e.target.value)}
          placeholder="https://example.com"
        />
      </div>
      <div className="editor-dialog-field">
        <label>Text</label>
        <Input
          value={text}
          // 选中的文字就是最终要显示的文字，这时不让改，
          // 免得用户以为改了这里、结果链接还是原来那段文字。
          disabled={hasText}
          onChange={(e) => setText(e.target.value)}
          placeholder={hasText ? '（使用选中的文字）' : '链接显示的文字'}
        />
      </div>
      <Checkbox checked={newTab} onChange={(e) => setNewTab(e.target.checked)}>
        Open in new tab
      </Checkbox>
    </Modal>
  )
}
