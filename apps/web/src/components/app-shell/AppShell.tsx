import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
  const mainRef = useRef<HTMLElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { playerShellActive } = useAudioPlayer();

  useLayoutEffect(() => {
    if (location.hash) return;

    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search, location.hash]);

  return (
    <div className="relative flex min-h-full w-full max-w-full overflow-x-clip bg-transparent">
      <BackgroundLayer />
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative z-10 flex min-h-full min-w-0 w-full max-w-full flex-1 flex-col">
        <TopBar onMenuClick={() => setSidebarOpen(true)} />
        <main
          ref={mainRef}
          key={location.pathname}
          className={`player-shell-transition flex-1 min-w-0 max-w-full overflow-x-clip overflow-y-auto px-4 pt-2 md:px-8 ${
            playerShellActive
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
