import { Film, ImageIcon, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import AnimationBridge from "@/theatre/controller/AnimationBridge";
import { buildAnimationFrameContext } from "@/theatre/controller/theatreFrameContext";
import type { AnimationContext } from "@/theatre/core/IAnimation";
import { getPreset } from "@/theatre/registry/scenePresets";

import { buildPreviewAnimationFactories } from "./preview/buildPreviewAnimationFactories";
import { ensureSongVisualPreviewEngine } from "./preview/ensureSongVisualPreviewEngine";

const PLACEHOLDER_ARTWORK = "/favicon.svg";
const STILL_FRAME_TIME_MS = 1_200;

export type TheatrePresetThumbnailKind = "animations" | "videos" | "images";

const snapshotCache = new Map<string, string>();

type TheatrePresetThumbnailProps = {
  presetId: string;
  kind: TheatrePresetThumbnailKind;
  className?: string;
};

export function TheatrePresetThumbnail({
  presetId,
  kind,
  className = "",
}: TheatrePresetThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cacheKey = `${kind}:${presetId}`;
  const [snapshotUrl, setSnapshotUrl] = useState(() => snapshotCache.get(cacheKey) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSnapshotUrl(snapshotCache.get(cacheKey) ?? null);
    setFailed(false);
  }, [cacheKey]);

  useEffect(() => {
    if (snapshotUrl) return;

    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let bridge: AnimationBridge | null = null;

    async function mount() {
      const host = containerRef.current;
      if (!host || disposed) return;

      ensureSongVisualPreviewEngine();
      const preset = getPreset(presetId);
      if (!preset) {
        setFailed(true);
        return;
      }
      if (disposed) return;

      const layer = document.createElement("div");
      layer.className = "absolute inset-0 overflow-hidden";
      host.replaceChildren(layer);

      const timeRef = { elapsed: STILL_FRAME_TIME_MS, delta: 16, frame: 1 };
      const { ctx } = buildAnimationFrameContext({
        audioEl: null,
        mediaSrc: null,
        artworkUrl: kind === "images" ? PLACEHOLDER_ARTWORK : null,
        existingTimeRef: timeRef,
      });

      const frameCtx: AnimationContext = {
        ...ctx,
        shared: {
          ...ctx.shared,
          time: timeRef,
        },
      };

      bridge = new AnimationBridge();
      try {
        await bridge.enter(layer, buildPreviewAnimationFactories(preset), frameCtx, { presetId });
        await nextFrame();
        await nextFrame();
        if (disposed) return;

        bridge.renderFrame(frameCtx);

        const snapshot = captureCanvasSnapshot(layer);
        if (snapshot) {
          snapshotCache.set(cacheKey, snapshot);
          await bridge.exit();
          bridge = null;
          host.replaceChildren();
          if (!disposed) setSnapshotUrl(snapshot);
        }
      } catch {
        if (!disposed) setFailed(true);
      }
    }

    void mount();

    return () => {
      disposed = true;
      void bridge?.exit();
      if (container) container.replaceChildren();
    };
  }, [cacheKey, kind, presetId, snapshotUrl]);

  if (failed) {
    return <TheatrePresetThumbnailFallback kind={kind} className={className} />;
  }

  if (snapshotUrl) {
    return <img src={snapshotUrl} alt="" className={["h-full w-full object-cover", className].join(" ")} />;
  }

  return (
    <div
      ref={containerRef}
      className={["relative h-full w-full overflow-hidden bg-black", className].join(" ")}
    />
  );
}

export function TheatrePresetThumbnailFallback({
  kind,
  className,
}: {
  kind: TheatrePresetThumbnailKind;
  className?: string;
}) {
  const Icon = kind === "videos" ? Film : kind === "images" ? ImageIcon : Sparkles;

  return (
    <div
      className={[
        "flex h-full w-full items-center justify-center bg-gradient-to-br from-white/10 via-black to-white/5 text-white/45",
        className,
      ].join(" ")}
    >
      <Icon size={22} strokeWidth={1.5} />
    </div>
  );
}

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

function captureCanvasSnapshot(layer: HTMLElement) {
  const canvases = Array.from(layer.querySelectorAll("canvas"))
    .filter((canvas) => canvas.width > 0 && canvas.height > 0);

  if (!canvases.length) return null;

  const width = Math.max(...canvases.map((canvas) => canvas.width));
  const height = Math.max(...canvases.map((canvas) => canvas.height));
  if (!width || !height) return null;

  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;
  const context = output.getContext("2d");
  if (!context) return null;

  try {
    for (const canvas of canvases) {
      const opacity = Number.parseFloat(canvas.style.opacity || "1");
      context.globalAlpha = Number.isFinite(opacity) ? opacity : 1;
      context.drawImage(canvas, 0, 0, width, height);
    }
    context.globalAlpha = 1;
    return output.toDataURL("image/webp", 0.78);
  } catch {
    return null;
  }
}
