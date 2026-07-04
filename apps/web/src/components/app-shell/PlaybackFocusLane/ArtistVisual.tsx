import { useEffect, useRef } from "react";
import type { FocusRecording } from "@/lib/playbackFocus/types";
import { PLAYBACK_FOCUS_INTERACTIVE_ATTR } from "@/lib/playbackFocus/interactiveTarget";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { useAudioAnalyser } from "@/features/playback-indicators/useAudioAnalyser";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import { PlaybackFocusReactionBar } from "./PlaybackFocusReactionBar";

type ArtistVisualProps = {
  artistName?: string;
  imageUrl?: string;
  artistBio?: string | null;
  recording?: FocusRecording | null;
  currentTimeSec?: number;
  isPlaying?: boolean;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ArtistVisual({
  artistName,
  imageUrl,
  artistBio,
  recording,
  currentTimeSec = 0,
  isPlaying = false,
}: ArtistVisualProps) {
  const { audioRef } = useAudioPlayer();
  const { analyser, frequencyData, connected } = useAudioAnalyser(audioRef);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let timeAccumulator = 0;
    let lastTime = performance.now();
    
    const getEnergy = (start: number, end: number, data: Uint8Array<ArrayBuffer>) => {
      let sum = 0;
      for (let i = start; i < end; i++) {
        sum += data[i];
      }
      return sum / (end - start) / 255;
    };
    
    const loop = (now: DOMHighResTimeStamp) => {
      if (cancelled) return;
      
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      
      let bass = 0;
      let mids = 0;
      let highs = 0;
      
      if (connected && analyser && isPlaying) {
        analyser.getByteFrequencyData(frequencyData);
        bass = getEnergy(0, 10, frequencyData);
        mids = getEnergy(10, 60, frequencyData);
        highs = getEnergy(60, 200, frequencyData);
      }
      
      const totalEnergy = (bass + mids + highs) / 3;
      // Use slightly lower exponent to let energy peak higher, creating punchier visuals
      const energyBoost = Math.pow(totalEnergy, 1.3);
      
      timeAccumulator += dt * (15 + energyBoost * 80);
      
      if (containerRef.current) {
        const hue = timeAccumulator % 360;
        
        // Brighten and intensify border opacity
        containerRef.current.style.borderColor = `hsla(${hue}, 80%, ${60 + energyBoost * 25}%, ${0.5 + energyBoost * 0.5})`;
        
        const isMobile = window.matchMedia("(max-width: 639px)").matches;
        const spreadScale = isMobile ? 0.45 : 1;
        const spread1 = (2 + energyBoost * 15) * spreadScale;
        const spread2 = (spread1 + 4 + energyBoost * 25) * spreadScale;
        
        containerRef.current.style.boxShadow = [
          `0 0 0 ${spread1.toFixed(1)}px hsla(${hue}, 80%, 65%, ${0.3 + energyBoost * 0.7})`,
          `0 0 0 ${spread2.toFixed(1)}px hsla(${(hue + 60) % 360}, 80%, 60%, ${0.1 + energyBoost * 0.4})`,
          `0 10px 40px rgba(0,0,0,0.5)`
        ].join(", ");
      }
      
      requestAnimationFrame(loop);
    };
    
    requestAnimationFrame(loop);
    
    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.style.borderColor = "";
        containerRef.current.style.boxShadow = "";
      }
    };
  }, [analyser, frequencyData, connected, isPlaying]);

  const durationStr = recording?.durationSeconds
    ? formatDuration(recording.durationSeconds)
    : "--:--";
  const currentStr = formatDuration(currentTimeSec);

  return (
    <div
      ref={containerRef}
      {...{ [PLAYBACK_FOCUS_INTERACTIVE_ATTR]: "" }}
      className="focus-lane__artist focus-lane__interactive mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 shadow-2xl backdrop-blur-xl sm:gap-4 sm:rounded-3xl sm:p-6"
    >
      <div className="flex min-w-0 items-start gap-3 sm:gap-5">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={artistName ?? ""}
            className="focus-lane__artist-image aspect-square w-28 shrink-0 rounded-sm border-2 border-white/10 object-cover shadow-[0_8px_30px_rgb(0,0,0,0.5)] sm:w-36"
          />
        ) : (
          <div
            className="focus-lane__artist-image focus-lane__artist-image--fallback aspect-square w-28 shrink-0 rounded-sm border-2 border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] sm:w-36"
            aria-hidden
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden pt-0.5 sm:gap-2.5">
          {artistName ? (
            <p className="truncate text-2xl font-extrabold leading-none tracking-tight text-white drop-shadow-md sm:text-4xl">
              {artistName}
            </p>
          ) : null}
          <PlaybackFocusReactionBar />
          {artistBio || recording?.genreLabel ? (
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-white/70 drop-shadow-sm sm:text-base">
              {recording?.genreLabel ? (
                <span className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:text-xs">
                  {recording.genreLabel}
                </span>
              ) : null}
              {artistBio ? <span className="min-w-0 truncate">{artistBio}</span> : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Tier 2: Currently Playing */}
      {recording ? (
        <div className="mt-1 flex min-w-0 items-center rounded-xl border border-white/5 bg-black/30 px-3 py-2.5 sm:mt-2 sm:px-4 sm:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden sm:gap-4">
            {recording.artworkUrl ? (
              <img
                src={recording.artworkUrl}
                alt={recording.title}
                className="h-9 w-9 shrink-0 rounded-md object-cover shadow-md sm:h-10 sm:w-10"
              />
            ) : (
              <div className="h-9 w-9 shrink-0 rounded-md bg-white/10 shadow-md sm:h-10 sm:w-10" />
            )}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-semibold text-white/90">
                {recording.title}
              </span>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 sm:gap-2">
                <PlaybackBars
                  active={true}
                  playing={isPlaying}
                  className="origin-left shrink-0 scale-[0.65] sm:scale-75"
                />
                <span className="hidden shrink-0 text-[10px] font-medium tracking-wider text-white/50 sm:inline sm:text-xs">
                  NOW PLAYING
                </span>
                <span className="hidden shrink-0 px-0.5 text-xs font-medium text-white/50 sm:inline">
                  •
                </span>
                <span className="min-w-0 truncate text-[10px] font-medium tabular-nums text-white/50 sm:text-xs">
                  {currentStr} / {durationStr}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
