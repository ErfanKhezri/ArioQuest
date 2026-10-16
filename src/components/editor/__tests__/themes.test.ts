import { describe, expect, it } from "vitest";
import {
  activeTheme,
  defaultEditorSettings,
  type EditorSettings,
  exportTheme,
  GLASS,
  isTransparent,
  normalizeHex,
  parseTheme,
  presetThemes,
  themeNames,
  tokenKeys,
  uniqueName,
} from "../themes";

const settings = (patch: Partial<EditorSettings> = {}): EditorSettings => ({
  ...defaultEditorSettings,
  ...patch,
});

describe("editor themes", () => {
  it("ships every preset in a dark and a light variant with all colors set", () => {
    const names = themeNames(settings());
    expect(names).toEqual([
      GLASS,
      "One Dark",
      "GitHub",
      "Dracula",
      "Monokai",
      "Nord",
      "Tokyo Night",
      "Solarized",
    ]);
    for (const name of names) {
      const modes = presetThemes.filter((t) => t.name === name).map((t) => t.mode);
      expect(modes.sort()).toEqual(["dark", "light"]);
    }
    for (const theme of presetThemes) {
      expect(normalizeHex(theme.background)).toBe(theme.background);
      for (const key of tokenKeys) expect(normalizeHex(theme.colors[key])).toBe(theme.colors[key]);
    }
  });

  it("follows the app theme by swapping to the other variant", () => {
    expect(activeTheme(settings(), "light").id).toBe("glass-light");
    expect(activeTheme(settings({ themeId: "nord-light" }), "dark").id).toBe("nord-dark");
    expect(activeTheme(settings({ themeId: "nord-light", followApp: false }), "dark").id).toBe(
      "nord-light",
    );
  });

  it("keeps a custom theme without a counterpart and falls back for unknown ids", () => {
    const custom = { ...presetThemes[0]!, id: "c1", name: "Mine" };
    expect(activeTheme(settings({ themeId: "c1", customThemes: [custom] }), "light").id).toBe("c1");
    expect(activeTheme(settings({ themeId: "gone" }), "dark").id).toBe("glass-dark");
  });

  it("makes only Glass transparent by default", () => {
    const glass = presetThemes.find((t) => t.name === GLASS)!;
    const nord = presetThemes.find((t) => t.name === "Nord")!;
    expect(isTransparent(settings(), glass)).toBe(true);
    expect(isTransparent(settings(), nord)).toBe(false);
    expect(isTransparent(settings({ transparent: false }), glass)).toBe(false);
  });

  it("round-trips a theme through export and import", () => {
    const theme = presetThemes.find((t) => t.id === "dracula-dark")!;
    const imported = parseTheme(exportTheme(theme), "x");
    expect(imported).toMatchObject({
      id: "x",
      name: theme.name,
      mode: "dark",
      colors: theme.colors,
      background: theme.background,
    });
  });

  it("fills missing colors and rejects malformed themes", () => {
    const partial = parseTheme(
      JSON.stringify({ name: "Lite", mode: "light", colors: { key: "#ABC" } }),
      "p",
    );
    expect(partial.colors.key).toBe("#aabbcc");
    expect(partial.colors.string).toBe(presetThemes[1]!.colors.string);

    expect(() => parseTheme("nope", "e")).toThrow(/valid JSON/);
    expect(() => parseTheme(JSON.stringify({ name: "A", mode: "dim" }), "e")).toThrow(/mode/);
    expect(() =>
      parseTheme(JSON.stringify({ name: "A", mode: "dark", colors: { key: "red" } }), "e"),
    ).toThrow(/"key"/);
  });

  it("picks names that are not taken", () => {
    expect(uniqueName(settings(), "Fresh")).toBe("Fresh");
    expect(uniqueName(settings(), "Nord")).toBe("Nord 2");
  });
});
