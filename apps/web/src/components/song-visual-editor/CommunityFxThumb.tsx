import { Film, ImageIcon, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import AnimationBridge from "@/theatre/controller/AnimationBridge";
import { buildAnimationFrameContext } from "@/theatre/controller/theatreFrameContext";
import type { AnimationContext } from "@/theatre/core/IAnimation";
import { getPreset } from "@/theatre/registry/scenePresets";

import { buildPreviewAnimationFactories } from "./preview/buildPreviewAnimationFactories";
import { ensureSongVisualPreviewEngine } from "./preview/ensureSongVisualPreviewEngine";
import { resolveAssetUrl } from "./types";
import type { VisualLibraryRow } from "./useSongVisualLibraryItems";

const PLACEHOLDER_ARTWORK = "/favicon.svg";

type CommunityFxThumbProps = {
  row: VisualLibraryRow;
  className?: string;
};

export function CommunityFxThumb({ row, className = "" }: CommunityFxThumbProps) {
  if (row.communityKind === "videos" && row.thumbUrl) {
    return <CommunityVideoThumb url={row.thumbUrl} label={row.label} className={className} />;
  }

  if (row.theatrePresetId) {
    return (
      <TheatrePresetStillThumb
        presetId={row.theatrePresetId}
        kind={row.communityKind ?? "animations"}
        className={className}
      />
    );
  }

  return <CommunityFxFallback kind={row.communityKind ?? "animations"} className={className} />;
}

function CommunityVideoThumb({
  url,
  label,
  className,
}: {
  url: string;
  label: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function primeFrame() {
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
      video.currentTime = Math.min(0.25, video.duration * 0.05);
    }

    video.addEventListener("loadeddata", primeFrame, { once: true });
    return () => video.removeEventListener("loadeddata", primeFrame);
  }, [url]);

  if (failed) {
    return <CommunityFxFallback kind="videos" className={className} />;
  }

  return (
    <video
      ref={videoRef}
      src={resolveAssetUrl(url)}
      className={["h-full w-full object-cover", className].join(" ")}
      aria-label={label}
      muted
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
    />
  );
}

function TheatrePresetStillThumb({
  presetId,
  kind,
  className,
}: {
  presetId: string;
  kind: NonNullable<VisualLibraryRow["communityKind"]>;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let bridge: AnimationBridge | null = null;

    async function mount() {
      const host = containerRef.current;
      if (!host || disposed) return;

      ensureSongVisualPreviewEngine();
      const preset = getPreset(presetId);
      if (!preset || disposed) return;

      const layer = document.createElement("div");
      layer.className = "absolute inset-0 overflow-hidden";
      host.replaceChildren(layer);

      const timeRef = { elapsed: 1_200, delta: 16, frame: 1 };
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
        if (disposed) return;
        bridge.renderFrame(frameCtx);
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
  }, [kind, presetId]);

  if (failed) {
    return <CommunityFxFallback kind={kind} className={className} />;
  }

  return (
    <div
      ref={containerRef}
      className={["relative h-full w-full overflow-hidden bg-black", className].join(" ")}
    />
  );
}

function CommunityFxFallback({
  kind,
  className,
}: {
  kind: NonNullable<VisualLibraryRow["communityKind"]>;
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
