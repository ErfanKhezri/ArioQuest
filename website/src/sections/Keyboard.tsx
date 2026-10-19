import { AnimatePresence, m, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ario } from "@/components/ui/Ario";
import { Icon } from "@/components/ui/Icon";
import { MethodBadge } from "@/components/ui/MethodBadge";
import { cn } from "@/lib/cn";
import { Fragment, VarText } from "../components/Fragment";
import { inView, rise } from "../lib/motion";

const SHORTCUTS = [
  { key: "k", label: "K" },
  { key: "enter", label: "Enter" },
  { key: "s", label: "S" },
  { key: "n", label: "N" },
  { key: "w", label: "W" },
  { key: "e", label: "E" },
  { key: "o", label: "O" },
] as const;

type Key = (typeof SHORTCUTS)[number]["key"];

/** Tabs in the mock window, by translation key. */
type TabName = "listPosts" | "createPost" | "untitled";

const COMMANDS = ["newHttp", "newGrpc", "run", "import", "theme"] as const;

function Keycap({
  label,
  down,
  name,
  onPress,
}: {
  label: string;
  down: boolean;
  name?: string;
  onPress?: () => void;
}) {
  const face = (
    <span
      className={cn(
        "text-small flex h-11 min-w-11 items-center justify-center rounded-md bg-panel-2 px-3 font-medium transition-transform duration-100",
        down ? "translate-y-1 bg-accent text-accent-fg" : "group-hover:-translate-y-px",
      )}
    >
      {label}
    </span>
  );
  // The key's darker base shows below the face and disappears as it is pressed.
  return onPress ? (
    <button
      type="button"
      onClick={onPress}
      aria-label={name}
      className="group block rounded-md bg-line pb-1"
    >
      {face}
    </button>
  ) : (
    <span aria-hidden className="block rounded-md bg-line pb-1">
      {face}
    </span>
  );
}

