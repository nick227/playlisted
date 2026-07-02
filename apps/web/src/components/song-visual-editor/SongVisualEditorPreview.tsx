import { useMemo, useRef, type RefObject } from "react";

import type { VisualMediaAssetRecord } from "@/lib/visualMediaApi";

import { useSongVisualTheatrePreview } from "./hooks/useSongVisualTheatrePreview";
import { readClipAudioPulse } from "./audioPulse";
import type { TimelineClip } from "./types";

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
  audioRef: RefObject<HTMLAudioElement | null>;
};

export function SongVisualEditorPreview({
  clip,
  isPlaying,
  audioRef,
}: SongVisualEditorPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const attachment = clip?.attachment ?? null;
  const media = attachment?.mediaAsset ?? null;
  const loop = clip?.loop ?? true;
  const audioPulse = attachment ? readClipAudioPulse(attachment) : false;

  useSongVisualTheatrePreview({
    containerRef,
    audioRef,
    clip,
    isPlaying,
  });

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
        ) : (
          <div ref={containerRef} className="absolute inset-0" />
        )}

        {media ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
            <p className="truncate text-sm font-medium text-white">
              {attachment?.label ?? media.originalName}
            </p>
            <p className="text-xs text-white/60">
              {media.mediaType}
              {loop ? " · loop" : ` · ${clip?.naturalDurationSec.toFixed(0)}s max`}
              {audioPulse ? " · beat reactive" : ""}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
