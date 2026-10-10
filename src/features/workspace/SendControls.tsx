import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Menu } from "@/components/ui/Menu";
import { IconButton } from "@/components/ui/controls";
import { isTabDirty, type Tab, useWorkspace } from "@/store/workspace";
import { notify } from "@/store/toasts";

/** Send / cancel, save and overflow actions shown next to the URL or target. */
export function SendControls({ tab }: { tab: Tab }) {
  const running = useWorkspace((s) => Boolean(s.running[tab.id]));
  const sendTab = useWorkspace((s) => s.sendTab);
  const cancelTab = useWorkspace((s) => s.cancelTab);
  const saveTab = useWorkspace((s) => s.saveTab);
  const openDialog = useWorkspace((s) => s.openDialog);
  const duplicateTab = useWorkspace((s) => s.duplicateTab);
  const dirty = isTabDirty(tab);

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {running ? (
        <Button variant="secondary" className="w-24" onClick={() => cancelTab(tab.id)}>
          <Icon name="stop" size={13} /> Cancel
        </Button>
      ) : (
        <Button className="w-24" onClick={() => void sendTab(tab.id)} title="Send (Ctrl+Enter)">
          <Icon name="send" size={14} /> Send
        </Button>
      )}
      <Button
        variant="secondary"
        onClick={() => {
          if (saveTab(tab.id)) notify.success("Saved.");
        }}
        title="Save (Ctrl+S)"
        className="relative"
      >
        <Icon name="save" size={14} />
        Save
        {dirty && tab.origin && (
          <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-amber-500" />
        )}
      </Button>
      {tab.request.kind === "http" && (
        <IconButton
          icon="code"
          label="Generate code"
          onClick={() => openDialog({ type: "code", tabId: tab.id })}
          className="size-9"
        />
      )}
      <Menu
        items={[
          {
            label: "Save as…",
            icon: "save",
            onSelect: () => openDialog({ type: "save", tabId: tab.id }),
          },
          { label: "Duplicate tab", icon: "copy", onSelect: () => duplicateTab(tab.id) },
        ]}
        trigger={({ toggle }) => (
          <IconButton icon="dots" label="More actions" onClick={toggle} className="size-9" />
        )}
      />
    </div>
  );
}
