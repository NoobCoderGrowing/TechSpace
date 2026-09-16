import { useEffect, useState } from 'react'
import { Modal, Input, Button } from 'antd'

type props = {
  open: boolean
  onCancel: () => void
  onConfirm: (src: string, alt: string, title: string) => void
}

/**
 * 图片弹框。只接受 URL —— 用户已确认不做本地上传，
 * 也从源头掐掉了"把 base64 塞进 content 字段"这条路
 * （Image 扩展那边也配了 allowBase64: false，两道保险）。
 */
export function ImageDialog({ open, onCancel, onConfirm }: props) {
  const [src, setSrc] = useState('')
  const [alt, setAlt] = useState('')
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (open) {
      setSrc('')
      setAlt('')
      setTitle('')
    }
  }, [open])

  return (
    <Modal
      open={open}
      title="Insert image"
      onCancel={onCancel}
      width={520}
      footer={[
        <Button key="cancel" onClick={onCancel}>Cancel</Button>,
        <Button
          key="ok"
          type="primary"
          disabled={!src.trim()}
          onClick={() => onConfirm(src.trim(), alt.trim(), title.trim())}
        >
          OK
        </Button>,
      ]}
    >
      <div className="editor-dialog-field">
        <label>Image URL</label>
        <Input
          autoFocus
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          placeholder="https://example.com/pic.png"
        />
      </div>
      <div className="editor-dialog-field">
        <label>Alt</label>
        {/* alt 不是可有可无的装饰：图挂了、或者读屏软件在念的时候，
            用户看到/听到的就是这行字。 */}
        <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="图片描述" />
      </div>
      <div className="editor-dialog-field">
        <label>Title</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="悬停时显示的文字（可留空）" />
      </div>
      {src.trim() && (
        // 直接给个缩略预览：URL 打错是这一步最常见的失败，
        // 在这里就能看出来，不用等提交完才发现图是裂的。
        <div className="editor-dialog-preview">
          <img src={src} alt={alt} />
        </div>
      )}
    </Modal>
  )
}
