import { useEffect, useMemo, useRef } from "react";

import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import { handleVisualizerError, useVisualizer } from "./VisualizerProvider";
import { createCanvasVisualizerRenderer } from "./renderers/canvasRenderer";
import { useAudioAnalyser } from "./useAudioAnalyser";
import { getVisualizerPalette } from "./visualizerPalettes";
import { createVisualizerSeed } from "./visualizerSeed";
import type { VisualizerFrame, VisualizerSurface } from "./visualizerTypes";

type PersistentVisualizerLayerProps = {
  surface?: VisualizerSurface;
};

const SLOW_FRAME_LIMIT = 80;
const SLOW_FRAME_MS = 42;

export function PersistentVisualizerLayer({ surface = "default" }: PersistentVisualizerLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef(createCanvasVisualizerRenderer());
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const slowFramesRef = useRef(0);

  const { audioRef, currentTrack, state, isPlaying } = useAudioPlayer();
  const { settings, disableForReason } = useVisualizer();
  const analyserState = useAudioAnalyser(audioRef);
  const palette = useMemo(() => getVisualizerPalette(settings.paletteId), [settings.paletteId]);
  const seed = useMemo(() => createVisualizerSeed(currentTrack?.id), [currentTrack?.id]);

  // Refs for values read inside the RAF loop so changes to them don't restart the loop.
  const analyserStateRef = useRef(analyserState);
  analyserStateRef.current = analyserState;
  const paletteRef = useRef(palette);
  paletteRef.current = palette;
  const seedRef = useRef(seed);
  seedRef.current = seed;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const stateRef = useRef(state);
  stateRef.current = state;

  // Canvas is always rendered (not conditionally) so mount runs once and the renderer's
  // canvas ref stays valid for the component lifetime. Hiding is done via CSS only.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      rendererRef.current.mount(canvas);
    } catch (error) {
      handleVisualizerError(error, disableForReason);
    }
    return () => {
      rendererRef.current.destroy();
    };
  }, [disableForReason]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function resize() {
      if (!canvas) return;
      // Read from the canvas element so height respects the container's bottom
      // boundary above the media player, not the full viewport height.
      const width = canvas.offsetWidth || window.innerWidth;
      const height = canvas.offsetHeight || window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      rendererRef.current.resize(width, height, dpr);
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    if (analyserState.error) {
      handleVisualizerError(analyserState.error, disableForReason);
    }
  }, [analyserState.error, disableForReason]);

  // The loop only runs while music is playing. settings.enabled, isPlaying, and surface
  // determine whether the loop runs. Everything read inside tick is accessed via refs
  // so those changes are picked up without restarting the loop.
  useEffect(() => {
    if (!settings.enabled || !isPlaying || surface === "hidden") {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    let cancelled = false;

    function tick(time: number) {
      if (cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const width = canvas.offsetWidth || window.innerWidth;
      const height = canvas.offsetHeight || window.innerHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const delta = lastTimeRef.current ? time - lastTimeRef.current : 16;
      lastTimeRef.current = time;

      const currentState = stateRef.current;
      if (delta > SLOW_FRAME_MS && currentState === "playing") {
        slowFramesRef.current += 1;
        if (slowFramesRef.current > SLOW_FRAME_LIMIT) {
          disableForReason("performance");
          return;
        }
      } else {
        slowFramesRef.current = Math.max(0, slowFramesRef.current - 1);
      }

      try {
        const { analyser, frequencyData, timeData } = analyserStateRef.current;
        if (analyser) {
          analyser.getByteFrequencyData(frequencyData as Uint8Array<ArrayBuffer>);
          analyser.getByteTimeDomainData(timeData as Uint8Array<ArrayBuffer>);
        }
        const frame: VisualizerFrame = {
          ctx,
          width,
          height,
          frequencyData,
          timeData,
          settings: settingsRef.current,
          palette: paletteRef.current,
          seed: seedRef.current,
          playbackState: currentState,
          time,
          delta,
          surface,
        };
        rendererRef.current.render(frame);
      } catch (error) {
        handleVisualizerError(error, disableForReason);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [disableForReason, isPlaying, settings.enabled, surface]);

  // Keep canvas always in the DOM so mount/resize run once and renderer ctx stays valid.
  // Use visibility:hidden (invisible) not display:none — hidden preserves offsetWidth/Height.
  const shouldShow = settings.enabled && isPlaying && surface !== "hidden";

  return (
    <div
      className={`pointer-events-none fixed top-0 right-0 left-0 bottom-[var(--spacing-player-safe-mobile)] z-0 overflow-hidden md:bottom-[var(--spacing-player)]${shouldShow ? "" : " invisible"}`}
      aria-hidden="true"
      data-visualizer-layer=""
      data-visualizer-active={shouldShow ? "true" : "false"}
      data-visualizer-surface={surface}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
