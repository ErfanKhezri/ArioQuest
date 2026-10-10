import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { editorTheme } from "./theme";
import { useVariableExtensions } from "./variables";

export type EditorLanguage = "json" | "javascript" | "xml" | "html" | "text";

const languages: Record<EditorLanguage, () => Extension[]> = {
  json: () => [json()],
  javascript: () => [javascript()],
  xml: () => [xml()],
  html: () => [html()],
  text: () => [],
};

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: EditorLanguage;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  lineNumbers?: boolean;
  wrap?: boolean;
  /** Highlight and autocomplete `{{variables}}`. */
  variables?: boolean;
  extraExtensions?: Extension[];
}

export function CodeEditor({
  value,
  onChange,
  language = "text",
  readOnly = false,
  placeholder,
  className,
  lineNumbers = true,
  wrap = false,
  variables = false,
  extraExtensions,
}: CodeEditorProps) {
  const variableExtensions = useVariableExtensions();
  const extensions = useMemo(
    () => [
      ...editorTheme,
      ...languages[language](),
      ...(wrap ? [EditorView.lineWrapping] : []),
      ...(variables ? variableExtensions : []),
      ...(extraExtensions ?? []),
    ],
    [language, wrap, variables, variableExtensions, extraExtensions],
  );

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      editable={!readOnly}
      placeholder={placeholder}
      theme="none"
      height="100%"
      className={cn("h-full min-h-0 overflow-hidden", className)}
      extensions={extensions}
      basicSetup={{
        lineNumbers,
        foldGutter: lineNumbers,
        highlightActiveLine: !readOnly,
        highlightActiveLineGutter: !readOnly,
        autocompletion: true,
        closeBrackets: !readOnly,
        bracketMatching: true,
        searchKeymap: true,
        tabSize: 2,
      }}
    />
  );
}
