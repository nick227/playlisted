import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { BottomPlayer } from "./BottomPlayer";
import { QueuePanel } from "./QueuePanel";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-full">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-full min-w-0 flex-1 flex-col">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main
          key={location.pathname}
          className="flex-1 overflow-y-auto px-4 pb-[calc(var(--spacing-player)+1.5rem)] pt-[calc(var(--spacing-topbar)+1.5rem)] md:px-8"
        >
          {children}
        </main>
        <BottomPlayer />
        <QueuePanel />
      </div>
    </div>
  );
}
