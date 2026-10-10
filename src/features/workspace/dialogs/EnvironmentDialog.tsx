import { Button } from "@/components/ui/Button";
import { KeyValueEditor } from "@/components/ui/KeyValueEditor";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/controls";
import { useWorkspace } from "@/store/workspace";

export function EnvironmentDialog({ environmentId }: { environmentId: string | "globals" }) {
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
      title={isGlobals ? "Global variables" : "Edit environment"}
      onClose={closeDialog}
      className="max-w-3xl"
      footer={
        <>
          {environment && environment.id !== activeId && (
            <Button
              variant="secondary"
              className="mr-auto"
              onClick={() => setActive(environment.id)}
            >
              Set as active
            </Button>
          )}
          <Button onClick={closeDialog}>Done</Button>
        </>
      }
    >
      <div className="pt-4">
        {environment && (
          <div className="px-4 pb-2">
            <Input
              value={environment.name}
              onChange={(e) => updateEnvironment(environment.id, { name: e.target.value })}
              aria-label="Environment name"
              className="h-9 text-sm font-medium"
            />
          </div>
        )}
        <p className="px-4 text-[11px] text-subtle">
          {isGlobals
            ? "Globals are available in every request. Variables in the active environment override them."
            : "Changes are saved automatically. Scripts can update these with aq.environment.set()."}
        </p>
        <KeyValueEditor
          rows={isGlobals ? globals : (environment?.variables ?? [])}
          onChange={(variables) =>
            isGlobals
              ? setGlobals(variables)
              : environment && updateEnvironment(environment.id, { variables })
          }
          keyPlaceholder="Variable"
          valuePlaceholder="Value"
          secret
          showDescription
        />
      </div>
    </Modal>
  );
}
