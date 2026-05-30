'use client';

import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';

type SqlCodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  disabled?: boolean;
  minHeight?: string;
  /** Optional id of element describing keyboard shortcuts (aria-describedby). */
  ariaDescribedBy?: string;
};

/**
 * CodeMirror 6 SQL surface with Enter = run, Shift+Enter = newline.
 */
export function SqlCodeEditor({
  value,
  onChange,
  onRun,
  disabled,
  minHeight = '120px',
  ariaDescribedBy,
}: SqlCodeEditorProps) {
  return (
    <CodeMirror
      value={value}
      height="auto"
      minHeight={minHeight}
      editable={!disabled}
      theme={oneDark}
      aria-describedby={ariaDescribedBy}
      extensions={[
        sql(),
        EditorView.domEventHandlers({
          keydown(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onRun();
              return true;
            }
            return false;
          },
        }),
      ]}
      onChange={onChange}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
      }}
    />
  );
}
