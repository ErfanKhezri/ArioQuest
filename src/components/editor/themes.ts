import { t } from "@/i18n";
/**
 * Editor color themes as plain data. `themeExtension.ts` turns one of these into
 * a CodeMirror extension; the settings UI edits them.
 */

export type ThemeMode = "dark" | "light";

export const tokenKeys = [
  "text",
  "key",
  "string",
  "number",
  "boolean",
  "null",
  "punctuation",
  "comment",
  "keyword",
] as const;

export type TokenKey = (typeof tokenKeys)[number];

export interface EditorTheme {
  id: string;
  name: string;
  mode: ThemeMode;
  colors: Record<TokenKey, string>;
  background: string;
  /** Preset a custom theme started from, used by "Reset to preset". */
  basedOn?: string;
}

export interface EditorSettings {
  themeId: string;
  /** Use the selected theme's dark or light variant to match the app theme. */
  followApp: boolean;
  /** Let the panel behind the editor show through; `null` uses the theme's default. */
  transparent: boolean | null;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  rainbowBrackets: boolean;
  customThemes: EditorTheme[];
}

export const GLASS = "ArioQuest Glass";
export const DEFAULT_THEME_ID = "glass-dark";

const preset = (
  id: string,
  name: string,
  mode: ThemeMode,
  background: string,
  c: [string, string, string, string, string, string, string, string, string],
): EditorTheme => ({
  id,
  name,
  mode,
  background,
  colors: {
    text: c[0],
    key: c[1],
    string: c[2],
    number: c[3],
    boolean: c[4],
    null: c[5],
    punctuation: c[6],
    comment: c[7],
    keyword: c[8],
  },
});

// Colors: text, key, string, number, boolean, null, punctuation, comment, keyword
// prettier-ignore
export const presetThemes: EditorTheme[] = [
  preset("glass-dark", GLASS, "dark", "#1c1d21", [
    "#e9eaee", "#9dbcf0", "#8fd4a0", "#e8c27a", "#e59bd3", "#c9a2f0", "#a8aab2", "#7d8089", "#c3a2ec",
  ]),
  preset("glass-light", GLASS, "light", "#ffffff", [
    "#2a2b30", "#2f63c4", "#2f7d47", "#9a5f10", "#b23a8d", "#8a46b8", "#5f616a", "#8b8e96", "#7a3fc4",
  ]),
  preset("one-dark", "One Dark", "dark", "#282c34", [
    "#abb2bf", "#e06c75", "#98c379", "#d19a66", "#d19a66", "#56b6c2", "#abb2bf", "#7f848e", "#c678dd",
  ]),
  preset("one-light", "One Dark", "light", "#fafafa", [
    "#383a42", "#e45649", "#50a14f", "#986801", "#986801", "#0184bc", "#383a42", "#a0a1a7", "#a626a4",
  ]),
  preset("github-dark", "GitHub", "dark", "#0d1117", [
    "#e6edf3", "#7ee787", "#a5d6ff", "#79c0ff", "#79c0ff", "#79c0ff", "#e6edf3", "#8b949e", "#ff7b72",
  ]),
  preset("github-light", "GitHub", "light", "#ffffff", [
    "#1f2328", "#116329", "#0a3069", "#0550ae", "#0550ae", "#0550ae", "#1f2328", "#6e7781", "#cf222e",
  ]),
  preset("dracula-dark", "Dracula", "dark", "#282a36", [
    "#f8f8f2", "#8be9fd", "#f1fa8c", "#bd93f9", "#bd93f9", "#bd93f9", "#f8f8f2", "#6272a4", "#ff79c6",
  ]),
  preset("dracula-light", "Dracula", "light", "#fffbeb", [
    "#1f1f1f", "#036a96", "#846e15", "#644ac9", "#644ac9", "#644ac9", "#1f1f1f", "#635d97", "#a3144d",
  ]),
  preset("monokai-dark", "Monokai", "dark", "#272822", [
    "#f8f8f2", "#a6e22e", "#e6db74", "#ae81ff", "#ae81ff", "#ae81ff", "#f8f8f2", "#88846f", "#f92672",
  ]),
  preset("monokai-light", "Monokai", "light", "#fafafa", [
    "#272822", "#4d8a00", "#7a7116", "#7e57c2", "#7e57c2", "#7e57c2", "#272822", "#8f8b75", "#d81b60",
  ]),
  preset("nord-dark", "Nord", "dark", "#2e3440", [
    "#d8dee9", "#8fbcbb", "#a3be8c", "#b48ead", "#81a1c1", "#81a1c1", "#eceff4", "#616e88", "#81a1c1",
  ]),
  preset("nord-light", "Nord", "light", "#eceff4", [
    "#2e3440", "#2f6f8f", "#4f7a3a", "#8a5a83", "#3b6aa0", "#3b6aa0", "#4c566a", "#7b88a1", "#5e81ac",
  ]),
  preset("tokyo-dark", "Tokyo Night", "dark", "#1a1b26", [
    "#c0caf5", "#7aa2f7", "#9ece6a", "#ff9e64", "#ff9e64", "#bb9af7", "#89ddff", "#565f89", "#bb9af7",
  ]),
  preset("tokyo-light", "Tokyo Night", "light", "#e1e2e7", [
    "#3760bf", "#2e7de9", "#587539", "#b15c00", "#b15c00", "#9854f1", "#006a83", "#848cb5", "#9854f1",
  ]),
  preset("solarized-dark", "Solarized", "dark", "#002b36", [
    "#93a1a1", "#268bd2", "#2aa198", "#d33682", "#b58900", "#cb4b16", "#839496", "#586e75", "#859900",
  ]),
  preset("solarized-light", "Solarized", "light", "#fdf6e3", [
    "#586e75", "#268bd2", "#2aa198", "#d33682", "#b58900", "#cb4b16", "#657b83", "#93a1a1", "#859900",
  ]),
];

