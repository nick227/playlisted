import { useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import { BackgroundLayer } from "./BackgroundLayer";

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
  const { playerBarVisible } = useAudioPlayer();

  return (
    <div className="relative flex min-h-full w-full max-w-full overflow-x-clip bg-transparent">
      <BackgroundLayer />
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative z-10 flex min-h-full min-w-0 w-full max-w-full flex-1 flex-col overflow-x-clip lg:pl-[var(--spacing-sidebar)]">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main
          key={location.pathname}
          className={`player-shell-transition flex-1 min-w-0 max-w-full overflow-x-clip overflow-y-auto px-4 pt-[calc(var(--spacing-topbar)+1.5rem)] md:px-8 ${
            playerBarVisible
              ? "pb-[calc(var(--spacing-player-safe-mobile)+1.5rem)] md:pb-[calc(var(--spacing-player)+1.5rem)]"
              : "pb-6"
          }`}
        >
          {children}
        </main>
      </div>
      <BottomPlayer />
      <QueuePanel />
    </div>
  );
}
