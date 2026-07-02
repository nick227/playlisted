import { useEffect, useRef } from "react";

type SongVisualEditorWaveformProps = {
  peaks: number[];
  durationSec: number;
  currentTimeSec: number;
  onSeek: (timeSec: number) => void;
};

export function SongVisualEditorWaveform({
  peaks,
  durationSec,
  currentTimeSec,
  onSeek,
}: SongVisualEditorWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || peaks.length === 0 || durationSec <= 0) return;

    const draw = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const context = canvas.getContext("2d");
      if (!context) return;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      const maxPeak = Math.max(...peaks, 0.001);
      const barWidth = width / peaks.length;
      const centerY = height / 2;

      context.fillStyle = "rgba(255,255,255,0.18)";
      for (let index = 0; index < peaks.length; index += 1) {
        const normalized = peaks[index]! / maxPeak;
        const barHeight = Math.max(2, normalized * (height - 8));
        const x = index * barWidth;
        context.fillRect(x, centerY - barHeight / 2, Math.max(1, barWidth - 0.5), barHeight);
      }

      const playheadX = (currentTimeSec / durationSec) * width;
      context.strokeStyle = "rgba(16, 185, 129, 0.95)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(playheadX, 0);
      context.lineTo(playheadX, height);
      context.stroke();
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [currentTimeSec, durationSec, peaks]);

  function handlePointerSeek(clientX: number) {
    const container = containerRef.current;
    if (!container || durationSec <= 0) return;
    const rect = container.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(ratio * durationSec);
  }

  return (
    <div
      ref={containerRef}
      className="relative h-20 w-full cursor-crosshair overflow-hidden rounded-lg border border-white/10 bg-black/40"
      onClick={(event) => handlePointerSeek(event.clientX)}
      role="slider"
      aria-label="Audio waveform"
      aria-valuemin={0}
      aria-valuemax={durationSec}
      aria-valuenow={currentTimeSec}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
