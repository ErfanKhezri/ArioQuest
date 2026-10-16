import { Ario } from "@/components/ui/Ario";
import { Icon } from "@/components/ui/Icon";
import { RELEASES_URL } from "@/lib/demo";

/** Slim bar on top of the web demo: what the browser can't do, and where to get the app. */
export function DemoBanner() {
  return (
    <div className="flex h-8 shrink-0 items-center gap-2 bg-panel-2 px-3 text-xs text-muted">
      <Ario mood="curious" size={18} className="text-info" />
      <span className="min-w-0 truncate">
        Web demo — browser CORS rules apply, gRPC needs the desktop app. Your workspace is saved in
        this browser only.
      </span>
      <a
        href={RELEASES_URL}
        target="_blank"
        rel="noreferrer"
        className="ml-auto inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-accent px-2 font-medium text-accent-fg hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      >
        <Icon name="download" size={12} />
        Download
      </a>
    </div>
  );
}
