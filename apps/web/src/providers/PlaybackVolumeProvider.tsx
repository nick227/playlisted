import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { readPlayerVolume, writePlayerVolume } from "@/lib/playerVolumeStorage";

type PlaybackVolumeContextValue = {
  volume: number;
  isMuted: boolean;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
};

const PlaybackVolumeContext = createContext<PlaybackVolumeContextValue | null>(null);

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function PlaybackVolumeProvider({ children }: { children: ReactNode }) {
  const [volume, setVolumeState] = useState(() => readPlayerVolume());
  const preMuteVolumeRef = useRef(volume > 0 ? volume : 1);

  const setVolume = useCallback((nextVolume: number) => {
    const clamped = clamp01(nextVolume);
    if (clamped > 0) {
      preMuteVolumeRef.current = clamped;
    }
    setVolumeState(clamped);
    writePlayerVolume(clamped);
  }, []);

  const toggleMute = useCallback(() => {
    setVolumeState((current) => {
      if (current > 0) {
        preMuteVolumeRef.current = current;
        writePlayerVolume(0);
        return 0;
      }
      const restored = preMuteVolumeRef.current > 0 ? preMuteVolumeRef.current : 1;
      writePlayerVolume(restored);
      return restored;
    });
  }, []);

  const value: PlaybackVolumeContextValue = {
    volume,
    isMuted: volume === 0,
    setVolume,
    toggleMute,
  };

  return (
    <PlaybackVolumeContext.Provider value={value}>{children}</PlaybackVolumeContext.Provider>
  );
}

export function usePlaybackVolume(): PlaybackVolumeContextValue {
  const ctx = useContext(PlaybackVolumeContext);
  if (!ctx) {
    throw new Error("usePlaybackVolume must be used within PlaybackVolumeProvider");
  }
  return ctx;
}
