import { m } from "motion/react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { DEMO_URL, RELEASES_URL, REPO_URL, useLatestRelease, useStars } from "../lib/github";
import { press } from "../lib/motion";

const base =
  "inline-flex h-12 items-center justify-center gap-2 rounded-md px-5 text-body font-medium whitespace-nowrap transition-colors";

export function DownloadButton({ compact = false }: { compact?: boolean }) {
  const release = useLatestRelease();
  const label = release ? `Download v${release.version} for Windows` : "Download for Windows";

  if (compact) {
    return (
      <m.a
        {...press}
        href={release?.exeUrl ?? RELEASES_URL}
        className="text-small inline-flex h-9 items-center gap-2 rounded-md bg-accent px-3 font-medium text-accent-fg transition-colors hover:bg-accent/85"
      >
        <Icon name="download" size={15} />
        Download
      </m.a>
    );
  }

  return (
    <span className="inline-flex flex-col gap-1.5">
      <m.a
        {...press}
        href={release?.exeUrl ?? RELEASES_URL}
        className={cn(base, "bg-accent text-accent-fg hover:bg-accent/85")}
      >
        <Icon name="download" size={18} />
        {label}
      </m.a>
      <span className="text-small text-muted">
        {release?.msiUrl ? (
          <>
            Windows 10 and 11, x64.{" "}
            <a
              href={release.msiUrl}
              className="text-fg underline underline-offset-4 hover:text-accent"
            >
              Get the .msi
            </a>
          </>
        ) : (
          "Windows 10 and 11, x64"
        )}
      </span>
    </span>
  );
}

export function TryOnlineButton() {
  return (
    <span className="inline-flex flex-col gap-1.5">
      <m.a {...press} href={DEMO_URL} className={cn(base, "bg-panel-2 text-fg hover:bg-line")}>
        <Icon name="send" size={18} />
        Try it online
      </m.a>
      <span className="text-small text-muted">
        <span className="md:hidden">Works best on a desktop screen</span>
        <span className="hidden md:inline">Runs in your browser, no sign-up</span>
      </span>
    </span>
  );
}

export function GitHubButton() {
  const stars = useStars();
  return (
    <m.a
      {...press}
      href={REPO_URL}
      className={cn(base, "self-start px-3 text-fg hover:bg-panel-2")}
    >
      <GitHubMark />
      View on GitHub
      {stars !== null && (
        <span className="text-small inline-flex items-center gap-1 rounded-sm bg-panel-2 px-1.5 text-muted tabular-nums">
          <StarIcon /> {stars}
        </span>
      )}
    </m.a>
  );
}

export function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-label="stars">
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1z" />
    </svg>
  );
}

export function GitHubMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/** The three main actions, in the hero and again at the end of the page. */
export function Actions() {
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-4">
      <DownloadButton />
      <TryOnlineButton />
      <GitHubButton />
    </div>
  );
}
