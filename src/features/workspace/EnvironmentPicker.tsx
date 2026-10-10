import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/controls";
import { cn } from "@/lib/cn";
import { useWorkspace } from "@/store/workspace";

export function EnvironmentPicker({ compact = false }: { compact?: boolean }) {
  const environments = useWorkspace((s) => s.environments);
  const activeId = useWorkspace((s) => s.activeEnvironmentId);
  const setActive = useWorkspace((s) => s.setActiveEnvironment);
  const openDialog = useWorkspace((s) => s.openDialog);

  return (
    <div className="flex items-center gap-1">
      <label
        className={cn(
          "flex items-center gap-1.5 rounded-md border border-line bg-panel px-2 text-xs",
          compact ? "h-6" : "h-7",
        )}
      >
        <span
          className={cn("size-1.5 rounded-full", activeId ? "bg-emerald-500" : "bg-subtle/50")}
        />
        <select
          aria-label="Active environment"
          value={activeId ?? ""}
          onChange={(e) => setActive(e.target.value || null)}
          className="max-w-40 cursor-pointer appearance-none bg-transparent pr-1 outline-none"
        >
          <option value="">No environment</option>
          {environments.map((env) => (
            <option key={env.id} value={env.id}>
              {env.name}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={12} className="pointer-events-none -ml-1 text-subtle" />
      </label>
      {!compact && (
        <IconButton
          icon="eye"
          label="View variables"
          onClick={() => openDialog({ type: "environment", environmentId: activeId ?? "globals" })}
        />
      )}
    </div>
  );
}
