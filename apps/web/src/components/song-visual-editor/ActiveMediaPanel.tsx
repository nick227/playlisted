import { Eye, EyeOff, RotateCcw, Trash2, Vibrate } from "lucide-react";

import type { SongVisualAttachmentRecord } from "@/lib/visualMediaApi";

import { editorToggleClass } from "./editorToggle";
import { readTheatrePresetIdFromTags } from "./theatreFxLibrary";
import { formatTimelineTime, readClipPlayback, readClipStartOffsetMs } from "./timelineLayout";
import type { TimelineClip } from "./types";

type ActiveMediaPanelProps = {
  attachments: SongVisualAttachmentRecord[];
  timelineClips: TimelineClip[];
  isBusy: boolean;
  onClipAudioPulseChange: (attachmentId: string, enabled: boolean) => void;
  readClipAudioPulse: (attachment: SongVisualAttachmentRecord) => boolean;
  onResetClipTrim: (attachmentId: string) => void;
  onRemoveClip: (attachmentId: string) => void;
  onSelectClip: (attachmentId: string) => void;
  onToggleClipStage: (attachmentId: string, enabled: boolean) => void;
  selectedAttachmentId: string | null;
};

type ActiveMediaRow = {
  attachment: SongVisualAttachmentRecord;
  startSec: number | null;
  endSec: number | null;
};

function readStoredBounds(attachment: SongVisualAttachmentRecord): Pick<ActiveMediaRow, "startSec" | "endSec"> {
  const playback = readClipPlayback(attachment);
  const startSec = typeof playback.timelineStartSec === "number" ? Math.max(0, playback.timelineStartSec) : null;
  const durationSec =
    typeof playback.timelineDurationSec === "number" && playback.timelineDurationSec > 0
      ? playback.timelineDurationSec
      : null;

  return {
    startSec,
    endSec: startSec != null && durationSec != null ? startSec + durationSec : null,
  };
}

function formatRowTime(row: ActiveMediaRow) {
  if (row.startSec == null || row.endSec == null) return "Hidden";
  return `${formatTimelineTime(row.startSec)}-${formatTimelineTime(row.endSec)}`;
}

export function ActiveMediaPanel({
  attachments,
  timelineClips,
  isBusy,
  onClipAudioPulseChange,
  readClipAudioPulse,
  onResetClipTrim,
  onRemoveClip,
  onSelectClip,
  onToggleClipStage,
  selectedAttachmentId,
}: ActiveMediaPanelProps) {
  const clipsByAttachmentId = new Map(
    timelineClips.map((clip) => [clip.attachment.id, clip]),
  );

  const sortedRows = [...attachments]
    .sort((left, right) => {
      const leftClip = clipsByAttachmentId.get(left.id);
      const rightClip = clipsByAttachmentId.get(right.id);
      const leftStart = leftClip?.startSec ?? readStoredBounds(left).startSec ?? Number.POSITIVE_INFINITY;
      const rightStart = rightClip?.startSec ?? readStoredBounds(right).startSec ?? Number.POSITIVE_INFINITY;
      if (leftStart !== rightStart) return leftStart - rightStart;
      return left.order - right.order;
    })
    .map((attachment): ActiveMediaRow => {
      const clip = clipsByAttachmentId.get(attachment.id);
      if (clip) {
        return {
          attachment,
          startSec: clip.startSec,
          endSec: clip.endSec,
        };
      }
      return {
        attachment,
        ...readStoredBounds(attachment),
      };
    });

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-lg border border-white/10 bg-black/25">
      <div className="flex items-center justify-between border-b border-white/5 px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Active</span>
        <span className="text-[10px] tabular-nums text-white/30">
          {sortedRows.length} {sortedRows.length === 1 ? "clip" : "clips"}
        </span>
      </div>
      {sortedRows.length === 0 ? (
        <p className="px-2.5 py-2 text-xs text-white/35">Add clips from the library below.</p>
      ) : (
        <ul className="max-h-[17.5rem] divide-y divide-white/5 overflow-y-auto md:[scrollbar-gutter:stable]">
          {sortedRows.map((row) => {
            const { attachment } = row;
            const selected = attachment.id === selectedAttachmentId;
            const isCommunity = readTheatrePresetIdFromTags(attachment.tags) != null;
            const startOffsetMs = readClipStartOffsetMs(attachment);
            const audioPulse = readClipAudioPulse(attachment);
            const enabled = attachment.enabled;
            return (
              <li
                key={attachment.id}
                className={[
                  "flex min-w-0 items-center gap-1 px-1.5 py-1",
                  selected ? "bg-emerald-500/10" : "hover:bg-white/5",
                  enabled ? "" : "opacity-60",
                ].join(" ")}
              >
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onSelectClip(attachment.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 px-1 py-0.5 text-left disabled:opacity-40"
                >
                  <span
                    className={[
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      isCommunity ? "bg-cyan-400" : "bg-violet-400",
                    ].join(" ")}
                    title={isCommunity ? "Community" : "Yours"}
                  />
                  <span className="truncate text-xs font-medium text-white">
                    {attachment.label ?? attachment.mediaAsset.originalName}
                  </span>
                  <span className="hidden shrink-0 text-[10px] tabular-nums text-white/40 sm:inline">
                    {formatRowTime(row)}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onToggleClipStage(attachment.id, !enabled)}
                  className={[
                    "rounded-md border px-1.5 py-1 transition disabled:opacity-40",
                    enabled
                      ? "border-emerald-400/20 text-emerald-100 hover:bg-emerald-400/10"
                      : "border-white/10 text-white/45 hover:bg-white/10 hover:text-white/80",
                  ].join(" ")}
                  aria-label={enabled ? "Hide clip from stage" : "Show clip on stage"}
                  aria-pressed={enabled}
                  title={enabled ? "Hide from stage" : "Show on stage"}
                >
                  {enabled ? <Eye size={11} /> : <EyeOff size={11} />}
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onClipAudioPulseChange(attachment.id, !audioPulse)}
                  className={editorToggleClass(audioPulse, isBusy, "h-6 gap-1 px-1.5 text-[10px]")}
                  aria-pressed={audioPulse}
                  title="Beat reactive motion"
                >
                  <Vibrate size={11} />
                </button>
                {startOffsetMs > 0 ? (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onResetClipTrim(attachment.id)}
                    className="rounded-md border border-amber-400/20 px-1.5 py-1 text-amber-100 hover:bg-amber-400/10 disabled:opacity-40"
                    aria-label="Reset media cut-in"
                    title="Reset cut-in to media start"
                  >
                    <RotateCcw size={11} />
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onRemoveClip(attachment.id)}
                  className="rounded-md px-1.5 py-1 text-white/60 hover:bg-red-500/10 hover:text-red-200 disabled:opacity-40"
                  aria-label="Remove clip from timeline"
                >
                  <Trash2 size={11} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
