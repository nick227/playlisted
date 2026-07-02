import { useEffect, useMemo, useRef } from "react";

import type { VisualMediaAssetRecord } from "@/lib/visualMediaApi";

import { resolveAssetUrl, type TimelineClip } from "./types";

const DEFAULT_ASPECT = 16 / 9;
const MAX_PREVIEW_ASPECT = 16 / 9;

function previewAspectRatio(media: VisualMediaAssetRecord | null): number {
  if (!media?.width || !media?.height) return DEFAULT_ASPECT;
  const native = media.width / media.height;
  return Math.min(native, MAX_PREVIEW_ASPECT);
}

type SongVisualEditorPreviewProps = {
  clip: TimelineClip | null;
  isPlaying: boolean;
  currentTimeSec: number;
};

export function SongVisualEditorPreview({
  clip,
  isPlaying,
  currentTimeSec,
}: SongVisualEditorPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const attachment = clip?.attachment ?? null;
  const media = attachment?.mediaAsset ?? null;
  const loop = clip?.loop ?? true;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || media?.mediaType !== "video") return;

    const clipTimeSec = Math.max(0, currentTimeSec - (clip?.startSec ?? 0));
    const localTimeSec = loop
      ? clipTimeSec % Math.max(video.duration || clip?.naturalDurationSec || 1, 0.001)
      : Math.min(clipTimeSec, clip?.naturalDurationSec ?? clipTimeSec);

    if (Math.abs(video.currentTime - localTimeSec) > 0.25) {
      video.currentTime = localTimeSec;
    }

    if (isPlaying && video.paused) {
      void video.play().catch(() => undefined);
      return;
    }
    if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [clip, clip?.loop, clip?.naturalDurationSec, clip?.startSec, currentTimeSec, isPlaying, loop, media?.mediaType]);

  const aspectRatio = useMemo(() => previewAspectRatio(media), [media]);

  return (
    <div className="flex justify-center">
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-white/10 bg-black"
        style={{ aspectRatio }}
      >
      {!media ? (
        <div className="flex h-full w-full items-center justify-center px-6 text-center">
          <p className="text-sm text-white/35">Scrub the timeline or add a clip from your library</p>
        </div>
      ) : media.mediaType === "video" ? (
        <video
          ref={videoRef}
          src={resolveAssetUrl(media.url)}
          className="h-full w-full object-contain"
          muted
          playsInline
          loop={loop}
        />
      ) : (
        <img
          src={resolveAssetUrl(media.thumbnailUrl ?? media.url)}
          alt={attachment?.label ?? media.originalName}
          className="h-full w-full object-contain"
        />
      )}

      {media ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
          <p className="truncate text-sm font-medium text-white">
            {attachment?.label ?? media.originalName}
          </p>
          <p className="text-xs text-white/60">
            {media.mediaType}
            {loop ? " · loop" : ` · ${clip?.naturalDurationSec.toFixed(0)}s max`}
            {attachment?.beatFx?.enabled ? " · beat reactive" : ""}
          </p>
        </div>
      ) : null}
      </div>
    </div>
  );
}
