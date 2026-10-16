import { useEffect, useState } from "react";
import { Ario } from "@/components/ui/Ario";
import { Toaster } from "@/components/ui/Toaster";
import { LandingPage } from "@/features/auth/LandingPage";
import { DialogHost } from "@/features/workspace/dialogs/DialogHost";
import { WorkspacePage } from "@/features/workspace/WorkspacePage";
import { useShortcuts } from "@/hooks/useShortcuts";
import { getSession, signOut, type Session } from "@/lib/auth";
import { isWebDemo } from "@/lib/demo";
import { useWorkspace } from "@/store/workspace";
import { DemoBanner } from "./DemoBanner";
import { NavRail } from "./NavRail";
import { StatusBar } from "./StatusBar";

export function App() {
  const hydrated = useWorkspace((s) => s.hydrated);
  // undefined while the saved session is being read.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useShortcuts();

  useEffect(() => {
    void getSession().then(setSession);
  }, []);

  if (!hydrated || session === undefined) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <Ario mood="thinking" size={48} label="Loading ArioQuest" className="text-accent" />
      </div>
    );
  }

  if (!session) return <LandingPage onSignedIn={setSession} />;

  return (
    <div className="flex h-full flex-col bg-canvas text-fg">
      {isWebDemo && <DemoBanner />}
      <div className="flex min-h-0 flex-1">
        <NavRail
          session={session}
          onSignOut={() => void signOut().then(() => setSession(null))}
          sidebarOpen={sidebarOpen}
          onSidebarOpenChange={setSidebarOpen}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1">
            <WorkspacePage sidebarOpen={sidebarOpen} />
          </div>
          <StatusBar />
        </div>
      </div>
      <DialogHost />
      <Toaster />
    </div>
  );
}
