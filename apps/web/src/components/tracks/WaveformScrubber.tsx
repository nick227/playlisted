import { useContext, useRef, type MouseEvent } from "react";
import { PlaybackTransportContext } from "@/providers/AudioPlayerProvider";
import { useAudioWaveformPeaks } from "../song-visual-editor/hooks/useAudioWaveformPeaks";

interface WaveformScrubberProps {
  audioUrl?: string | null;
  isActive?: boolean;
}

export function WaveformScrubber({ audioUrl, isActive }: WaveformScrubberProps) {
  const { data, loading } = useAudioWaveformPeaks(audioUrl);
  const transport = useContext(PlaybackTransportContext);
  const containerRef = useRef<HTMLDivElement>(null);

  if (loading || !data) {
    return (
      <div className="flex h-7 w-full items-center justify-center opacity-50">
        <div className="h-0.5 w-full bg-[var(--color-text-muted)] opacity-30" />
      </div>
    );
  }

  const { peaks, durationSec } = data;
  const currentTime = isActive ? (transport?.currentTime ?? 0) : 0;
  // If transport duration isn't available, fallback to the decoded duration
  const totalTime = isActive && transport?.duration && transport.duration > 0 ? transport.duration : durationSec;
  const progressPercent = isActive && totalTime > 0 ? Math.min(1, Math.max(0, currentTime / totalTime)) : 0;


  const handleSeek = (e: MouseEvent<HTMLDivElement>) => {
    if (!transport || totalTime <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    transport.seek(percentage * totalTime);
  };

  return (
    <div 
      ref={containerRef}
      className="group relative flex h-7 w-full cursor-pointer items-end"
      onPointerDown={(e) => {
        // Prevent event from bubbling up and triggering track row play/pause
        e.stopPropagation();
        handleSeek(e);
      }}
    >
      <svg
        viewBox={`0 0 ${peaks.length} 100`}
        preserveAspectRatio="none"
        className="h-full w-full"
        style={{
          // Use CSS variables for easy theming
          '--waveform-played': 'var(--color-brand)',
          '--waveform-unplayed': 'rgba(255, 255, 255, 0.2)',
        } as React.CSSProperties}
      >
        <defs>
          <linearGradient id="waveform-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset={`${progressPercent * 100}%`} stopColor="var(--waveform-played)" />
            <stop offset={`${progressPercent * 100}%`} stopColor="var(--waveform-unplayed)" />
          </linearGradient>
        </defs>
        
        {peaks.map((peak, i) => {
          // peak is generally between 0 and 1, normalize to 100 max height
          const height = Math.max(2, peak * 100); 
          const y = 100 - height;
          return (
            <rect
              key={i}
              x={i}
              y={y}
              width={0.7}
              height={height}
              fill="url(#waveform-gradient)"
              rx={0.35}
            />
          );
        })}
      </svg>
    </div>
  );
}
