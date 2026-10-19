import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";
import { Ario, type ArioMood } from "./Ario";

export const inputClass =
  "h-7 w-full rounded-md border border-line bg-panel px-2 text-sm text-fg outline-none placeholder:text-subtle focus:border-accent disabled:opacity-60";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(inputClass, className)} {...props} />;
  },
);

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string }>;
}

export function Select({ options, className, ...props }: SelectProps) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <select className={cn(inputClass, "cursor-pointer appearance-none pe-6")} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevronDown"
        size={12}
        className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-subtle"
      />
    </span>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  size?: number;
  tone?: "default" | "danger";
}

export function IconButton({
  icon,
  label,
  size = 14,
  tone = "default",
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-subtle",
        "focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40",
        tone === "danger" ? "hover:bg-panel-2 hover:text-danger" : "hover:bg-panel-2 hover:text-fg",
        className,
      )}
      {...props}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="size-3.5 shrink-0 cursor-pointer accent-accent"
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
      <span>
        <span className="block text-sm">{label}</span>
        {description && <span className="block text-xs text-subtle">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-4 w-7 shrink-0 rounded-full",
          checked ? "bg-accent" : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3 rounded-full bg-white",
            checked ? "start-3.5" : "start-0.5",
          )}
        />
      </button>
    </label>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-subtle">{hint}</span>}
    </label>
  );
}

export function EmptyState({
  title,
  mood = "idle",
  children,
  className,
}: {
  title: string;
  mood?: ArioMood;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-4 text-center", className)}>
      <Ario mood={mood} />
      <p className="mt-2 text-sm text-muted">{title}</p>
      {children && <div className="mt-1 max-w-xs text-xs text-subtle">{children}</div>}
    </div>
  );
}

/** Inline error message with a worried Ario beside it. */
export function ErrorNote({
  children,
  mood = "sad",
  className,
}: {
  children: ReactNode;
  /** "error" for failures on the other side (5xx, network); "sad" otherwise. */
  mood?: "sad" | "error";
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-md border border-danger/40 px-3 py-2 text-xs text-danger",
        className,
      )}
    >
      <Ario mood={mood} size={20} className="text-danger" />
      <div className="selectable min-w-0 flex-1 break-words whitespace-pre-wrap">{children}</div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-3 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin",
        className,
      )}
    />
  );
}
