import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { PersistentVisualizerLayer } from "@/features/visualizer/PersistentVisualizerLayer";
import { VisualizerDevPanel } from "@/features/visualizer/components/VisualizerDevPanel";
import type { VisualizerSurface } from "@/features/visualizer/visualizerTypes";

import { BottomPlayer } from "./BottomPlayer";
import { QueuePanel } from "./QueuePanel";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: ReactNode;
}

function surfaceForPath(pathname: string): VisualizerSurface {
  if (pathname.startsWith("/admin") || pathname.includes("/edit")) return "editor";
  if (pathname.startsWith("/studio")) return "soft";
  if (pathname.startsWith("/@/") || pathname.startsWith("/playlists/")) return "immersive";
  return "default";
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const visualizerSurface = surfaceForPath(location.pathname);

  return (
    <div className="relative flex min-h-full w-full max-w-full overflow-x-clip bg-transparent" data-visualizer-surface={visualizerSurface}>
      <PersistentVisualizerLayer surface={visualizerSurface} />
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative z-10 flex min-h-full min-w-0 w-full max-w-full flex-1 flex-col overflow-x-clip">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main
          key={location.pathname}
          className="flex-1 min-w-0 max-w-full overflow-x-clip overflow-y-auto px-4 pb-[calc(var(--spacing-player-safe-mobile)+1.5rem)] pt-[calc(var(--spacing-topbar)+1.5rem)] md:px-8 md:pb-[calc(var(--spacing-player)+1.5rem)]"
        >
          {children}
        </main>
        <BottomPlayer />
        <QueuePanel />
      </div>
      <VisualizerDevPanel />
    </div>
  );
}
