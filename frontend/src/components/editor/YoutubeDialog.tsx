import { useEffect, useState } from 'react'
import { Modal, Input, Button } from 'antd'

type props = {
  open: boolean
  onCancel: () => void
  onConfirm: (src: string) => void
}

/**
 * YouTube 弹框。setYoutubeVideo 要的是 YouTube 的观看页地址
 * （`https://www.youtube.com/watch?v=xxx`），不是 iframe 的 embed 地址
 * —— 扩展内部会自己解析出 video id。用户把 embed 地址粘进来是最常见的误操作，
 * 所以这里顺手把 `/embed/` 形式归一化回 watch 形式。
 */
function normalizeYoutubeUrl(raw: string): string {
  const embedMatch = raw.match(/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{6,})/)
  if (embedMatch) return `https://www.youtube.com/watch?v=${embedMatch[1]}`
  return raw
}

export function YoutubeDialog({ open, onCancel, onConfirm }: props) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    if (open) setSrc('')
  }, [open])

  return (
    <Modal
      open={open}
      title="Insert YouTube video"
      onCancel={onCancel}
      width={520}
      footer={[
        <Button key="cancel" onClick={onCancel}>Cancel</Button>,
        <Button
          key="ok"
          type="primary"
          disabled={!src.trim()}
          onClick={() => onConfirm(normalizeYoutubeUrl(src.trim()))}
        >
          OK
        </Button>,
      ]}
    >
      <div className="editor-dialog-field">
        <label>Video URL</label>
        <Input
          autoFocus
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && src.trim()) onConfirm(normalizeYoutubeUrl(src.trim()))
          }}
        />
      </div>
    </Modal>
  )
}
