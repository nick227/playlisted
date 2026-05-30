import { useEffect, useMemo, useRef, useState } from "react";

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

function isTabVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState !== "hidden";
}

export function PersistentVisualizerLayer({ surface = "default" }: PersistentVisualizerLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef(createCanvasVisualizerRenderer());
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const slowFramesRef = useRef(0);
  const canvasSizeRef = useRef({ width: 0, height: 0 });
  const surfaceRef = useRef(surface);
  surfaceRef.current = surface;

  const [tabVisible, setTabVisible] = useState(isTabVisible);
  const surfaceHidden = surface === "hidden";

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

  useEffect(() => {
    const onVisibility = () => setTabVisible(isTabVisible());
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

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
      // Read from the canvas element itself so the height respects the container's
      // bottom boundary above the media player, not the full viewport.
      const width = canvas.offsetWidth || window.innerWidth;
      const height = canvas.offsetHeight || window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvasSizeRef.current = { width, height };
      rendererRef.current.resize(width, height, dpr);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (analyserState.error) {
      handleVisualizerError(analyserState.error, disableForReason);
    }
  }, [analyserState.error, disableForReason]);

  // The loop only runs while music is playing. settings.enabled, isPlaying, surfaceHidden,
  // and tabVisible determine whether the loop runs. Palette, seed, settings, analyser, and
  // route surface (via surfaceRef) are read inside tick without restarting the loop.
  useEffect(() => {
    if (!settings.enabled || !isPlaying || surfaceHidden || !tabVisible) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    let cancelled = false;

    function tick(time: number) {
      if (cancelled || !canvasRef.current) return;
      if (surfaceRef.current === "hidden") return;

      const ctx = rendererRef.current.getContext();
      if (!ctx) return;

      const { width, height } = canvasSizeRef.current;
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
          surface: surfaceRef.current,
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
      lastTimeRef.current = 0;
    };
  }, [disableForReason, isPlaying, settings.enabled, surfaceHidden, tabVisible]);

  const visible = settings.enabled && isPlaying && !surfaceHidden;

  return (
    <div
      className="pointer-events-none fixed top-0 right-0 left-0 bottom-[var(--spacing-player-safe-mobile)] z-0 overflow-hidden md:bottom-[var(--spacing-player)]"
      aria-hidden="true"
      data-visualizer-layer=""
      data-visualizer-surface={surface}
      style={visible ? undefined : { display: "none" }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
