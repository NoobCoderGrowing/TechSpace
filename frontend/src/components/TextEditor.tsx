import { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
import ImageResize from 'quill-image-resize-module-react';
import Quill from 'quill';
import katex from "katex";
import "katex/dist/katex.min.css";
import './TextEditor.css'
// Quill 的 formula 模块从全局 window.katex 取渲染器。
// katex 的 `export as namespace katex` 让 TS 把 window.katex 推断为模块命名空间类型，
// 与运行时实际赋的默认导出对象({ version, render, renderToString, ParseError })不一致，
// 故此处用 any 跳过该类型检查，运行时行为不变。
(window as any).katex = katex;

type props = {
  editorValue: string;
  setEditorValue: Function; 
}

function TextEditor({editorValue, setEditorValue}:props) {

  Quill.register('modules/imageResize', ImageResize);
  // const [editorValue, setEditorValue] = useState('');

  return (
      <ReactQuill
      value={editorValue}
      onChange={(value) => setEditorValue(value)}
      modules={{
          imageResize: {
              parchment: Quill.import('parchment'),
              modules: ['Resize', 'DisplaySize']
          },
          toolbar: [
          [{ header: [1, 2, 3, 4, 5, 6, false] }],
          [{ 'font': [] }],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'align': [] }],
          ['bold', 'italic', 'underline'],
          ['link','image','formula', 'code-block','blockquote',],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          [{ 'indent': '-1'}, { 'indent': '+1' }]
          ]
      }}
      theme="snow"
      />
  );
}

export default TextEditor;
