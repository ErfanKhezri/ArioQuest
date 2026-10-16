import { HighlightStyle, syntaxHighlighting, syntaxTree } from "@codemirror/language";
import { Compartment, type Extension, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { type AppMode, getAppMode, subscribeAppMode } from "@/lib/appTheme";
import { useWorkspace } from "@/store/workspace";
import {
  activeTheme,
  type EditorSettings,
  type EditorTheme,
  fontStack,
  GLASS,
  isTransparent,
} from "./themes";

const mix = (color: string, percent: number) =>
  `color-mix(in srgb, ${color} ${percent}%, transparent)`;

const rainbowSlots = 3;
const rainbowMarks = Array.from({ length: rainbowSlots }, (_, i) =>
  Decoration.mark({ class: `cm-rb-${i}` }),
);
const openBrackets = new Set(["{", "[", "("]);
const brackets = new Set(["{", "}", "[", "]", "(", ")"]);
type SyntaxNode = ReturnType<typeof syntaxTree>["topNode"];

/** Colors bracket pairs by nesting depth, for the visible part of the document only. */
function rainbowDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const tree = syntaxTree(view.state);
  for (const { from, to } of view.visibleRanges) {
    // A node whose first child is an opening bracket (object, array, block, args) adds a level.
    let depth = 0;
    const opens = (ref: { node: SyntaxNode }) => openBrackets.has(ref.node.firstChild?.name ?? "");
    tree.iterate({
      from,
      to,
      enter: (node) => {
        if (brackets.has(node.name)) {
          if (node.from >= from && node.to <= to) {
            const slot = (depth - 1 + rainbowSlots) % rainbowSlots;
            builder.add(node.from, node.to, rainbowMarks[slot]!);
          }
          return false;
        }
        if (opens(node)) depth++;
      },
      leave: (node) => {
        if (!brackets.has(node.name) && opens(node)) depth--;
      },
    });
  }
  return builder.finish();
}

const rainbowBrackets = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = rainbowDecorations(view);
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        syntaxTree(update.state) !== syntaxTree(update.startState)
      ) {
        this.decorations = rainbowDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

/** Turns a theme (plus font and bracket settings) into one CodeMirror extension. */
export function themeExtension(
  theme: EditorTheme,
  settings: EditorSettings,
  appMode: AppMode,
): Extension {
  const c = theme.colors;
  // A dark theme over a light app (or the reverse) needs its own background to stay readable.
  const background =
    isTransparent(settings, theme) && theme.mode === appMode
      ? theme.name === GLASS
        ? "transparent"
        : mix(theme.background, 35)
      : theme.background;
  const rainbow = [c.keyword, c.number, c.key];

  const view = EditorView.theme(
    {
      "&": { backgroundColor: background, color: c.text, fontSize: `${settings.fontSize}px` },
      ".cm-scroller": {
        fontFamily: fontStack(settings.fontFamily),
        lineHeight: String(settings.lineHeight),
      },
      ".cm-content": { caretColor: c.text },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: c.text },
      ".cm-gutters": { backgroundColor: "transparent", color: c.comment },
      ".cm-activeLine": { backgroundColor: mix(c.text, 6) },
      ".cm-activeLineGutter": { backgroundColor: "transparent", color: c.text },
      "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        { backgroundColor: mix(c.key, 28) },
      ".cm-matchingBracket": { backgroundColor: mix(c.key, 22), outline: "none" },
      ".cm-placeholder": { color: c.comment },
      ".cm-var:not(.cm-var-missing)": { color: c.key, backgroundColor: mix(c.key, 16) },
      ...Object.fromEntries(
        rainbow.map((color, i) => [`.cm-rb-${i}, .cm-rb-${i} span`, { color }]),
      ),
    },
    { dark: theme.mode === "dark" },
  );

  const highlight = HighlightStyle.define([
    { tag: [t.propertyName, t.attributeName], color: c.key },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: c.key },
    { tag: [t.string, t.special(t.string), t.regexp], color: c.string },
    { tag: [t.number, t.integer, t.float], color: c.number },
    { tag: [t.bool, t.atom], color: c.boolean },
    { tag: t.null, color: c.null },
    {
      tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.definitionKeyword, t.modifier],
      color: c.keyword,
    },
    { tag: [t.tagName, t.angleBracket], color: c.keyword },
    { tag: [t.comment, t.lineComment, t.blockComment], color: c.comment, fontStyle: "italic" },
    { tag: [t.punctuation, t.bracket, t.separator, t.operator], color: c.punctuation },
    { tag: t.invalid, color: "var(--danger)" },
  ]);

  return [view, syntaxHighlighting(highlight), settings.rainbowBrackets ? rainbowBrackets : []];
}

/*
 * One theme extension shared by every code editor. Editors hold it in a
 * compartment, so a settings or app theme change reconfigures open editors in
 * place instead of remounting them.
 */
const themeCompartment = new Compartment();
const views = new Set<EditorView>();
let current: Extension | undefined;

const computeCurrent = () => {
  const settings = useWorkspace.getState().editorSettings;
  const mode = getAppMode();
  return themeExtension(activeTheme(settings, mode), settings, mode);
};

function refresh() {
  current = computeCurrent();
  for (const view of views) view.dispatch({ effects: themeCompartment.reconfigure(current) });
}

const registry = ViewPlugin.define((view) => {
  views.add(view);
  return { destroy: () => views.delete(view) };
});

/** The live editor theme; include it in an editor's extensions. */
export function sharedThemeExtension(): Extension {
  if (!current) {
    current = computeCurrent();
    useWorkspace.subscribe((s, prev) => {
      if (s.editorSettings !== prev.editorSettings) refresh();
    });
    subscribeAppMode(refresh);
  }
  return [registry, themeCompartment.of(current)];
}
