import { Icon } from "@/components/ui/Icon";
import { features } from "./data";

export function FeatureGrid() {
  return (
    <section>
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold">More than a request client</h2>
          <p className="mt-1 text-xs text-muted">
            Everything your API workflow needs, offline-first.
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 xl:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="group bg-panel p-5 transition-colors hover:bg-panel-2/60">
            <Icon
              name={f.icon}
              size={20}
              className="text-subtle transition-colors group-hover:text-brand-500"
            />
            <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
