import { m } from "motion/react";
import { useEffect, useState } from "react";
import { Ario } from "@/components/ui/Ario";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { DownloadButton, GitHubMark, StarIcon } from "../components/Actions";
import { DEMO_URL, REPO_URL, useStars } from "../lib/github";
import { press } from "../lib/motion";

function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? "dark");
  const next = theme === "dark" ? "light" : "dark";

  const toggle = () => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("aq-theme", next);
    } catch {
      // Private windows may refuse storage; the theme still switches for this visit.
    }
    setTheme(next);
  };

  return (
    <m.button
      {...press}
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} mode`}
      className="inline-flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel-2 hover:text-fg"
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
    </m.button>
  );
}

const link =
  "rounded-md px-3 py-2 text-small text-muted transition-colors hover:bg-panel-2 hover:text-fg";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const stars = useStars();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-300",
        scrolled ? "bg-canvas/75 backdrop-blur-md" : "bg-transparent",
      )}
    >
      <nav className="page flex h-16 items-center gap-1">
        <a
          href="#top"
          className="mr-auto flex items-center gap-2 rounded-md py-1 pr-2 font-semibold"
        >
          <Ario size={28} className="text-accent" />
          <span className="text-[17px] tracking-tight">ArioQuest</span>
        </a>
        <a href="#features" className={cn(link, "hidden md:inline-flex")}>
          Features
        </a>
        <a href={DEMO_URL} className={cn(link, "hidden md:inline-flex")}>
          Try online
        </a>
        <a
          href={REPO_URL}
          className={cn(link, "inline-flex items-center gap-2")}
          aria-label="GitHub"
        >
          <GitHubMark size={16} />
          <span className="hidden sm:inline">GitHub</span>
          {stars !== null && (
            <span className="hidden items-center gap-1 tabular-nums sm:inline-flex">
              <StarIcon /> {stars}
            </span>
          )}
        </a>
        <ThemeToggle />
        <span className="ml-1">
          <DownloadButton compact />
        </span>
      </nav>
    </header>
  );
}
