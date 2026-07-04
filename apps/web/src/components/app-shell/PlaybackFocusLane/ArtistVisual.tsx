import { useEffect, useRef } from "react";
import type { FocusRecording } from "@/lib/playbackFocus/types";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { useAudioAnalyser } from "@/features/playback-indicators/useAudioAnalyser";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

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
        
        // Much wider and more opaque outline rings for pronounced impact
        const spread1 = 2 + energyBoost * 15;
        const spread2 = spread1 + 4 + energyBoost * 25;
        
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

  const imageStyle = imageUrl
    ? { backgroundImage: `url(${imageUrl})` }
    : undefined;

  const durationStr = recording?.durationSeconds
    ? formatDuration(recording.durationSeconds)
    : "--:--";
  const currentStr = formatDuration(currentTimeSec);

  return (
    <div 
      ref={containerRef}
      className="focus-lane__artist flex flex-col gap-4 rounded-3xl bg-black/40 p-6 shadow-2xl backdrop-blur-xl border border-white/10 mx-auto max-w-2xl"
    >
      {/* Tier 1: Artist Focus */}
      <div className="flex items-center gap-6">
        <div
          className={`h-28 w-28 shrink-0 overflow-hidden rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.5)] border-2 border-white/10 bg-cover bg-center${
            imageUrl ? "" : " focus-lane__artist-image--fallback"
          }`}
          style={imageStyle}
          aria-hidden
        />
        <div className="flex flex-col justify-center overflow-hidden">
          {artistName ? (
            <p className="truncate text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
              {artistName}
            </p>
          ) : null}
          {artistBio || recording?.genreLabel ? (
            <div className="mt-1 flex items-center gap-2 text-lg font-medium text-white/70 drop-shadow-sm">
              {recording?.genreLabel ? (
               <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider">
                 {recording.genreLabel}
               </span>
              ) : null}
              {artistBio ? <span className="truncate">{artistBio}</span> : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Tier 2: Currently Playing */}
      {recording ? (
        <div className="mt-2 flex items-center rounded-xl bg-black/30 px-4 py-3 border border-white/5">
          <div className="flex items-center gap-4 overflow-hidden">
            {recording.artworkUrl ? (
              <img
                src={recording.artworkUrl}
                alt={recording.title}
                className="h-10 w-10 shrink-0 rounded-md object-cover shadow-md"
              />
            ) : (
              <div className="h-10 w-10 shrink-0 rounded-md bg-white/10 shadow-md" />
            )}
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-semibold text-white/90">
                {recording.title}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <PlaybackBars
                  active={true}
                  playing={isPlaying}
                  className="scale-75 origin-left"
                />
                <span className="text-xs font-medium text-white/50 tracking-wider">
                  NOW PLAYING
                </span>
                <span className="text-xs font-medium text-white/50 px-0.5">
                  •
                </span>
                <span className="text-xs font-medium text-white/50 tabular-nums">
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
