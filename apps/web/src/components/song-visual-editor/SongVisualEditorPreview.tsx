import { Pause, Play } from "lucide-react";
import { useMemo, useRef, type RefObject } from "react";

import type { VisualMediaAssetRecord } from "@/lib/visualMediaApi";
import { DEFAULT_ATMOSPHERE_FX_PRESET_ID, getAtmosphereFxPreset } from "@/theatre/atmosphere/catalog";
import type { SongAtmosphereFx } from "@/theatre/media/types";

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

function selectedAtmosphereName(atmosphereFx: SongAtmosphereFx) {
  if (atmosphereFx.mode === "off") return null;
  const presetId = atmosphereFx.presetId ?? DEFAULT_ATMOSPHERE_FX_PRESET_ID;
  return getAtmosphereFxPreset(presetId)?.name ?? "Glow";
}

type SongVisualEditorPreviewProps = {
  clip: TimelineClip | null;
  isPlaying: boolean;
  currentTimeSec: number;
  recording: SongVisualEditorRecording;
  audioRef: RefObject<HTMLAudioElement | null>;
  onTogglePlayback: () => void;
  canPlay: boolean;
  showOverlays: boolean;
  atmosphereFx: SongAtmosphereFx;
};

export function SongVisualEditorPreview({
  clip,
  isPlaying,
  currentTimeSec,
  recording,
  audioRef,
  onTogglePlayback,
  canPlay,
  showOverlays,
  atmosphereFx,
}: SongVisualEditorPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const attachment = clip?.attachment ?? null;
  const media = attachment?.mediaAsset ?? null;
  const audioPulse = attachment ? readClipAudioPulse(attachment) : false;
  const atmosphereName = selectedAtmosphereName(atmosphereFx);

  useSongVisualTheatrePreview({
    containerRef,
    audioRef,
    clip,
    isPlaying,
    atmosphereFx,
  });

  const aspectRatio = useMemo(
    () => previewAspectRatio(media, attachment),
    [attachment, media],
  );

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-xl shrink-0 justify-center">
      <div
        className="group/preview relative w-full max-w-full max-h-[34vh] overflow-hidden rounded-xl border border-white/10 bg-black text-left"
        style={{ aspectRatio }}
      >
        {/* Always mounted (even with no media clip) — Atmosphere FX is a
            full-frame ambient layer independent of any specific attachment. */}
        <div
          ref={containerRef}
          className="pointer-events-none absolute inset-0 [&_*]:pointer-events-none"
        />

        {!media ? (
          <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center px-6 text-center text-sm text-white/35">
            Add media to preview visuals
          </div>
        ) : null}

        {atmosphereName ? (
          <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[calc(100%-1.5rem)] rounded-md border border-white/10 bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white/85 shadow-lg backdrop-blur-sm">
            <span className="text-white/45">Atmosphere</span>{" "}
            <span className="text-white">{atmosphereName}</span>
          </div>
        ) : null}

        {showOverlays ? (
          <SongVisualPreviewFocusLane
            enabled={isPlaying}
            recording={recording}
            currentTimeSec={currentTimeSec}
          />
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

        {canPlay ? (
          <button
            type="button"
            onClick={onTogglePlayback}
            className="absolute inset-0 z-30 flex items-center justify-center border-0 bg-transparent p-0 text-left"
            aria-label={isPlaying ? "Pause preview" : "Play preview"}
          >
            {isPlaying ? (
              <span className="pointer-events-none flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white opacity-0 shadow-lg backdrop-blur-sm transition-opacity duration-200 group-hover/preview:opacity-100">
                <Pause size={30} fill="currentColor" />
              </span>
            ) : (
              <span className="pointer-events-none flex h-full w-full items-center justify-center bg-black/20">
                <Play
                  size={72}
                  className="ml-2 text-white/95 drop-shadow-[0_4px_24px_rgba(0,0,0,0.65)]"
                  fill="currentColor"
                  strokeWidth={0}
                />
              </span>
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
