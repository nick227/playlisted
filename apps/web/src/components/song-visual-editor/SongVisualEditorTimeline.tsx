import { Sparkles, Trash2 } from "lucide-react";

import { listPresets } from "@/theatre/registry/scenePresets";

import type { TimelineClip } from "./types";

type SongVisualEditorTimelineProps = {
  clips: TimelineClip[];
  durationSec: number;
  currentTimeSec: number;
  selectedAttachmentId: string | null;
  showDefaultLane: boolean;
  onSelectAttachment: (attachmentId: string) => void;
  onSeek: (timeSec: number) => void;
  onRemoveAttachment: (attachmentId: string) => void;
};

const DEFAULT_PRESET_SAMPLES = listPresets("production")
  .filter((preset) => preset.category === "production")
  .slice(0, 6);

export function SongVisualEditorTimeline({
  clips,
  durationSec,
  currentTimeSec,
  selectedAttachmentId,
  showDefaultLane,
  onSelectAttachment,
  onSeek,
  onRemoveAttachment,
}: SongVisualEditorTimelineProps) {
  const playheadPct = durationSec > 0 ? (currentTimeSec / durationSec) * 100 : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/40">
        <span>Timeline</span>
        <span>{formatTime(currentTimeSec)} / {formatTime(durationSec)}</span>
      </div>

      <div
        className="relative min-h-[4.5rem] rounded-lg border border-white/10 bg-black/30"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
          onSeek(ratio * durationSec);
        }}
      >
        <div className="absolute inset-y-2 left-0 right-0">
          {clips.map((clip) => {
            const leftPct = (clip.startSec / durationSec) * 100;
            const widthPct = ((clip.endSec - clip.startSec) / durationSec) * 100;
            const selected = clip.attachment.id === selectedAttachmentId;
            const mediaType = clip.attachment.mediaAsset.mediaType;

            return (
              <button
                key={clip.attachment.id}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectAttachment(clip.attachment.id);
                  onSeek(clip.startSec + 0.05);
                }}
                className={[
                  "absolute top-0 flex h-full min-w-[3rem] items-center gap-2 overflow-hidden rounded-md border px-2 text-left text-[11px] transition",
                  selected
                    ? "border-emerald-400/60 bg-emerald-400/20 text-white"
                    : "border-white/15 bg-white/10 text-white/80 hover:border-white/30",
                ].join(" ")}
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                title={clip.attachment.label ?? clip.attachment.mediaAsset.originalName}
              >
                <span className="truncate font-medium">
                  {clip.attachment.label ?? clip.attachment.mediaAsset.originalName}
                </span>
                <span className="shrink-0 rounded bg-black/30 px-1 py-0.5 uppercase">
                  {mediaType}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-emerald-400"
          style={{ left: `${playheadPct}%` }}
        />
      </div>

      {showDefaultLane ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/40">
            <Sparkles size={12} />
            Default theatre animations fill remaining rotation
          </div>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_PRESET_SAMPLES.map((preset) => (
              <span
                key={preset.id}
                className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white/60"
              >
                {preset.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {selectedAttachmentId ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onRemoveAttachment(selectedAttachmentId)}
            className="inline-flex items-center gap-1 rounded-full border border-red-500/30 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/10"
          >
            <Trash2 size={12} />
            Remove selected clip
          </button>
        </div>
      ) : null}
    </div>
  );
}

function formatTime(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
