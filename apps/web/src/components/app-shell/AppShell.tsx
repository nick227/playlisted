import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { VisualizerDevPanel } from "@/features/visualizer/components/VisualizerDevPanel";

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
    <div className="relative flex min-h-full w-full max-w-full overflow-x-clip bg-[var(--color-canvas)]">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative z-10 flex min-h-full min-w-0 w-full max-w-full flex-1 flex-col overflow-x-clip lg:pl-[var(--spacing-sidebar)]">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main
          key={location.pathname}
          className="flex-1 min-w-0 max-w-full overflow-x-clip overflow-y-auto px-4 pb-[calc(var(--spacing-player-safe-mobile)+1.5rem)] pt-[calc(var(--spacing-topbar)+1.5rem)] md:px-8 md:pb-[calc(var(--spacing-player)+1.5rem)]"
        >
          {children}
        </main>
      </div>
      <BottomPlayer />
      <QueuePanel />
      <VisualizerDevPanel />
    </div>
  );
}
