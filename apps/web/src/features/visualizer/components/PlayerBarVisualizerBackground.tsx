import { useRef, type RefObject } from "react";

import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import { useVisualizer } from "../VisualizerProvider";
import { useBarVisualizerLoop } from "../useBarVisualizerLoop";

type PlayerBarVisualizerBackgroundProps = {
  containerRef: RefObject<HTMLElement | null>;
};

export function PlayerBarVisualizerBackground({ containerRef }: PlayerBarVisualizerBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { currentTrack, isPlaying } = useAudioPlayer();
  const { settings } = useVisualizer();

  const active = currentTrack !== null;
  useBarVisualizerLoop({ containerRef, canvasRef, active });

  const visible = active && settings.enabled && isPlaying;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 h-full w-full ${visible ? "opacity-100" : "opacity-0"}`}
    />
  );
}