export const defaultEditorSettings: EditorSettings = {
  themeId: DEFAULT_THEME_ID,
  followApp: true,
  transparent: null,
  fontFamily: "JetBrains Mono",
  fontSize: 12,
  lineHeight: 1.6,
  rainbowBrackets: false,
  customThemes: [],
};

export const monospaceFonts = [
  "JetBrains Mono",
  "Cascadia Code",
  "Consolas",
  "Fira Code",
  "Source Code Pro",
  "Courier New",
  "System monospace",
];

export const fontStack = (family: string) =>
  family === "System monospace" ? "ui-monospace, monospace" : `"${family}", var(--font-mono)`;

export const allThemes = (settings: EditorSettings) => [...presetThemes, ...settings.customThemes];

export const findTheme = (settings: EditorSettings, id: string) =>
  allThemes(settings).find((t) => t.id === id);

/** The same-named theme in the other mode, if one exists. */
export function variantFor(settings: EditorSettings, theme: EditorTheme, mode: ThemeMode) {
  if (theme.mode === mode) return theme;
  return allThemes(settings).find((t) => t.name === theme.name && t.mode === mode) ?? theme;
}

/** The theme editors should use right now. */
export function activeTheme(settings: EditorSettings, appMode: ThemeMode): EditorTheme {
  const selected = findTheme(settings, settings.themeId) ?? findTheme(settings, DEFAULT_THEME_ID)!;
  return settings.followApp ? variantFor(settings, selected, appMode) : selected;
}

export const isTransparent = (settings: EditorSettings, theme: EditorTheme) =>
  settings.transparent ?? theme.name === GLASS;

/** Theme names shown in pickers: each preset family once, then custom themes. */
export function themeNames(settings: EditorSettings): string[] {
  return [...new Set(allThemes(settings).map((t) => t.name))];
}

/** Picks the theme with this name, preferring the given mode. */
export function themeByName(settings: EditorSettings, name: string, mode: ThemeMode) {
  const matches = allThemes(settings).filter((t) => t.name === name);
  return matches.find((t) => t.mode === mode) ?? matches[0] ?? activeTheme(settings, mode);
}

/** A name not used by any theme yet: "Name", "Name 2", ... */
export function uniqueName(settings: EditorSettings, name: string): string {
  const taken = new Set(allThemes(settings).map((t) => t.name));
  if (!taken.has(name)) return name;
  let n = 2;
  while (taken.has(`${name} ${n}`)) n++;
  return `${name} ${n}`;
}

/** Normalizes `#abc` / `#AABBCC` to `#aabbcc`; returns undefined for anything else. */
export function normalizeHex(value: string): string | undefined {
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) return `#${[...v.slice(1)].map((ch) => ch + ch).join("")}`;
  return undefined;
}

/** The small JSON file a theme is exported as. */
export function exportTheme(theme: EditorTheme): string {
  const { name, mode, colors, background } = theme;
  return JSON.stringify({ name, mode, colors, background }, null, 2);
}

/**
 * Reads an exported theme. Missing token colors are filled from the preset of
 * the same mode; malformed input throws with a readable message.
 */
export function parseTheme(json: string, id: string): EditorTheme {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error(t("errors.invalidJsonFile"));
  }
  if (!data || typeof data !== "object") throw new Error(t("themeErrors.notTheme"));
  const raw = data as Record<string, unknown>;

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) throw new Error(t("themeErrors.noName"));
  if (raw.mode !== "dark" && raw.mode !== "light") {
    throw new Error(t("themeErrors.badMode"));
  }
  const base = presetThemes.find((theme) => theme.mode === raw.mode)!;

  const background = normalizeHex(String(raw.background ?? base.background));
  if (!background) throw new Error(t("themeErrors.badBackground"));

  const rawColors = (raw.colors && typeof raw.colors === "object" ? raw.colors : {}) as Record<
    string,
    unknown
  >;
  const colors = { ...base.colors };
  for (const key of tokenKeys) {
    if (rawColors[key] === undefined) continue;
    const hex = normalizeHex(String(rawColors[key]));
    if (!hex) throw new Error(t("themeErrors.badColor", { key }));
    colors[key] = hex;
  }

  return { id, name, mode: raw.mode, colors, background, basedOn: base.id };
}
