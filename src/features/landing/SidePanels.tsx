import { Icon } from "@/components/ui/Icon";
import { Kbd } from "@/components/ui/Kbd";
import { shortcuts } from "./data";

export function CopilotCard() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand-500/25 bg-linear-135 from-brand-500/12 via-panel to-panel p-5">
      <div className="absolute -top-10 -right-10 size-32 rounded-full bg-accent-500/20 blur-2xl" />
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
        <Icon name="sparkles" size={18} />
      </span>
      <h2 className="mt-4 text-sm font-semibold">Ask the copilot</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        “Create a POST to /orders with a random cart and assert the total is correct.”
      </p>
      <button
        type="button"
        className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-600 transition-colors hover:text-brand-500 dark:text-brand-300"
      >
        Try it now
        <Icon name="arrowRight" size={13} />
      </button>
    </section>
  );
}

export function ShortcutsCard() {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="text-sm font-semibold">Keyboard first</h2>
      <ul className="mt-3 space-y-2.5">
        {shortcuts.map((s) => (
          <li key={s.label} className="flex items-center justify-between text-xs text-muted">
            {s.label}
            <span className="flex gap-0.5">
              {s.keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
