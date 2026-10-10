import { useWorkspace } from "@/store/workspace";
import { CodeDialog } from "./CodeDialog";
import { CommandPalette } from "./CommandPalette";
import { EnvironmentDialog } from "./EnvironmentDialog";
import { ImportDialog } from "./ImportDialog";
import { ProtoSetDialog } from "./ProtoSetDialog";
import { RunnerDialog } from "./RunnerDialog";
import { SaveDialog } from "./SaveDialog";

export function DialogHost() {
  const dialog = useWorkspace((s) => s.dialog);
  if (!dialog) return null;

  switch (dialog.type) {
    case "import":
      return <ImportDialog />;
    case "environment":
      return <EnvironmentDialog key={dialog.environmentId} environmentId={dialog.environmentId} />;
    case "code":
      return <CodeDialog tabId={dialog.tabId} />;
    case "save":
      return <SaveDialog key={dialog.tabId} tabId={dialog.tabId} />;
    case "runner":
      return (
        <RunnerDialog
          key={`${dialog.collectionId}:${dialog.folderId ?? ""}`}
          collectionId={dialog.collectionId}
          folderId={dialog.folderId}
        />
      );
    case "palette":
      return <CommandPalette />;
    case "protoSet":
      return (
        <ProtoSetDialog
          key={dialog.protoSetId ?? "new"}
          protoSetId={dialog.protoSetId}
          assignToTabId={dialog.assignToTabId}
        />
      );
  }
}
