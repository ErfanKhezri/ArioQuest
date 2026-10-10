import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

export const inputClass =
  "h-8 w-full rounded-md border border-line bg-panel px-2.5 text-xs text-fg outline-none transition-colors placeholder:text-subtle focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/15 disabled:opacity-60";

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
      <select className={cn(inputClass, "cursor-pointer appearance-none pr-7")} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevronDown"
        size={14}
        className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-subtle"
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
  size = 15,
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
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-subtle transition-colors",
        "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none disabled:opacity-40",
        tone === "danger"
          ? "hover:bg-rose-500/10 hover:text-rose-500"
          : "hover:bg-panel-2 hover:text-fg",
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
      className="size-3.5 shrink-0 cursor-pointer accent-brand-600"
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
        <span className="block text-xs font-medium">{label}</span>
        {description && <span className="mt-0.5 block text-[11px] text-subtle">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-4.5 w-8 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand-600" : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-3.5 rounded-full bg-white shadow transition-all",
            checked ? "left-4" : "left-0.5",
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
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-subtle">{hint}</span>}
    </label>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  className,
}: {
  icon: IconName;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-panel-2 text-subtle">
        <Icon name={icon} size={19} />
      </span>
      <p className="mt-3 text-sm font-medium">{title}</p>
      {children && (
        <div className="mt-1 max-w-xs text-xs leading-relaxed text-muted">{children}</div>
      )}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}
