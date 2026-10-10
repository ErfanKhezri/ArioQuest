import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

/** Editor chrome driven by the app's CSS tokens, so it follows light/dark mode. */
const chrome = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "var(--fg)",
    fontSize: "12.5px",
    height: "100%",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.6" },
  ".cm-content": { caretColor: "var(--fg)", padding: "8px 0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--fg)" },
  ".cm-gutters": {
    backgroundColor: "transparent",
    color: "var(--subtle)",
    border: "none",
    paddingLeft: "4px",
  },
  ".cm-activeLine": { backgroundColor: "color-mix(in oklch, var(--panel-2) 55%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--fg)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    { backgroundColor: "color-mix(in oklch, var(--brand) 28%, transparent)" },
  ".cm-matchingBracket": {
    backgroundColor: "color-mix(in oklch, var(--brand) 20%, transparent)",
    outline: "none",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--panel-2)",
    border: "none",
    color: "var(--muted)",
  },
  ".cm-placeholder": { color: "var(--subtle)" },
  ".cm-tooltip": {
    backgroundColor: "var(--panel)",
    color: "var(--fg)",
    border: "1px solid var(--line)",
    borderRadius: "8px",
    boxShadow: "0 10px 30px -10px rgb(0 0 0 / 0.35)",
    overflow: "hidden",
  },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "color-mix(in oklch, var(--brand) 20%, transparent)",
    color: "var(--fg)",
  },
  ".cm-panels": {
    backgroundColor: "var(--panel-2)",
    color: "var(--fg)",
    borderColor: "var(--line)",
  },
  ".cm-panel input, .cm-panel button": { fontSize: "12px" },
  ".cm-searchMatch": { backgroundColor: "color-mix(in oklch, var(--warn) 30%, transparent)" },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "color-mix(in oklch, var(--warn) 55%, transparent)",
  },
  ".cm-lintRange-error": { backgroundImage: "none", borderBottom: "1px dashed var(--danger)" },
});

const highlight = HighlightStyle.define([
  { tag: [t.propertyName, t.attributeName], color: "var(--syn-key)" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "var(--syn-string)" },
  { tag: [t.number, t.integer, t.float], color: "var(--syn-number)" },
  { tag: [t.bool, t.null, t.atom], color: "var(--syn-bool)" },
  {
    tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword, t.modifier],
    color: "var(--syn-keyword)",
  },
  { tag: [t.tagName, t.angleBracket], color: "var(--syn-tag)" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "var(--syn-key)" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--subtle)", fontStyle: "italic" },
  { tag: [t.punctuation, t.bracket, t.separator], color: "var(--muted)" },
  { tag: t.invalid, color: "var(--danger)" },
]);

export const editorTheme = [chrome, syntaxHighlighting(highlight)];
