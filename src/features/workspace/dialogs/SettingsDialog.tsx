import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { themeExtension } from "@/components/editor/themeExtension";
import {
  activeTheme,
  DEFAULT_THEME_ID,
  type EditorSettings,
  type EditorTheme,
  exportTheme,
  isTransparent,
  monospaceFonts,
  normalizeHex,
  parseTheme,
  presetThemes,
  themeByName,
  themeNames,
  tokenKeys,
  tokenLabels,
  uniqueName,
} from "@/components/editor/themes";
import { Button } from "@/components/ui/Button";
import { Field, IconButton, Input, Select, Toggle } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Tabs";
import { useAppMode } from "@/lib/appTheme";
import { cn } from "@/lib/cn";
import { confirmAction } from "@/lib/confirm";
import { pickFiles, safeFileName, saveTextFile } from "@/lib/files";
import { uid } from "@/lib/id";
import { notify } from "@/store/toasts";
import { useWorkspace } from "@/store/workspace";

const sampleJson = `{
  "id": 4821,
  "name": "Ario",
  "active": true,
  "score": 98.6,
  "manager": null,
  "tags": ["api", "grpc", "rest"],
  "address": {
    "city": "Tehran",
    "geo": { "lat": 35.6892, "lng": 51.389 },
    "verified": false
  },
  "orders": [
    { "sku": "AQ-1", "qty": 2, "items": [[1, 2], [3]] },
    { "sku": "AQ-2", "qty": 0, "notes": null }
  ]
}`;

const sampleScript = `// Runs after the response arrives
const body = response.json();
if (body.active === true && body.score > 50) {
  test("user is active", () => {
    expect(body.tags).toContain("api");
  });
}
/* Save the id for the next request */
environment.set("userId", String(body.id ?? null));`;

const fontSizes = [10, 11, 12, 13, 14, 15, 16, 18, 20];
const lineHeights = [1.2, 1.4, 1.5, 1.6, 1.8, 2];

/** Hex text field that only commits complete colors, so typing "#ab" is not rejected. */
function HexInput({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [text, setText] = useState(value);
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setText(value);
  }
  return (
    <Input
      value={text}
      aria-label="Hex color"
      spellCheck={false}
      className={cn("w-20 font-mono text-xs", !normalizeHex(text) && "border-danger")}
      onChange={(e) => {
        setText(e.target.value);
        const hex = normalizeHex(e.target.value);
        if (hex) onChange(hex);
      }}
      onBlur={() => setText(value)}
    />
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="size-7 shrink-0 cursor-pointer rounded-md border border-line bg-panel p-0.5"
      />
      <span className="min-w-0 flex-1 truncate text-xs text-muted">{label}</span>
      <HexInput value={value} onChange={onChange} />
    </div>
  );
}

function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: EditorTheme;
  selected: boolean;
  onSelect: () => void;
}) {
  const c = theme.colors;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col gap-1.5 rounded-md border p-1.5 text-left focus-visible:outline-2 focus-visible:outline-accent",
        selected ? "border-accent" : "border-line hover:border-subtle",
      )}
    >
      <span
        className="flex h-6 items-center gap-1 rounded-sm px-1.5 font-mono text-2xs"
        style={{ backgroundColor: theme.background }}
      >
        <span style={{ color: c.punctuation }}>{"{"}</span>
        <span style={{ color: c.key }}>key</span>
        <span style={{ color: c.string }}>"s"</span>
        <span style={{ color: c.number }}>1</span>
        <span style={{ color: c.boolean }}>true</span>
      </span>
      <span className="truncate text-xs">{theme.name}</span>
    </button>
  );
}

