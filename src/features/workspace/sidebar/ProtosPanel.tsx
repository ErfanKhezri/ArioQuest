import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { EmptyState, IconButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { useWorkspace } from "@/store/workspace";
import { SidebarShell } from "./SidebarShell";

export function ProtosPanel() {
  const { t } = useTranslation();
  const protoSets = useWorkspace((s) => s.protoSets);
  const openDialog = useWorkspace((s) => s.openDialog);
  const newTab = useWorkspace((s) => s.newTab);

  return (
    <SidebarShell
      title={t("protos.title")}
      actions={
        <IconButton
          icon="plus"
          label={t("palette.importProtos")}
          onClick={() => openDialog({ type: "protoSet" })}
        />
      }
      footer={
        <Button variant="secondary" size="sm" className="w-full" onClick={() => newTab("grpc")}>
          <Icon name="server" size={13} /> {t("protos.newGrpc")}
        </Button>
      }
    >
      {protoSets.length === 0 ? (
        <EmptyState title={t("protos.emptyTitle")} mood="curious">
          <Trans i18nKey="protos.emptyBody" components={{ code: <code className="font-mono" /> }} />
          <div className="mt-3">
            <button
              type="button"
              onClick={() => openDialog({ type: "protoSet" })}
              className="font-medium text-accent hover:underline"
            >
              {t("palette.importProtos")}
            </button>
          </div>
        </EmptyState>
      ) : (
        <ul className="px-1">
          {protoSets.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => openDialog({ type: "protoSet", protoSetId: p.id })}
                className="flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-1 text-start text-sm hover:bg-panel-2"
              >
                <Icon name="layers" size={14} className="shrink-0 text-fg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-subtle">
                    {t("protos.fileCount", { count: p.files.length })} ·{" "}
                    {p.files.map((f) => f.path.split("/").pop()).join(", ")}
                  </span>
                </span>
                <Icon name="chevronRight" size={13} className="text-subtle" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </SidebarShell>
  );
}
