import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { ErrorNote } from "@/components/ui/controls";
import { Segmented } from "@/components/ui/Tabs";
import { looksLikeCurl, parseCurl } from "@/core/curl";
import { importJson, type ImportResult } from "@/core/importers";
import { countRequests } from "@/core/tree";
import { t } from "@/i18n";
import { pickFiles } from "@/lib/files";
import { notify } from "@/store/toasts";
import { useWorkspace } from "@/store/workspace";

type Mode = "file" | "curl" | "text";

function summarize(result: ImportResult): string {
  const parts: string[] = [];
  for (const c of result.collections) {
    parts.push(t("import.summary.collection", { name: c.name, count: countRequests(c.items) }));
  }
  if (result.environments.length)
    parts.push(t("import.summary.environments", { count: result.environments.length }));
  if (result.protoSets.length)
    parts.push(t("import.summary.protoSets", { count: result.protoSets.length }));
  if (result.globals?.length)
    parts.push(t("import.summary.globals", { count: result.globals.length }));
  return parts.join(t("listSeparator")) || t("import.summary.nothing");
}

export function ImportDialog() {
  const { t } = useTranslation();
  const closeDialog = useWorkspace((s) => s.closeDialog);
  const importData = useWorkspace((s) => s.importData);
  const newTab = useWorkspace((s) => s.newTab);
  const showSection = useWorkspace((s) => s.showSection);
  const [mode, setMode] = useState<Mode>("file");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const apply = (result: ImportResult) => {
    importData(result);
    notify.success(t("import.imported", { summary: summarize(result) }));
    showSection(result.collections.length ? "collections" : "environments");
    closeDialog();
  };

  const importText = (raw: string) => {
    setError(null);
    try {
      if (looksLikeCurl(raw)) {
        newTab("http", parseCurl(raw));
        notify.success(t("import.curlOpened"));
        closeDialog();
        return;
      }
      apply(importJson(raw));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const chooseFiles = async () => {
    const files = await pickFiles({ accept: ".json,application/json", multiple: true });
    if (files.length === 0) return;
    const merged: ImportResult = { collections: [], environments: [], protoSets: [] };
    try {
      for (const file of files) {
        const result = importJson(await file.text());
        merged.collections.push(...result.collections);
        merged.environments.push(...result.environments);
        merged.protoSets.push(...result.protoSets);
        if (result.globals) merged.globals = [...(merged.globals ?? []), ...result.globals];
      }
      apply(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Modal
      title={t("import.title")}
      onClose={closeDialog}
      className="max-w-xl"
      footer={
        mode !== "file" && (
          <>
            <Button variant="ghost" onClick={closeDialog}>
              {t("actions.cancel")}
            </Button>
            <Button onClick={() => importText(text)} disabled={!text.trim()}>
              {t("actions.import")}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4 p-5">
        <Segmented
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
          }}
          options={[
            { value: "file", label: t("import.modes.file") },
            { value: "curl", label: "cURL" },
            { value: "text", label: t("import.modes.text") },
          ]}
        />

        {mode === "file" && (
          <button
            type="button"
            onClick={() => void chooseFiles()}
            className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-line px-6 py-10 text-center hover:border-accent/50 hover:bg-panel-2"
          >
            <Icon name="upload" size={20} className="text-subtle" />
            <span className="text-sm font-medium">{t("import.chooseFiles")}</span>
            <span className="text-xs text-muted">{t("import.supported")}</span>
          </button>
        )}

        {mode !== "file" && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            dir="ltr"
            rows={10}
            placeholder={
              mode === "curl"
                ? "curl -X POST https://api.example.com/v1/items \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"name\":\"x\"}'"
                : '{ "info": { "name": "My API", "schema": "…/collection/v2.1.0/collection.json" }, "item": [] }'
            }
            className="w-full resize-y rounded-md border border-line bg-panel-2/40 p-3 font-mono text-xs outline-none focus:border-accent/60"
          />
        )}

        {error && <ErrorNote>{error}</ErrorNote>}

        <p className="text-xs text-subtle">{t("import.tip")}</p>
      </div>
    </Modal>
  );
}
