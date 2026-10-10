import { autocompletion, completionKeymap, completionStatus } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { Compartment, EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap, placeholder as placeholderExt } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { editorTheme } from "./theme";
import { useVariableExtensions } from "./variables";

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  /** Return true to consume pasted text (e.g. a cURL command). */
  onPasteText?: (text: string) => boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

const singleLineTheme = EditorView.theme({
  "&": { fontSize: "13px" },
  ".cm-content": { padding: "0" },
  ".cm-line": { padding: "0 2px" },
  ".cm-scroller": { overflow: "auto hidden", scrollbarWidth: "none" },
});

function handlerExtensions(onEnter?: () => void, onPasteText?: (text: string) => boolean) {
  return [
    Prec.highest(
      keymap.of([
        {
          key: "Enter",
          run: (view) => {
            // Let Enter pick an autocomplete suggestion first.
            if (completionStatus(view.state) === "active") return false;
            onEnter?.();
            return true;
          },
        },
      ]),
    ),
    EditorView.domEventHandlers({
      paste: (event) => {
        const text = event.clipboardData?.getData("text/plain") ?? "";
        if (onPasteText?.(text)) {
          event.preventDefault();
          return true;
        }
        return false;
      },
    }),
  ];
}

/** One-line editor that highlights `{{variables}}`, used for URLs and targets. */
export function VariableInput({
  value,
  onChange,
  onEnter,
  onPasteText,
  placeholder,
  className,
  ariaLabel,
}: VariableInputProps) {
  const variableExtensions = useVariableExtensions();
  const [view, setView] = useState<EditorView | null>(null);
  // Handlers change on every render, so they live in their own compartment
  // instead of forcing the whole editor to be reconfigured.
  const [handlerSlot] = useState(() => new Compartment());

  const extensions = useMemo(
    () => [
      ...editorTheme,
      singleLineTheme,
      history(),
      autocompletion(),
      placeholderExt(placeholder ?? ""),
      // Collapse newlines so pasted multi-line text stays on one line.
      EditorState.transactionFilter.of((tr) =>
        tr.newDoc.lines > 1
          ? [
              tr,
              {
                changes: {
                  from: 0,
                  to: tr.newDoc.length,
                  insert: tr.newDoc.sliceString(0).replace(/\s*\r?\n\s*/g, " "),
                },
                sequential: true,
              },
            ]
          : tr,
      ),
      handlerSlot.of([]),
      keymap.of([...completionKeymap, ...defaultKeymap, ...historyKeymap]),
      EditorView.contentAttributes.of({ "aria-label": ariaLabel ?? placeholder ?? "Input" }),
      ...variableExtensions,
    ],
    [placeholder, ariaLabel, variableExtensions, handlerSlot],
  );

  // Runs after CodeMirror applies `extensions`, which resets the compartment.
  useEffect(() => {
    view?.dispatch({ effects: handlerSlot.reconfigure(handlerExtensions(onEnter, onPasteText)) });
  }, [view, handlerSlot, extensions, onEnter, onPasteText]);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme="none"
      basicSetup={false}
      className={cn("min-w-0 flex-1 overflow-hidden", className)}
      extensions={extensions}
      onCreateEditor={setView}
    />
  );
}
