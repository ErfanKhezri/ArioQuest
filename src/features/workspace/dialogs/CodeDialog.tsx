import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Tabs";
import { toCurl, toFetch } from "@/core/curl";
import { notify } from "@/store/toasts";
import { useWorkspace } from "@/store/workspace";

export function CodeDialog({ tabId }: { tabId: string }) {
  const { t } = useTranslation();
  const closeDialog = useWorkspace((s) => s.closeDialog);
  const request = useWorkspace((s) => s.tabs.find((t) => t.id === tabId)?.request);
  const resolveVariable = useWorkspace((s) => s.resolveVariable);
  const [lang, setLang] = useState<"curl" | "fetch">("curl");
  const [resolve, setResolve] = useState(true);

  const code = useMemo(() => {
    if (request?.kind !== "http") return "";
    const resolver = resolve ? (name: string) => resolveVariable(name)?.value : () => undefined;
    try {
      return lang === "curl" ? toCurl(request, resolver) : toFetch(request, resolver);
    } catch (err) {
      return `// ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [request, lang, resolve, resolveVariable]);

  return (
    <Modal
      title={t("code.title")}
      onClose={closeDialog}
      className="max-w-2xl"
      footer={
        <>
          <label className="me-auto flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={resolve}
              onChange={(e) => setResolve(e.target.checked)}
              className="accent-accent"
            />
            {t("code.resolveVariables")}
          </label>
          <Button
            onClick={() =>
              navigator.clipboard.writeText(code).then(
                () => notify.success(t("notices.copied")),
                () => notify.error(t("notices.clipboardFailed")),
              )
            }
          >
            <Icon name="copy" size={14} /> {t("actions.copy")}
          </Button>
        </>
      }
    >
      <div className="space-y-3 p-5">
        <Segmented
          value={lang}
          onChange={setLang}
          options={[
            { value: "curl", label: "cURL" },
            { value: "fetch", label: "JavaScript fetch" },
          ]}
        />
        <div className="h-72 overflow-hidden rounded-md border border-line bg-panel-2/40">
          <CodeEditor
            value={code}
            readOnly
            language={lang === "fetch" ? "javascript" : "text"}
            wrap
            lineNumbers={false}
          />
        </div>
      </div>
    </Modal>
  );
}
