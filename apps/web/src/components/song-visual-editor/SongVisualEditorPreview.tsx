import { Pause, Play } from "lucide-react";
import { useMemo, useRef, type RefObject } from "react";

import type { VisualMediaAssetRecord } from "@/lib/visualMediaApi";

import { useSongVisualTheatrePreview } from "./hooks/useSongVisualTheatrePreview";
import { readClipAudioPulse } from "./audioPulse";
import { SongVisualPreviewFocusLane } from "./SongVisualPreviewFocusLane";
import { readTheatrePresetIdFromTags } from "./theatreFxLibrary";
import type { TimelineClip, SongVisualEditorRecording } from "./types";

const DEFAULT_ASPECT = 16 / 9;
const MAX_PREVIEW_ASPECT = 16 / 9;

function previewAspectRatio(
  media: VisualMediaAssetRecord | null,
  attachment: TimelineClip["attachment"] | null,
): number {
  if (readTheatrePresetIdFromTags(attachment?.tags)) return DEFAULT_ASPECT;
  if (!media?.width || !media?.height) return DEFAULT_ASPECT;
  if (media.width <= 1 && media.height <= 1) return DEFAULT_ASPECT;
  const native = media.width / media.height;
  return Math.min(native, MAX_PREVIEW_ASPECT);
}

type SongVisualEditorPreviewProps = {
  clip: TimelineClip | null;
  isPlaying: boolean;
  currentTimeSec: number;
  previewSubtitles: boolean;
  recording: SongVisualEditorRecording;
  audioRef: RefObject<HTMLAudioElement | null>;
  onTogglePlayback: () => void;
  canPlay: boolean;
};

export function SongVisualEditorPreview({
  clip,
  isPlaying,
  currentTimeSec,
  previewSubtitles,
  recording,
  audioRef,
  onTogglePlayback,
  canPlay,
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

  const aspectRatio = useMemo(
    () => previewAspectRatio(media, attachment),
    [attachment, media],
  );

  return (
    <div className="mx-auto flex w-full max-w-xl shrink-0 justify-center">
      <button
        type="button"
        disabled={!canPlay}
        onClick={onTogglePlayback}
        className="group/preview relative w-full max-h-[34vh] overflow-hidden rounded-xl border border-white/10 bg-black text-left disabled:cursor-default"
        style={{ aspectRatio }}
        aria-label={isPlaying ? "Pause preview" : "Play preview"}
      >
        {!media ? (
          <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-white/35">
            Add media to preview visuals
          </div>
        ) : (
          <div ref={containerRef} className="absolute inset-0" />
        )}

        <SongVisualPreviewFocusLane
          enabled={previewSubtitles}
          recording={recording}
          currentTimeSec={currentTimeSec}
        />

        {canPlay ? (
          <div
            className={[
              "pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/30 transition-opacity",
              isPlaying ? "opacity-0 group-hover/preview:opacity-100" : "opacity-100",
            ].join(" ")}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white shadow-xl backdrop-blur-sm">
              {isPlaying ? (
                <Pause size={24} fill="currentColor" />
              ) : (
                <Play size={24} className="ml-0.5" fill="currentColor" />
              )}
            </span>
          </div>
        ) : null}

        {media ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
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
      </button>
    </div>
  );
}