export function SettingsDialog() {
  const closeDialog = useWorkspace((s) => s.closeDialog);
  const settings = useWorkspace((s) => s.editorSettings);
  const update = useWorkspace((s) => s.updateEditorSettings);
  const appMode = useAppMode();
  const active = activeTheme(settings, appMode);
  const isCustom = settings.customThemes.some((t) => t.id === active.id);

  // Unsaved color edits, kept only while the same theme stays selected.
  const [edits, setEdits] = useState<{ forId: string; theme: EditorTheme } | null>(null);
  const draft = edits?.forId === active.id ? edits.theme : active;
  const dirty = draft !== active;
  const [sample, setSample] = useState<"json" | "script">("json");

  const edit = (patch: Partial<EditorTheme>) =>
    setEdits({ forId: active.id, theme: { ...draft, ...patch } });

  const previewTheme = useMemo(
    () => themeExtension(draft, settings, appMode),
    [draft, settings, appMode],
  );

  const mode = settings.followApp ? appMode : active.mode;
  const select = (theme: EditorTheme) => update({ themeId: theme.id });
  const setCustomThemes = (customThemes: EditorTheme[], patch: Partial<EditorSettings> = {}) =>
    update({ customThemes, ...patch });

  const basePreset =
    presetThemes.find((t) => t.id === (draft.basedOn ?? draft.id)) ??
    presetThemes.find((t) => t.mode === draft.mode)!;

  const saveAsNew = () => {
    const theme: EditorTheme = {
      ...draft,
      id: uid("theme"),
      name: uniqueName(settings, `${draft.name} Custom`),
      basedOn: basePreset.id,
    };
    setEdits(null);
    setCustomThemes([...settings.customThemes, theme], { themeId: theme.id });
    notify.success(`Saved "${theme.name}".`);
  };

  const saveChanges = () => {
    setCustomThemes(settings.customThemes.map((t) => (t.id === active.id ? draft : t)));
    setEdits(null);
  };

  const rename = (name: string) =>
    setCustomThemes(settings.customThemes.map((t) => (t.id === active.id ? { ...t, name } : t)));

  const remove = async () => {
    if (!(await confirmAction(`Delete the theme "${active.name}"?`))) return;
    setEdits(null);
    setCustomThemes(
      settings.customThemes.filter((t) => t.id !== active.id),
      { themeId: active.basedOn ?? DEFAULT_THEME_ID },
    );
  };

  const resetToPreset = () =>
    isCustom
      ? edit({ colors: basePreset.colors, background: basePreset.background })
      : setEdits(null);

  const exportCurrent = () =>
    void saveTextFile(`${safeFileName(draft.name)}.theme.json`, exportTheme(draft)).catch(
      (err: unknown) => notify.error(`Could not export the theme: ${String(err)}`),
    );

  const importFile = async () => {
    const [file] = await pickFiles({ accept: ".json,application/json" });
    if (!file) return;
    try {
      const theme = parseTheme(await file.text(), uid("theme"));
      theme.name = uniqueName(settings, theme.name);
      setCustomThemes([...settings.customThemes, theme], { themeId: theme.id });
      notify.success(`Imported "${theme.name}".`);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : String(err));
    }
  };

  const transparent = isTransparent(settings, active);

  return (
    <Modal title="Settings" onClose={closeDialog} className="max-w-4xl">
      <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <section className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium text-muted">Editor theme</h3>
              <Button variant="ghost" size="sm" onClick={() => void importFile()}>
                <Icon name="upload" size={12} /> Import
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {themeNames(settings).map((name) => {
                const theme = themeByName(settings, name, mode);
                return (
                  <ThemeCard
                    key={name}
                    theme={theme}
                    selected={active.name === name}
                    onSelect={() => select(theme)}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-sm">Variant</span>
            {settings.followApp ? (
              <span className="text-xs text-subtle">
                Following the app ({appMode === "dark" ? "Dark" : "Light"})
              </span>
            ) : (
              <Segmented
                value={active.mode}
                onChange={(m) => select(themeByName(settings, active.name, m))}
                options={[
                  { value: "dark", label: "Dark" },
                  { value: "light", label: "Light" },
                ]}
              />
            )}
          </div>

          <div className="divide-y divide-line border-y border-line">
            <Toggle
              label="Follow app theme"
              description="Use the dark or light variant to match the app."
              checked={settings.followApp}
              onChange={(followApp) => update({ followApp, themeId: active.id })}
            />
            <Toggle
              label="Transparent background"
              description={
                active.mode === appMode
                  ? "Let the panel behind the editor show through."
                  : "Off while the theme and app modes differ, to keep text readable."
              }
              checked={transparent}
              onChange={(value) => update({ transparent: value })}
            />
            <Toggle
              label="Rainbow brackets"
              description="Color bracket pairs by nesting depth."
              checked={settings.rainbowBrackets}
              onChange={(rainbowBrackets) => update({ rainbowBrackets })}
            />
          </div>

          <Field label="Font family">
            <Select
              className="w-full"
              value={settings.fontFamily}
              onChange={(e) => update({ fontFamily: e.target.value })}
              options={monospaceFonts.map((f) => ({ value: f, label: f }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Font size">
              <Select
                className="w-full"
                value={String(settings.fontSize)}
                onChange={(e) => update({ fontSize: Number(e.target.value) })}
                options={fontSizes.map((n) => ({ value: String(n), label: `${n}px` }))}
              />
            </Field>
            <Field label="Line height">
              <Select
                className="w-full"
                value={String(settings.lineHeight)}
                onChange={(e) => update({ lineHeight: Number(e.target.value) })}
                options={lineHeights.map((n) => ({ value: String(n), label: n.toFixed(1) }))}
              />
            </Field>
          </div>
        </section>

        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {isCustom ? (
              <Input
                aria-label="Theme name"
                value={active.name}
                onChange={(e) => rename(e.target.value)}
                onBlur={(e) => !e.target.value.trim() && rename(uniqueName(settings, "Untitled"))}
                className="w-48"
              />
            ) : (
              <h3 className="text-sm font-medium">Customize {active.name}</h3>
            )}
            <span className="text-xs text-subtle">{draft.mode === "dark" ? "Dark" : "Light"}</span>
            <span className="ml-auto flex items-center">
              <IconButton icon="download" label="Export theme" onClick={exportCurrent} />
              {isCustom && (
                <IconButton
                  icon="trash"
                  label="Delete theme"
                  tone="danger"
                  onClick={() => void remove()}
                />
              )}
            </span>
          </div>

          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            <ColorRow
              label="Background"
              value={draft.background}
              onChange={(background) => edit({ background })}
            />
            {tokenKeys.map((key) => (
              <ColorRow
                key={key}
                label={tokenLabels[key]}
                value={draft.colors[key]}
                onChange={(hex) => edit({ colors: { ...draft.colors, [key]: hex } })}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={saveAsNew}>
              <Icon name="plus" size={12} /> Save as new theme
            </Button>
            {isCustom && (
              <Button size="sm" onClick={saveChanges} disabled={!dirty}>
                <Icon name="save" size={12} /> Save changes
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToPreset}
              disabled={!isCustom && !dirty}
              title={`Reset colors to ${basePreset.name} (${basePreset.mode})`}
            >
              <Icon name="refresh" size={12} /> Reset to preset
            </Button>
            {dirty && !isCustom && (
              <span className="text-xs text-subtle">Presets can't be changed; save a copy.</span>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs text-muted">Preview</span>
              <Segmented
                value={sample}
                onChange={setSample}
                options={[
                  { value: "json", label: "JSON" },
                  { value: "script", label: "Script" },
                ]}
              />
            </div>
            <div className="h-72 overflow-hidden rounded-md border border-line">
              <CodeEditor
                value={sample === "json" ? sampleJson : sampleScript}
                language={sample === "json" ? "json" : "javascript"}
                readOnly
                themeOverride={previewTheme}
              />
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
}
