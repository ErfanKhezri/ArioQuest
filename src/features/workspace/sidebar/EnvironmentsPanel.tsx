import { IconButton } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { Menu } from "@/components/ui/Menu";
import { exportNative } from "@/core/importers";
import { cn } from "@/lib/cn";
import { confirmAction } from "@/lib/confirm";
import { safeFileName, saveTextFile } from "@/lib/files";
import { notify } from "@/store/toasts";
import { useWorkspace } from "@/store/workspace";
import { SidebarShell } from "./SidebarShell";

export function EnvironmentsPanel() {
  const environments = useWorkspace((s) => s.environments);
  const globals = useWorkspace((s) => s.globals);
  const activeId = useWorkspace((s) => s.activeEnvironmentId);
  const setActive = useWorkspace((s) => s.setActiveEnvironment);
  const openDialog = useWorkspace((s) => s.openDialog);
  const createEnvironment = useWorkspace((s) => s.createEnvironment);
  const duplicateEnvironment = useWorkspace((s) => s.duplicateEnvironment);
  const deleteEnvironment = useWorkspace((s) => s.deleteEnvironment);

  const create = () => {
    const id = createEnvironment(`Environment ${environments.length + 1}`);
    openDialog({ type: "environment", environmentId: id });
  };

  return (
    <SidebarShell
      title="Environments"
      actions={
        <>
          <IconButton icon="import" label="Import" onClick={() => openDialog({ type: "import" })} />
          <IconButton icon="plus" label="New environment" onClick={create} />
        </>
      }
      footer={
        <p className="text-xs text-subtle">
          Reference variables as <code className="font-mono text-fg">{"{{name}}"}</code> in URLs,
          headers, bodies and metadata. The active environment wins over globals.
        </p>
      }
    >
      <div className="px-2">
        <button
          type="button"
          onClick={() => openDialog({ type: "environment", environmentId: "globals" })}
          className="flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-panel-2"
        >
          <Icon name="globe" size={14} className="text-subtle" />
          <span className="flex-1 font-medium">Globals</span>
          <span className="text-xs text-subtle">{globals.length} vars</span>
        </button>

        <h3 className="px-2 pt-3 pb-1 text-xs font-medium text-subtle">Environments</h3>
        {environments.length === 0 && (
          <p className="px-2 py-2 text-xs text-subtle">
            None yet.{" "}
            <button type="button" onClick={create} className="text-accent hover:underline">
              Create one
            </button>{" "}
            for each stage (local, staging, production…).
          </p>
        )}
        <ul>
          {environments.map((env) => {
            const active = env.id === activeId;
            return (
              <li key={env.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openDialog({ type: "environment", environmentId: env.id })}
                  onKeyDown={(e) =>
                    e.key === "Enter" && openDialog({ type: "environment", environmentId: env.id })
                  }
                  className={cn(
                    "group flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-panel-2",
                    active && "",
                  )}
                >
                  <button
                    type="button"
                    title={active ? "Active — click to deactivate" : "Set as active"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActive(active ? null : env.id);
                    }}
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full border",
                      active
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-line hover:border-accent",
                    )}
                  >
                    {active && <Icon name="check" size={10} strokeWidth={3} />}
                  </button>
                  <span className="min-w-0 flex-1 truncate font-medium">{env.name}</span>
                  <span className="text-xs text-subtle group-hover:hidden">
                    {env.variables.length} vars
                  </span>
                  <Menu
                    items={[
                      {
                        label: active ? "Deactivate" : "Set active",
                        icon: "check",
                        onSelect: () => setActive(active ? null : env.id),
                      },
                      {
                        label: "Edit",
                        icon: "edit",
                        onSelect: () => openDialog({ type: "environment", environmentId: env.id }),
                      },
                      {
                        label: "Duplicate",
                        icon: "copy",
                        onSelect: () => duplicateEnvironment(env.id),
                      },
                      {
                        label: "Export",
                        icon: "download",
                        onSelect: async () => {
                          if (
                            await saveTextFile(
                              `${safeFileName(env.name)}.environment.json`,
                              exportNative({ environments: [env] }),
                            )
                          ) {
                            notify.success("Environment exported.");
                          }
                        },
                      },
                      {
                        label: "Delete",
                        icon: "trash",
                        danger: true,
                        separatorBefore: true,
                        onSelect: async () => {
                          if (await confirmAction(`Delete the environment "${env.name}"?`))
                            deleteEnvironment(env.id);
                        },
                      },
                    ]}
                    trigger={({ toggle }) => (
                      <IconButton
                        icon="dots"
                        label="Environment actions"
                        size={14}
                        className="hidden size-6 group-hover:inline-flex"
                        onClick={toggle}
                      />
                    )}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </SidebarShell>
  );
}
