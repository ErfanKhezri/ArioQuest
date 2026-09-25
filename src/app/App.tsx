import { Button } from "@/components/ui/Button";
import { useAppInfo } from "@/hooks/useAppInfo";

export function App() {
  const { info, error } = useAppInfo();

  return (
    <main className="flex h-full flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-5xl font-bold tracking-tight text-brand-600 dark:text-brand-400">
        ArioQuest
      </h1>

      <p className="text-zinc-500 dark:text-zinc-400">
        {info ? `v${info.version} · ${info.platform}` : (error ?? "Loading…")}
      </p>

      <div className="flex gap-3">
        <Button>Start</Button>
        <Button variant="secondary">Settings</Button>
      </div>
    </main>
  );
}
