import { useEffect, useRef, type RefObject } from "react";

import { getAudioAnalyserConnection, getOrCreateAudioAnalyserConnection } from "@/features/playback-indicators/audioAnalyser";
import AudioFeatureExtractor from "@/theatre/audio/AudioFeatureExtractor";
import { TheatreAudioBus } from "@/theatre/audio/TheatreAudioBus";
import AnimationBridge from "@/theatre/controller/AnimationBridge";
import { buildAnimationFrameContext, withTheatreInitContext } from "@/theatre/controller/theatreFrameContext";
import type { AnimationContext, AnimationFactory, InternalAnimationOptions } from "@/theatre/core/IAnimation";
import { attachmentToScenePreset } from "@/theatre/media/attachmentToScenePreset";
import { registerDynamicPreset } from "@/theatre/media/dynamicPresetStore";
import type { SongAtmosphereFx } from "@/theatre/media/types";
import { DEFAULT_ATMOSPHERE_FX_PRESET_ID } from "@/theatre/atmosphere/catalog";
import { blendModeForPreset } from "@/theatre/atmosphere/AtmosphereFxLayer";
import { resolveAtmosphereFx } from "@/theatre/atmosphere/resolveAtmosphereFx";
import registry from "@/theatre/registry";

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
  atmosphereFx: SongAtmosphereFx;
};

export function useSongVisualTheatrePreview({
  containerRef,
  audioRef,
  clip,
  isPlaying,
  atmosphereFx,
}: UseSongVisualTheatrePreviewArgs) {
  const bridgeRef = useRef<AnimationBridge | null>(null);
  const layerRef = useRef<HTMLElement | null>(null);
  const clipIdRef = useRef<string | null>(null);
  const clipRef = useRef<TimelineClip | null>(clip);
  const audioBusRef = useRef(new TheatreAudioBus());
  const extractorRef = useRef<AudioFeatureExtractor | null>(null);
  const frameContextRef = useRef<AnimationContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const isPlayingRef = useRef(isPlaying);

  const atmosphereBridgeRef = useRef<AnimationBridge | null>(null);
  const atmosphereLayerRef = useRef<HTMLElement | null>(null);
  const atmosphereKeyRef = useRef<string | null>(null);
  const atmosphereFrameContextRef = useRef<AnimationContext | null>(null);
  const atmosphereLayerOptionsRef = useRef<InternalAnimationOptions | null>(null);

  clipRef.current = clip;
  isPlayingRef.current = isPlaying;
  // Atmosphere may need live audio even with no clip attached (it's a
  // full-frame ambient layer, independent of any specific media asset).
  const needsAudioAnalysis = (clip ? readClipAudioPulse(clip.attachment) : false) || atmosphereFx.mode !== "off";

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
      layer.className = "pointer-events-none absolute inset-0 overflow-hidden [&_*]:pointer-events-none";
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

  // Atmosphere overlay — fully independent of the clip lifecycle above (it's
  // a background ambiance layer, not tied to a specific media asset), so it
  // only remounts when the song's own atmosphere choice changes.
  useEffect(() => {
    const container = containerRef.current;
    let cancelled = false;

    async function teardownAtmosphere() {
      if (atmosphereBridgeRef.current) {
        await atmosphereBridgeRef.current.exit();
        atmosphereBridgeRef.current = null;
      }
      if (atmosphereLayerRef.current?.parentElement) {
        atmosphereLayerRef.current.parentElement.removeChild(atmosphereLayerRef.current);
      }
      atmosphereLayerRef.current = null;
      atmosphereKeyRef.current = null;
      atmosphereFrameContextRef.current = null;
      atmosphereLayerOptionsRef.current = null;
    }

    async function mountAtmosphere() {
      ensureSongVisualPreviewEngine();
      if (cancelled || !container) return;

      // No live rotation engine in the editor — preview always resolves
      // against the named default preset rather than "engine picked nothing."
      const resolved = resolveAtmosphereFx({
        hidden: false,
        globalPresetId: DEFAULT_ATMOSPHERE_FX_PRESET_ID,
        globalIntensity: "normal",
        song: atmosphereFx,
        reducedMotion: false,
        lowPower: false,
      });

      if (!resolved.active) {
        await teardownAtmosphere();
        return;
      }

      const key = `${resolved.animationId}:${resolved.intensity}:${resolved.intensityGain}:${resolved.fxAmount ?? "default"}`;
      if (atmosphereKeyRef.current === key && atmosphereBridgeRef.current) return;

      const entry = registry.get(resolved.animationId);
      if (!entry) return;

      await teardownAtmosphere();
      if (cancelled || !container) return;

      const layer = document.createElement("div");
      layer.className = "pointer-events-none absolute inset-0 overflow-hidden [&_*]:pointer-events-none";
      layer.style.zIndex = "1";
      container.appendChild(layer);
      atmosphereLayerRef.current = layer;

      const layerOptions: InternalAnimationOptions = {
        role: "overlay",
        opacity: 1,
        blendMode: blendModeForPreset(resolved.presetId),
        intensity: resolved.intensityGain,
        sensitivity: resolved.intensityGain,
        preset: resolved.intensity === "strong" ? "chaos" : resolved.intensity === "subtle" ? "tame" : "vivid",
        fxAmount: resolved.fxAmount,
      };
      atmosphereLayerOptionsRef.current = layerOptions;

      const audio = audioRef.current;
      const analyser = audio ? getAudioAnalyserConnection(audio)?.analyser : null;
      const { ctx } = buildAnimationFrameContext({
        audioEl: audio,
        analyser,
        mediaSrc: null,
        artworkUrl: null,
      });
      atmosphereFrameContextRef.current = ctx;

      const factory: AnimationFactory = (ctxParam) => {
        const initContext: AnimationContext = { ...ctxParam, options: { ...layerOptions } };
        return withTheatreInitContext(entry.factory(initContext), initContext);
      };

      const bridge = new AnimationBridge();
      await bridge.enter(layer, [factory], ctx, { presetId: `atmosphere-preview:${resolved.presetId}` });
      if (!isPlayingRef.current) bridge.pause();

      atmosphereBridgeRef.current = bridge;
      atmosphereKeyRef.current = key;
    }

    void mountAtmosphere();

    return () => {
      cancelled = true;
      void teardownAtmosphere();
    };
  }, [audioRef, containerRef, atmosphereFx.mode, atmosphereFx.presetId]);

  useEffect(() => {
    const timeRef = { elapsed: 0, delta: 0, frame: 0 };
    let lastTime = performance.now();
    const startTime = lastTime;

    const tick = () => {
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

      const bridge = bridgeRef.current;
      const baseCtx = frameContextRef.current;
      const activeClip = clipRef.current;
      if (bridge && baseCtx && activeClip) {
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

      const atmosphereBridge = atmosphereBridgeRef.current;
      const atmosphereBaseCtx = atmosphereFrameContextRef.current;
      const atmosphereOptions = atmosphereLayerOptionsRef.current;
      if (atmosphereBridge && atmosphereBaseCtx && atmosphereOptions) {
        const atmosphereFrameCtx: AnimationContext = {
          ...atmosphereBaseCtx,
          audioElement: audioRef.current,
          options: { ...atmosphereOptions },
          shared: {
            ...atmosphereBaseCtx.shared,
            features,
            audio: audioSnapshot,
            time: timeRef,
          },
        };

        atmosphereBridge.renderFrame(atmosphereFrameCtx);
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

  useEffect(() => {
    if (isPlaying) {
      atmosphereBridgeRef.current?.resume();
    } else {
      atmosphereBridgeRef.current?.pause();
    }
  }, [isPlaying]);
}