export default function Keyboard() {
  const { t } = useTranslation("site");
  const ref = useRef<HTMLElement>(null);
  const active = useInView(ref, { amount: 0.5 });
  const [down, setDown] = useState<Key | null>(null);
  const [tabs, setTabs] = useState<TabName[]>(["listPosts", "createPost"]);
  const [env, setEnv] = useState(0);
  const [palette, setPalette] = useState(false);
  const [sent, setSent] = useState<"idle" | "sending" | "done">("idle");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const notify = (text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };

  const environments = ["JSONPlaceholder", t("keyboard.staging"), t("keyboard.noEnvironment")];
  const tabName = (tab: TabName) =>
    tab === "untitled" ? t("ui.untitled") : t(`ui.requests.${tab}`);

  const run = (key: Key) => {
    setDown(key);
    setTimeout(() => setDown(null), 160);
    if (key !== "k") setPalette(false);
    if (key === "k") setPalette((open) => !open);
    if (key === "enter") {
      setSent("sending");
      setTimeout(() => setSent("done"), 700);
    }
    const last = tabs.at(-1);
    if (key === "s" && last) notify(t("keyboard.saved", { name: tabName(last) }));
    if (key === "n") setTabs((open) => [...open.slice(-3), "untitled"]);
    if (key === "w") setTabs((open) => open.slice(0, -1));
    if (key === "e") setEnv((i) => (i + 1) % environments.length);
    if (key === "o") notify(t("keyboard.importToast"));
  };

  // While the section is on screen, the real shortcuts press these keys.
  // (Browsers keep Ctrl+N and Ctrl+W for themselves; click those keys instead.)
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const key = e.key.toLowerCase() as Key;
      if (!SHORTCUTS.some((s) => s.key === key)) return;
      e.preventDefault();
      run(key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
  const activeTab = tabs.at(-1);

  return (
    <m.section
      ref={ref}
      {...inView}
      className="page grid grid-cols-1 gap-12 py-24 lg:grid-cols-12 lg:gap-8 lg:py-40"
    >
      <m.div variants={rise} className="order-2 lg:order-1 lg:col-span-7">
        <Fragment className="relative flex h-[420px] flex-col">
          <div className="flex h-9 shrink-0 items-end gap-px bg-panel-2/60 px-1 text-xs">
            <AnimatePresence initial={false}>
              {tabs.map((tab, i) => (
                <m.div
                  key={`${tab}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className={cn(
                    "flex h-8 min-w-0 items-center gap-1 rounded-t-sm px-3",
                    i === tabs.length - 1 ? "bg-panel text-fg" : "text-muted",
                  )}
                >
                  <MethodBadge method={tab === "createPost" ? "POST" : "GET"} className="w-auto" />
                  <span className="truncate">{tabName(tab)}</span>
                </m.div>
              ))}
            </AnimatePresence>
          </div>

          {activeTab ? (
            <div className="flex flex-1 flex-col gap-3 p-3">
              <div className="flex items-center rounded-md border border-line bg-canvas">
                <span className="border-e border-line px-2 py-1.5">
                  <MethodBadge
                    method={activeTab === "createPost" ? "POST" : "GET"}
                    className="w-auto"
                  />
                </span>
                <span className="truncate px-2 font-mono text-xs">
                  <VarText text={activeTab === "untitled" ? "" : "{{baseUrl}}/posts"} />
                </span>
              </div>
              <div className="flex flex-1 items-center justify-center gap-3 rounded-md bg-canvas/60 text-xs">
                <Ario
                  mood={sent === "sending" ? "thinking" : sent === "done" ? "happy" : "sleepy"}
                  size={40}
                  className={
                    sent === "done"
                      ? "text-success"
                      : sent === "sending"
                        ? "text-accent"
                        : "text-muted"
                  }
                />
                <span className={sent === "done" ? "font-medium text-success" : "text-muted"}>
                  {sent === "idle" && t("keyboard.pressSend")}
                  {sent === "sending" && t("ui.waiting")}
                  {sent === "done" && <bdi dir="ltr">200 OK · 142 ms</bdi>}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-xs text-muted">
              <Ario mood="sleepy" size={40} />
              {t("keyboard.allClosed")}
            </div>
          )}

          <div className="flex h-6 shrink-0 items-center justify-between bg-panel-2/60 px-2 text-xs text-muted">
            <m.span key={env} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              {environments[env]}
            </m.span>
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-success" /> {t("ui.ready")}
            </span>
          </div>

          <AnimatePresence>
            {palette && (
              <m.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                className="absolute inset-x-6 top-12 rounded-md border border-line bg-panel shadow-[0_16px_48px_rgb(0_0_0/0.35)] sm:inset-x-16"
              >
                <div className="flex items-center gap-2 border-b border-line px-3 py-2 text-muted">
                  <Icon name="search" size={14} /> {t("keyboard.typeCommand")}
                </div>
                <ul className="p-1 text-xs">
                  {COMMANDS.map((c, i) => (
                    <li
                      key={c}
                      className={cn(
                        "rounded-sm px-2 py-1.5",
                        i === 0 ? "bg-accent/15 text-fg" : "text-muted",
                      )}
                    >
                      {t(`keyboard.commands.${c}`)}
                    </li>
                  ))}
                </ul>
              </m.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {toast && (
              <m.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                role="status"
                className="absolute start-3 end-3 bottom-9 flex items-center gap-2 rounded-md border border-line bg-panel-2 px-3 py-2 text-xs shadow-[0_12px_32px_rgb(0_0_0/0.3)] sm:start-auto"
              >
                <Icon name="check" size={13} className="text-success" />
                {toast}
              </m.p>
            )}
          </AnimatePresence>
        </Fragment>
      </m.div>

      <div className="order-1 flex flex-col gap-8 lg:order-2 lg:col-span-5">
        <m.h2 variants={rise} className="text-title font-semibold">
          {t("keyboard.title")}
        </m.h2>
        <m.p variants={rise} className="max-w-[44ch]">
          {t("keyboard.body")}
        </m.p>
        <m.ul variants={rise} className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {SHORTCUTS.map((s) => (
            <li key={s.key} className="flex items-center gap-3">
              <span dir="ltr" className="flex gap-1.5">
                <Keycap label={isMac ? "⌘" : "Ctrl"} down={down === s.key} />
                <Keycap
                  label={s.label}
                  name={`Ctrl+${s.label}: ${t(`keyboard.does.${s.key}`)}`}
                  down={down === s.key}
                  onPress={() => run(s.key)}
                />
              </span>
              <span className="text-small text-muted">{t(`keyboard.does.${s.key}`)}</span>
            </li>
          ))}
        </m.ul>
      </div>
    </m.section>
  );
}
