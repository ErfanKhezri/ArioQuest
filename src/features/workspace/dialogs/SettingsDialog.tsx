import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  uniqueName,
} from "@/components/editor/themes";
import { Button } from "@/components/ui/Button";
import { Field, IconButton, Input, Select, Toggle } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Tabs";
import { LANGUAGES, type Language } from "@/i18n/language";
import { useLanguage } from "@/i18n/useLanguage";
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
  const { t } = useTranslation();
  const [text, setText] = useState(value);
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setText(value);
  }
  return (
    <Input
      value={text}
      aria-label={t("settings.hexColor")}
      spellCheck={false}
      dir="ltr"
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
        "flex flex-col gap-1.5 rounded-md border p-1.5 text-start focus-visible:outline-2 focus-visible:outline-accent",
        selected ? "border-accent" : "border-line hover:border-subtle",
      )}
    >
      <span
        dir="ltr"
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
  const { t } = useTranslation();
  const [language, setLanguage] = useLanguage();
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
      name: uniqueName(settings, t("settings.customCopy", { name: draft.name })),
      basedOn: basePreset.id,
    };
    setEdits(null);
    setCustomThemes([...settings.customThemes, theme], { themeId: theme.id });
    notify.success(t("settings.savedTheme", { name: theme.name }));
  };

  const saveChanges = () => {
    setCustomThemes(settings.customThemes.map((t) => (t.id === active.id ? draft : t)));
    setEdits(null);
  };

  const rename = (name: string) =>
    setCustomThemes(settings.customThemes.map((t) => (t.id === active.id ? { ...t, name } : t)));

  const remove = async () => {
    if (!(await confirmAction(t("settings.deleteConfirm", { name: active.name })))) return;
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
      (err: unknown) => notify.error(t("settings.exportFailed", { error: String(err) })),
    );

  const importFile = async () => {
    const [file] = await pickFiles({ accept: ".json,application/json" });
    if (!file) return;
    try {
      const theme = parseTheme(await file.text(), uid("theme"));
      theme.name = uniqueName(settings, theme.name);
      setCustomThemes([...settings.customThemes, theme], { themeId: theme.id });
      notify.success(t("settings.importedTheme", { name: theme.name }));
    } catch (err) {
      notify.error(err instanceof Error ? err.message : String(err));
    }
  };

  const transparent = isTransparent(settings, active);
  const modeName = (m: "dark" | "light") =>
    m === "dark" ? t("settings.dark") : t("settings.light");

  return (
    <Modal title={t("settings.title")} onClose={closeDialog} className="max-w-4xl">
      <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-line pb-4">
            <span className="text-sm">{t("language.title")}</span>
            <Segmented
              value={language}
              onChange={setLanguage}
              options={(Object.keys(LANGUAGES) as Language[]).map((value) => ({
                value,
                label: LANGUAGES[value].label,
              }))}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium text-muted">{t("settings.editorTheme")}</h3>
              <Button variant="ghost" size="sm" onClick={() => void importFile()}>
                <Icon name="upload" size={12} /> {t("actions.import")}
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
            <span className="text-sm">{t("settings.variant")}</span>
            {settings.followApp ? (
              <span className="text-xs text-subtle">
                {t("settings.followingApp", { mode: modeName(appMode) })}
              </span>
            ) : (
              <Segmented
                value={active.mode}
                onChange={(m) => select(themeByName(settings, active.name, m))}
                options={[
                  { value: "dark", label: t("settings.dark") },
                  { value: "light", label: t("settings.light") },
                ]}
              />
            )}
          </div>

          <div className="divide-y divide-line border-y border-line">
            <Toggle
              label={t("settings.followApp")}
              description={t("settings.followAppHint")}
              checked={settings.followApp}
              onChange={(followApp) => update({ followApp, themeId: active.id })}
            />
            <Toggle
              label={t("settings.transparent")}
              description={
                active.mode === appMode
                  ? t("settings.transparentHint")
                  : t("settings.transparentOff")
              }
              checked={transparent}
              onChange={(value) => update({ transparent: value })}
            />
            <Toggle
              label={t("settings.rainbowBrackets")}
              description={t("settings.rainbowBracketsHint")}
              checked={settings.rainbowBrackets}
              onChange={(rainbowBrackets) => update({ rainbowBrackets })}
            />
          </div>

          <Field label={t("settings.fontFamily")}>
            <Select
              className="w-full"
              value={settings.fontFamily}
              onChange={(e) => update({ fontFamily: e.target.value })}
              options={monospaceFonts.map((f) => ({
                value: f,
                label: f === "System monospace" ? t("settings.systemMonospace") : f,
              }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("settings.fontSize")}>
              <Select
                className="w-full"
                value={String(settings.fontSize)}
                onChange={(e) => update({ fontSize: Number(e.target.value) })}
                options={fontSizes.map((n) => ({ value: String(n), label: `${n}px` }))}
              />
            </Field>
            <Field label={t("settings.lineHeight")}>
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
                aria-label={t("settings.themeName")}
                value={active.name}
                onChange={(e) => rename(e.target.value)}
                onBlur={(e) =>
                  !e.target.value.trim() && rename(uniqueName(settings, t("settings.untitled")))
                }
                className="w-48"
              />
            ) : (
              <h3 className="text-sm font-medium">
                {t("settings.customize", { name: active.name })}
              </h3>
            )}
            <span className="text-xs text-subtle">{modeName(draft.mode)}</span>
            <span className="ms-auto flex items-center">
              <IconButton
                icon="download"
                label={t("settings.exportTheme")}
                onClick={exportCurrent}
              />
              {isCustom && (
                <IconButton
                  icon="trash"
                  label={t("settings.deleteTheme")}
                  tone="danger"
                  onClick={() => void remove()}
                />
              )}
            </span>
          </div>

          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            <ColorRow
              label={t("settings.background")}
              value={draft.background}
              onChange={(background) => edit({ background })}
            />
            {tokenKeys.map((key) => (
              <ColorRow
                key={key}
                label={t(`settings.tokens.${key}`)}
                value={draft.colors[key]}
                onChange={(hex) => edit({ colors: { ...draft.colors, [key]: hex } })}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={saveAsNew}>
              <Icon name="plus" size={12} /> {t("settings.saveAsNew")}
            </Button>
            {isCustom && (
              <Button size="sm" onClick={saveChanges} disabled={!dirty}>
                <Icon name="save" size={12} /> {t("settings.saveChanges")}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToPreset}
              disabled={!isCustom && !dirty}
              title={t("settings.resetTitle", {
                name: basePreset.name,
                mode: modeName(basePreset.mode),
              })}
            >
              <Icon name="refresh" size={12} /> {t("settings.resetToPreset")}
            </Button>
            {dirty && !isCustom && (
              <span className="text-xs text-subtle">{t("settings.presetsReadOnly")}</span>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs text-muted">{t("settings.preview")}</span>
              <Segmented
                value={sample}
                onChange={setSample}
                options={[
                  { value: "json", label: "JSON" },
                  { value: "script", label: t("settings.script") },
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
