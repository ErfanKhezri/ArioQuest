import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import { KeyValueEditor } from "@/components/ui/KeyValueEditor";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/controls";
import { useWorkspace } from "@/store/workspace";

export function EnvironmentDialog({ environmentId }: { environmentId: string | "globals" }) {
  const { t } = useTranslation();
  const closeDialog = useWorkspace((s) => s.closeDialog);
  const environment = useWorkspace((s) => s.environments.find((e) => e.id === environmentId));
  const globals = useWorkspace((s) => s.globals);
  const activeId = useWorkspace((s) => s.activeEnvironmentId);
  const updateEnvironment = useWorkspace((s) => s.updateEnvironment);
  const setGlobals = useWorkspace((s) => s.setGlobals);
  const setActive = useWorkspace((s) => s.setActiveEnvironment);

  const isGlobals = environmentId === "globals";
  if (!isGlobals && !environment) return null;

  return (
    <Modal
      title={isGlobals ? t("environment.globalsTitle") : t("environment.editTitle")}
      onClose={closeDialog}
      className="max-w-3xl"
      footer={
        <>
          {environment && environment.id !== activeId && (
            <Button
              variant="secondary"
              className="me-auto"
              onClick={() => setActive(environment.id)}
            >
              {t("environment.setActive")}
            </Button>
          )}
          <Button onClick={closeDialog}>{t("actions.done")}</Button>
        </>
      }
    >
      <div className="pt-4">
        {environment && (
          <div className="px-4 pb-2">
            <Input
              value={environment.name}
              onChange={(e) => updateEnvironment(environment.id, { name: e.target.value })}
              aria-label={t("environment.name")}
              className="h-9 text-sm font-medium"
            />
          </div>
        )}
        <p className="px-4 text-xs text-subtle">
          {isGlobals ? t("environment.globalsHint") : t("environment.hint")}
        </p>
        <KeyValueEditor
          rows={isGlobals ? globals : (environment?.variables ?? [])}
          onChange={(variables) =>
            isGlobals
              ? setGlobals(variables)
              : environment && updateEnvironment(environment.id, { variables })
          }
          keyPlaceholder={t("environment.variable")}
          secret
          showDescription
        />
      </div>
    </Modal>
  );
}
