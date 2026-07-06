import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/App";
import { applyPlaybackFocusTimingCssVars } from "@/lib/playbackFocusTiming";
import { queryClient } from "@/lib/queryClient";
import { installStorageDiagnostics } from "@/lib/storageDiagnostics";
import { AudioPlayerProvider } from "@/providers/AudioPlayerProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { PlaybackVolumeProvider } from "@/providers/PlaybackVolumeProvider";
import "@/index.css";

applyPlaybackFocusTimingCssVars(document.documentElement);
if (import.meta.env.DEV) {
  installStorageDiagnostics();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PlaybackVolumeProvider>
          <AudioPlayerProvider>
            <App />
          </AudioPlayerProvider>
        </PlaybackVolumeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
