import React from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

interface MonacoEditorProps {
  value: string;
  onChange: (val: string) => void;
  language?: 'html' | 'handlebars' | 'json' | 'markdown';
  height?: string | number;
  className?: string;
  readOnly?: boolean;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  onChange,
  language = 'html',
  height = '420px',
  className = '',
  readOnly = false,
}) => {
  const isDarkMode = document.documentElement.classList.contains('dark');

  const handleEditorChange = (val: string | undefined) => {
    onChange(val || '');
  };

  const handleEditorDidMount: OnMount = (editor) => {
    // Optional configuration on editor mount
    editor.updateOptions({
      tabSize: 2,
      wordWrap: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      lineNumbersMinChars: 3,
      renderWhitespace: 'selection',
    });
  };

  return (
    <div className={`rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 ${className}`}>
      <Editor
        height={height}
        language={language === 'handlebars' ? 'html' : language}
        value={value}
        theme={isDarkMode ? 'vs-dark' : 'light'}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          fontSize: 13,
          tabSize: 2,
          wordWrap: 'on',
          lineNumbers: 'on',
        }}
      />
    </div>
  );
};
