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
  recording: SongVisualEditorRecording;
  audioRef: RefObject<HTMLAudioElement | null>;
  onTogglePlayback: () => void;
  canPlay: boolean;
};

export function SongVisualEditorPreview({
  clip,
  isPlaying,
  currentTimeSec,
  recording,
  audioRef,
  onTogglePlayback,
  canPlay,
}: SongVisualEditorPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const attachment = clip?.attachment ?? null;
  const media = attachment?.mediaAsset ?? null;
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
          enabled={isPlaying}
          recording={recording}
          currentTimeSec={currentTimeSec}
        />

        {canPlay ? (
          isPlaying ? (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover/preview:opacity-100">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm">
                <Pause size={30} fill="currentColor" />
              </span>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/20">
              <Play size={72} className="ml-2 text-white/95 drop-shadow-[0_4px_24px_rgba(0,0,0,0.65)]" fill="currentColor" strokeWidth={0} />
            </div>
          )
        ) : null}

        {media ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
            <p className="truncate text-sm font-medium text-white">
              {attachment?.label ?? media.originalName}
            </p>
            <p className="text-xs text-white/60">
              {media.mediaType}
              {audioPulse ? " · beat reactive" : ""}
            </p>
          </div>
        ) : null}
      </button>
    </div>
  );
}
