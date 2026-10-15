import { useState } from "react";
import { Toaster } from "@/components/ui/Toaster";
import { DialogHost } from "@/features/workspace/dialogs/DialogHost";
import { WorkspacePage } from "@/features/workspace/WorkspacePage";
import { useShortcuts } from "@/hooks/useShortcuts";
import { useWorkspace } from "@/store/workspace";
import { NavRail } from "./NavRail";
import { StatusBar } from "./StatusBar";

export function App() {
  const hydrated = useWorkspace((s) => s.hydrated);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useShortcuts();

  if (!hydrated) return <div className="h-full bg-canvas" />;

  return (
    <div className="flex h-full bg-canvas text-fg">
      <NavRail sidebarOpen={sidebarOpen} onSidebarOpenChange={setSidebarOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
          <WorkspacePage sidebarOpen={sidebarOpen} />
        </div>
        <StatusBar />
      </div>
      <DialogHost />
      <Toaster />
    </div>
  );
}
