import { Trans, useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const environments = useWorkspace((s) => s.environments);
  const globals = useWorkspace((s) => s.globals);
  const activeId = useWorkspace((s) => s.activeEnvironmentId);
  const setActive = useWorkspace((s) => s.setActiveEnvironment);
  const openDialog = useWorkspace((s) => s.openDialog);
  const createEnvironment = useWorkspace((s) => s.createEnvironment);
  const duplicateEnvironment = useWorkspace((s) => s.duplicateEnvironment);
  const deleteEnvironment = useWorkspace((s) => s.deleteEnvironment);

  const create = () => {
    const id = createEnvironment(t("defaults.environment", { number: environments.length + 1 }));
    openDialog({ type: "environment", environmentId: id });
  };

  return (
    <SidebarShell
      title={t("environments.title")}
      actions={
        <>
          <IconButton
            icon="import"
            label={t("actions.import")}
            onClick={() => openDialog({ type: "import" })}
          />
          <IconButton icon="plus" label={t("environments.new")} onClick={create} />
        </>
      }
      footer={
        <p className="text-xs text-subtle">
          <Trans
            i18nKey="environments.footer"
            values={{ example: "{{name}}" }}
            components={{ code: <code className="font-mono text-fg" /> }}
          />
        </p>
      }
    >
      <div className="px-2">
        <button
          type="button"
          onClick={() => openDialog({ type: "environment", environmentId: "globals" })}
          className="flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-1 text-start text-sm hover:bg-panel-2"
        >
          <Icon name="globe" size={14} className="text-subtle" />
          <span className="flex-1 font-medium">{t("defaults.globals")}</span>
          <span className="text-xs text-subtle">
            {t("environments.variableCount", { count: globals.length })}
          </span>
        </button>

        <h3 className="px-2 pt-3 pb-1 text-xs font-medium text-subtle">
          {t("environments.title")}
        </h3>
        {environments.length === 0 && (
          <p className="px-2 py-2 text-xs text-subtle">
            <Trans
              i18nKey="environments.noneYet"
              components={{
                create: (
                  <button type="button" onClick={create} className="text-accent hover:underline" />
                ),
              }}
            />
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
                    title={active ? t("environments.activeTitle") : t("environments.setAsActive")}
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
                    {t("environments.variableCount", { count: env.variables.length })}
                  </span>
                  <Menu
                    items={[
                      {
                        label: active ? t("environments.deactivate") : t("environments.setActive"),
                        icon: "check",
                        onSelect: () => setActive(active ? null : env.id),
                      },
                      {
                        label: t("actions.edit"),
                        icon: "edit",
                        onSelect: () => openDialog({ type: "environment", environmentId: env.id }),
                      },
                      {
                        label: t("actions.duplicate"),
                        icon: "copy",
                        onSelect: () => duplicateEnvironment(env.id),
                      },
                      {
                        label: t("actions.export"),
                        icon: "download",
                        onSelect: async () => {
                          if (
                            await saveTextFile(
                              `${safeFileName(env.name)}.environment.json`,
                              exportNative({ environments: [env] }),
                            )
                          ) {
                            notify.success(t("environments.exported"));
                          }
                        },
                      },
                      {
                        label: t("actions.delete"),
                        icon: "trash",
                        danger: true,
                        separatorBefore: true,
                        onSelect: async () => {
                          if (
                            await confirmAction(t("environments.deleteConfirm", { name: env.name }))
                          )
                            deleteEnvironment(env.id);
                        },
                      },
                    ]}
                    trigger={({ toggle }) => (
                      <IconButton
                        icon="dots"
                        label={t("environments.actions")}
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
