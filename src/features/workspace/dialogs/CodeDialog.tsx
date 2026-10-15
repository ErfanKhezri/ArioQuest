import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/editor/CodeEditor";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Segmented } from "@/components/ui/Tabs";
import { toCurl, toFetch } from "@/core/curl";
import { notify } from "@/store/toasts";
import { useWorkspace } from "@/store/workspace";

export function CodeDialog({ tabId }: { tabId: string }) {
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
      title="Generate code"
      onClose={closeDialog}
      className="max-w-2xl"
      footer={
        <>
          <label className="mr-auto flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={resolve}
              onChange={(e) => setResolve(e.target.checked)}
              className="accent-accent"
            />
            Resolve variables
          </label>
          <Button
            onClick={() =>
              navigator.clipboard.writeText(code).then(
                () => notify.success("Copied to clipboard."),
                () => notify.error("Could not access the clipboard."),
              )
            }
          >
            <Icon name="copy" size={14} /> Copy
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
