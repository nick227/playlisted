import { useContext } from "react";

import { PlaybackTransportContext } from "@/providers/AudioPlayerProvider";

export function usePlaybackTransport() {
  const ctx = useContext(PlaybackTransportContext);
  if (!ctx) throw new Error("usePlaybackTransport must be used within AudioPlayerProvider");
  return ctx;
}
