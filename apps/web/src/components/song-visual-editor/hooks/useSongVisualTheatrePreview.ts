import { useEffect, useRef, type RefObject } from "react";

import { getAudioAnalyserConnection, getOrCreateAudioAnalyserConnection } from "@/features/playback-indicators/audioAnalyser";
import AudioFeatureExtractor from "@/theatre/audio/AudioFeatureExtractor";
import { TheatreAudioBus } from "@/theatre/audio/TheatreAudioBus";
import AnimationBridge from "@/theatre/controller/AnimationBridge";
import { buildAnimationFrameContext } from "@/theatre/controller/theatreFrameContext";
import type { AnimationContext } from "@/theatre/core/IAnimation";
import { attachmentToScenePreset } from "@/theatre/media/attachmentToScenePreset";
import { registerDynamicPreset } from "@/theatre/media/dynamicPresetStore";

import { buildPreviewAnimationFactories } from "../preview/buildPreviewAnimationFactories";
import { clipToVisualMediaAttachment } from "../preview/clipToVisualMediaAttachment";
import { ensureSongVisualPreviewEngine } from "../preview/ensureSongVisualPreviewEngine";
import { readClipAudioPulse } from "../audioPulse";
import type { TimelineClip } from "../types";

type UseSongVisualTheatrePreviewArgs = {
  containerRef: RefObject<HTMLElement | null>;
  audioRef: RefObject<HTMLAudioElement | null>;
  clip: TimelineClip | null;
  isPlaying: boolean;
};

export function useSongVisualTheatrePreview({
  containerRef,
  audioRef,
  clip,
  isPlaying,
}: UseSongVisualTheatrePreviewArgs) {
  const bridgeRef = useRef<AnimationBridge | null>(null);
  const layerRef = useRef<HTMLElement | null>(null);
  const clipIdRef = useRef<string | null>(null);
  const clipRef = useRef<TimelineClip | null>(clip);
  const audioBusRef = useRef(new TheatreAudioBus());
  const extractorRef = useRef<AudioFeatureExtractor | null>(null);
  const frameContextRef = useRef<AnimationContext | null>(null);
  const rafRef = useRef<number | null>(null);

  clipRef.current = clip;
  const needsAudioAnalysis = clip ? readClipAudioPulse(clip.attachment) : false;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !needsAudioAnalysis) {
      extractorRef.current = null;
      return;
    }

    try {
      const connection = getOrCreateAudioAnalyserConnection(audio);
      extractorRef.current = new AudioFeatureExtractor(connection.analyser);
      if (!audio.paused) {
        void connection.context.resume();
      }
    } catch {
      extractorRef.current = null;
    }
  }, [audioRef, clip?.attachment.id, needsAudioAnalysis]);

  useEffect(() => {
    const container = containerRef.current;
    let cancelled = false;

    async function teardownBridge() {
      if (bridgeRef.current) {
        await bridgeRef.current.exit();
        bridgeRef.current = null;
      }
      if (layerRef.current?.parentElement) {
        layerRef.current.parentElement.removeChild(layerRef.current);
      }
      layerRef.current = null;
      clipIdRef.current = null;
      frameContextRef.current = null;
      audioBusRef.current.reset();
    }

    async function mountClip(nextClip: TimelineClip) {
      ensureSongVisualPreviewEngine();
      if (cancelled || !container) return;

      const attachment = clipToVisualMediaAttachment(nextClip);
      const preset = attachmentToScenePreset(attachment);
      registerDynamicPreset(preset);

      if (clipIdRef.current === nextClip.attachment.id && bridgeRef.current) {
        return;
      }

      await teardownBridge();
      if (cancelled || !container) return;

      const layer = document.createElement("div");
      layer.className = "absolute inset-0 overflow-hidden";
      layer.style.pointerEvents = "none";
      container.appendChild(layer);
      layerRef.current = layer;

      const audio = audioRef.current;
      const analyser = audio ? getAudioAnalyserConnection(audio)?.analyser : null;
      const { ctx } = buildAnimationFrameContext({
        audioEl: audio,
        analyser,
        mediaSrc: null,
        artworkUrl: attachment.thumbnailUrl ?? attachment.url,
      });
      frameContextRef.current = ctx;

      const bridge = new AnimationBridge();
      await bridge.enter(layer, buildPreviewAnimationFactories(preset), ctx, { presetId: preset.id });
      if (!isPlaying) bridge.pause();

      bridgeRef.current = bridge;
      clipIdRef.current = nextClip.attachment.id;
    }

    if (!container || !clip) {
      void teardownBridge();
      return () => {
        cancelled = true;
        void teardownBridge();
      };
    }

    void mountClip(clip);

    return () => {
      cancelled = true;
      void teardownBridge();
    };
  }, [audioRef, clip?.attachment.id, containerRef]);

  useEffect(() => {
    const timeRef = { elapsed: 0, delta: 0, frame: 0 };
    let lastTime = performance.now();
    const startTime = lastTime;

    const tick = () => {
      const bridge = bridgeRef.current;
      const baseCtx = frameContextRef.current;
      const activeClip = clipRef.current;

      if (bridge && baseCtx && activeClip) {
        const now = performance.now();
        const delta = now - lastTime;
        lastTime = now;
        timeRef.delta = delta;
        timeRef.elapsed = now - startTime;
        timeRef.frame += 1;

        try {
          extractorRef.current?.update();
        } catch {
          // ignore analyser read errors during preview
        }

        const features = extractorRef.current?.getFeatures();
        const audioSnapshot = audioBusRef.current.tick(features, delta);
        const preset = attachmentToScenePreset(clipToVisualMediaAttachment(activeClip));
        const layerOptions = preset.layers[0]?.options ?? {};

        const frameCtx: AnimationContext = {
          ...baseCtx,
          audioElement: audioRef.current,
          options: { ...layerOptions },
          shared: {
            ...baseCtx.shared,
            features,
            audio: audioSnapshot,
            time: timeRef,
          },
        };

        bridge.renderFrame(frameCtx);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [audioRef]);

  useEffect(() => {
    if (!clip) return;

    if (isPlaying) {
      bridgeRef.current?.resume();
      const audio = audioRef.current;
      const connection = audio ? getAudioAnalyserConnection(audio) : null;
      if (connection) void connection.context.resume();
      return;
    }

    bridgeRef.current?.pause();
  }, [audioRef, clip?.attachment.id, isPlaying]);
}
