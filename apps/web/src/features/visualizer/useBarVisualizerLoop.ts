import { useEffect, useMemo, useRef, type RefObject } from "react";

import { useAudioPlayer } from "@/providers/AudioPlayerProvider";

import { handleVisualizerError, useVisualizer } from "./VisualizerProvider";
import { drawBars } from "./renderers/modes/drawBars";
import { useAudioAnalyser } from "./useAudioAnalyser";
import { bindVisualizerCanvas } from "./visualizerCanvas";
import { getVisualizerPalette } from "./visualizerPalettes";
import { createVisualizerSeed } from "./visualizerSeed";
import type { VisualizerFrame } from "./visualizerTypes";

const SLOW_FRAME_LIMIT = 80;
const SLOW_FRAME_MS = 42;

function isTabVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState !== "hidden";
}

type UseBarVisualizerLoopOptions = {
  containerRef: RefObject<HTMLElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  active: boolean;
};

export function useBarVisualizerLoop({ containerRef, canvasRef, active }: UseBarVisualizerLoopOptions) {
  const { audioRef, currentTrack, state, isPlaying } = useAudioPlayer();
  const { settings, disableForReason } = useVisualizer();
  const analyserState = useAudioAnalyser(audioRef);
  const palette = useMemo(() => getVisualizerPalette(settings.paletteId), [settings.paletteId]);
  const seed = useMemo(() => createVisualizerSeed(currentTrack?.id), [currentTrack?.id]);

  const canvasSizeRef = useRef({ width: 0, height: 0 });
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const slowFramesRef = useRef(0);

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
    if (analyserState.error) {
      handleVisualizerError(analyserState.error, disableForReason);
    }
  }, [analyserState.error, disableForReason]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    function resize() {
      const nextCanvas = canvasRef.current;
      const nextContainer = containerRef.current;
      if (!nextCanvas || !nextContainer) return;
      const width = nextContainer.clientWidth;
      const height = nextContainer.clientHeight;
      if (width <= 0 || height <= 0) return;
      const bound = bindVisualizerCanvas(nextCanvas, width, height, window.devicePixelRatio || 1);
      if (!bound) return;
      canvasSizeRef.current = { width, height };
      canvasCtxRef.current = bound.ctx;
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [active, containerRef, canvasRef]);

  useEffect(() => {
    const shouldRun = active && settings.enabled && isPlaying && isTabVisible();
    if (!shouldRun) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    let cancelled = false;

    function tick(time: number) {
      if (cancelled) return;
      const ctx = canvasCtxRef.current;
      const { width, height } = canvasSizeRef.current;
      if (!ctx || width <= 0 || height <= 0) return;

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
        }

        ctx.clearRect(0, 0, width, height);
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
        };
        drawBars(frame);
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
  }, [active, disableForReason, isPlaying, settings.enabled]);
}
