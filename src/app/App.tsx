import { Logo } from "@/app/NavRail";
import { Toaster } from "@/components/ui/Toaster";
import { LandingPage } from "@/features/landing/LandingPage";
import { DialogHost } from "@/features/workspace/dialogs/DialogHost";
import { WorkspacePage } from "@/features/workspace/WorkspacePage";
import { useShortcuts } from "@/hooks/useShortcuts";
import { useWorkspace } from "@/store/workspace";
import { NavRail } from "./NavRail";
import { StatusBar } from "./StatusBar";

export function App() {
  const hydrated = useWorkspace((s) => s.hydrated);
  const view = useWorkspace((s) => s.view);
  useShortcuts();

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <Logo className="motion-safe:animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-canvas text-fg">
      <NavRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
          {view === "home" ? <LandingPage /> : <WorkspacePage />}
        </div>
        <StatusBar />
      </div>
      <DialogHost />
      <Toaster />
    </div>
  );
}
