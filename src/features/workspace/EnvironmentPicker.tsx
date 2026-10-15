import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { useWorkspace } from "@/store/workspace";

export function EnvironmentPicker() {
  const environments = useWorkspace((s) => s.environments);
  const activeId = useWorkspace((s) => s.activeEnvironmentId);
  const setActive = useWorkspace((s) => s.setActiveEnvironment);
  const openDialog = useWorkspace((s) => s.openDialog);

  return (
    <div className="flex items-center gap-1">
      <label className="flex h-5 items-center gap-1 rounded-sm px-1 hover:bg-panel-2">
        <Icon name="globe" size={12} />
        <select
          aria-label="Active environment"
          value={activeId ?? ""}
          onChange={(e) => setActive(e.target.value || null)}
          className={cn(
            "max-w-48 cursor-pointer appearance-none bg-transparent outline-none",
            activeId ? "text-fg" : "text-subtle",
          )}
        >
          <option value="">No environment</option>
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={10} className="pointer-events-none" />
      </label>
      <button
        type="button"
        onClick={() => openDialog({ type: "environment", environmentId: activeId ?? "globals" })}
        className="rounded-sm px-1 hover:bg-panel-2 hover:text-fg"
      >
        Variables
      </button>
    </div>
  );
}
