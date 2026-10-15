import { Button } from "@/components/ui/Button";
import { Menu } from "@/components/ui/Menu";
import { IconButton } from "@/components/ui/controls";
import { type Tab, useWorkspace } from "@/store/workspace";
import { notify } from "@/store/toasts";

/** Send / Cancel plus a menu for the less frequent actions. */
export function SendControls({ tab }: { tab: Tab }) {
  const running = useWorkspace((s) => Boolean(s.running[tab.id]));
  const sendTab = useWorkspace((s) => s.sendTab);
  const cancelTab = useWorkspace((s) => s.cancelTab);
  const saveTab = useWorkspace((s) => s.saveTab);
  const openDialog = useWorkspace((s) => s.openDialog);
  const duplicateTab = useWorkspace((s) => s.duplicateTab);

  return (
    <div className="flex shrink-0 items-center gap-1">
      {running ? (
        <Button variant="secondary" className="w-20" onClick={() => cancelTab(tab.id)}>
          Cancel
        </Button>
      ) : (
        <Button className="w-20" onClick={() => void sendTab(tab.id)} title="Send (Ctrl+Enter)">
          Send
        </Button>
      )}
      <Menu
        items={[
          {
            label: "Save  (Ctrl+S)",
            icon: "save",
            onSelect: () => saveTab(tab.id) && notify.success("Saved."),
          },
          {
            label: "Save as…",
            icon: "save",
            onSelect: () => openDialog({ type: "save", tabId: tab.id }),
          },
          ...(tab.request.kind === "http"
            ? [
                {
                  label: "Generate code",
                  icon: "code" as const,
                  onSelect: () => openDialog({ type: "code", tabId: tab.id }),
                },
              ]
            : []),
          { label: "Duplicate", icon: "copy", onSelect: () => duplicateTab(tab.id) },
        ]}
        trigger={({ toggle }) => <IconButton icon="dots" label="More actions" onClick={toggle} />}
      />
    </div>
  );
}
