import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { ErrorNote } from "@/components/ui/controls";
import { Segmented } from "@/components/ui/Tabs";
import { looksLikeCurl, parseCurl } from "@/core/curl";
import { importJson, type ImportResult } from "@/core/importers";
import { countRequests } from "@/core/tree";
import { pickFiles } from "@/lib/files";
import { notify } from "@/store/toasts";
import { useWorkspace } from "@/store/workspace";

type Mode = "file" | "curl" | "text";

function summarize(result: ImportResult): string {
  const parts: string[] = [];
  for (const c of result.collections)
    parts.push(`collection "${c.name}" (${countRequests(c.items)} requests)`);
  if (result.environments.length) parts.push(`${result.environments.length} environment(s)`);
  if (result.protoSets.length) parts.push(`${result.protoSets.length} proto set(s)`);
  if (result.globals?.length) parts.push(`${result.globals.length} global variable(s)`);
  return parts.join(", ") || "nothing";
}

export function ImportDialog() {
  const closeDialog = useWorkspace((s) => s.closeDialog);
  const importData = useWorkspace((s) => s.importData);
  const newTab = useWorkspace((s) => s.newTab);
  const showSection = useWorkspace((s) => s.showSection);
  const [mode, setMode] = useState<Mode>("file");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const apply = (result: ImportResult) => {
    importData(result);
    notify.success(`Imported ${summarize(result)}.`);
    showSection(result.collections.length ? "collections" : "environments");
    closeDialog();
  };

  const importText = (raw: string) => {
    setError(null);
    try {
      if (looksLikeCurl(raw)) {
        newTab("http", parseCurl(raw));
        notify.success("Opened the cURL command as a new request.");
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
      title="Import"
      onClose={closeDialog}
      className="max-w-xl"
      footer={
        mode !== "file" && (
          <>
            <Button variant="ghost" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={() => importText(text)} disabled={!text.trim()}>
              Import
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
            { value: "file", label: "File" },
            { value: "curl", label: "cURL" },
            { value: "text", label: "Paste JSON" },
          ]}
        />

        {mode === "file" && (
          <button
            type="button"
            onClick={() => void chooseFiles()}
            className="flex w-full flex-col items-center gap-2 rounded-md border border-dashed border-line px-6 py-10 text-center hover:border-accent/50 hover:bg-panel-2"
          >
            <Icon name="upload" size={20} className="text-subtle" />
            <span className="text-sm font-medium">Choose files to import</span>
            <span className="text-xs text-muted">
              Postman collections (v2.0 / v2.1), Postman environments and ArioQuest exports
            </span>
          </button>
        )}

        {mode !== "file" && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
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

        <p className="text-xs text-subtle">
          Tip: paste a cURL command straight into a request's URL bar to convert it.
        </p>
      </div>
    </Modal>
  );
}
