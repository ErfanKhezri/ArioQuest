import { Icon } from "@/components/ui/Icon";
import { Kbd } from "@/components/ui/Kbd";
import { useWorkspace } from "@/store/workspace";
import { shortcuts } from "./data";

export function GrpcCard() {
  const openDialog = useWorkspace((s) => s.openDialog);
  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand-500/25 bg-linear-135 from-brand-500/12 via-panel to-panel p-5">
      <div className="absolute -top-10 -right-10 size-32 rounded-full bg-accent-500/20 blur-2xl" />
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
        <Icon name="server" size={18} />
      </span>
      <h2 className="mt-4 text-sm font-semibold">Call gRPC with your .proto files</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Drop in a folder of protos — imports and google/protobuf types resolve automatically — pick
        a method and get an example message generated for you.
      </p>
      <button
        type="button"
        onClick={() => openDialog({ type: "protoSet" })}
        className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-600 transition-colors hover:text-brand-500 dark:text-brand-300"
      >
        Import .proto files
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
