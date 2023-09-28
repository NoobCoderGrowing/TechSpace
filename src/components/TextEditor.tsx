import { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
import ImageResize from 'quill-image-resize-module-react';
import Quill from 'quill';
import katex from "katex";
import "katex/dist/katex.min.css";
import './TextEditor.css'
window.katex = katex;

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
