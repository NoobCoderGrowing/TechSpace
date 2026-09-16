import { useMemo, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'

import { createEditorExtensions } from './editor/extensions'
import { Toolbar } from './editor/Toolbar'
import type { MathRequest } from './editor/Toolbar'
import './ArticleContent.css'
import './TextEditor.css'

type props = {
  editorValue: string
  setEditorValue: Function
}

/**
 * 正文编辑器。从 Quill 换到 TipTap 3。
 *
 * 对外的 props 契约完全没变（`{editorValue, setEditorValue}`），
 * 所以 EidtPage.tsx 那边一行都不用改 —— 它只知道"给一段 HTML、收一段 HTML"。
 */
export default function TextEditor({ editorValue, setEditorValue }: props) {
  // 点击已有公式时，数学扩展通过回调把 (latex, pos) 回传到这里，
  // 转手交给工具栏去弹那个编辑框。扩展只提供这一个人机接口，没有自带 UI。
  const [mathRequest, setMathRequest] = useState<MathRequest | null>(null)

  // useEditor 只在首次渲染读这个数组，但它每次渲染都会被求值。
  // 不 memo 的话每次渲染都会 new 出一整套扩展实例，纯属白发。
  const extensions = useMemo(
    () =>
      createEditorExtensions({
        onMathClick: ({ latex, pos, block }) =>
          setMathRequest({
            mode: block ? 'edit-block' : 'edit-inline',
            pos,
            latex,
          }),
      }),
    [],
  )

  const editor = useEditor({
    extensions,
    content: editorValue,

    // 把正文排版的 class 直接挂到 contenteditable 上（它会和 ProseMirror
    // 这个 class 并存）。这样编辑区和阅读页用同一份 ArticleContent.css，
    // 真正做到"写的时候长什么样，发出来就是什么样"。
    // 挂在 EditorContent 的 className 上不行 —— 那是外层包裹 div，
    // ProseMirror 是它的子元素，两者的盒模型角色不一样。
    editorProps: {
      attributes: { class: 'article-content' },
    },

    // 只在挂载时生效。EidtPage 从不把 editorValue 重置回去，
    // 所以这里不会出现"用户打字打到一半被外部值覆盖"的经典问题。
    onUpdate: ({ editor }) => {
      // 必须显式处理空文档。Quill 空编辑器的 onChange 给的是 ''，
      // 而 TipTap 的 getHTML() 对空文档返回 '<p></p>'。
      // 不做这个转换，EidtPage.tsx 里 `editorValue == ''` 那半截校验
      // 就永远不成立，正文空白的文章能直接通过校验上传上去。
      setEditorValue(editor.isEmpty ? '' : editor.getHTML())
    },
  })

  return (
    <div className="tiptap-wrapper">
      <Toolbar
        editor={editor}
        mathRequest={mathRequest}
        onMathRequestHandled={() => setMathRequest(null)}
      />
      <EditorContent editor={editor} className="tiptap-content" />
    </div>
  )
}
