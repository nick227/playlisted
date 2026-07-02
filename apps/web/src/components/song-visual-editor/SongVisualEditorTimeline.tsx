import { Repeat, Trash2 } from "lucide-react";
import { useRef } from "react";

import type { TimelineClip } from "./types";

type SongVisualEditorTimelineProps = {
  clips: TimelineClip[];
  durationSec: number;
  remainingSec: number;
  currentTimeSec: number;
  selectedAttachmentId: string | null;
  onSelectAttachment: (attachmentId: string) => void;
  onSeek: (timeSec: number) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onToggleLoop: (attachmentId: string, loop: boolean) => void;
  onResizeClip: (attachmentId: string, nextDurationSec: number) => void;
};

export function SongVisualEditorTimeline({
  clips,
  durationSec,
  remainingSec,
  currentTimeSec,
  selectedAttachmentId,
  onSelectAttachment,
  onSeek,
  onRemoveAttachment,
  onToggleLoop,
  onResizeClip,
}: SongVisualEditorTimelineProps) {
  const playheadPct = durationSec > 0 ? (currentTimeSec / durationSec) * 100 : 0;
  const selectedClip = clips.find((clip) => clip.attachment.id === selectedAttachmentId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/40">
        <span>Timeline</span>
        <span>
          {formatTime(currentTimeSec)} / {formatTime(durationSec)}
          {remainingSec > 0 ? ` · ${remainingSec.toFixed(1)}s free` : " · full"}
        </span>
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
          {clips.map((clip) => (
            <TimelineClipBlock
              key={clip.attachment.id}
              clip={clip}
              durationSec={durationSec}
              selected={clip.attachment.id === selectedAttachmentId}
              onSelect={() => {
                onSelectAttachment(clip.attachment.id);
                onSeek(clip.startSec + 0.05);
              }}
              onResize={(nextDurationSec) => onResizeClip(clip.attachment.id, nextDurationSec)}
            />
          ))}
          {remainingSec > 0 ? (
            <div
              className="absolute top-0 flex h-full items-center justify-center border border-dashed border-white/10 bg-white/[0.02] text-[10px] uppercase tracking-wide text-white/30"
              style={{
                left: `${((clips.at(-1)?.endSec ?? 0) / durationSec) * 100}%`,
                width: `${(remainingSec / durationSec) * 100}%`,
              }}
            >
              Empty
            </div>
          ) : null}
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-emerald-400"
          style={{ left: `${playheadPct}%` }}
        />
      </div>

      {selectedClip ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm text-white">
              {selectedClip.attachment.label ?? selectedClip.attachment.mediaAsset.originalName}
            </p>
            <p className="text-xs text-white/45">
              {selectedClip.durationSec.toFixed(1)}s on timeline
              {selectedClip.loop
                ? " · loop fills slot"
                : ` · natural max ${selectedClip.naturalDurationSec.toFixed(1)}s`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/80">
              <input
                type="checkbox"
                checked={selectedClip.loop}
                onChange={(event) => onToggleLoop(selectedClip.attachment.id, event.target.checked)}
                className="rounded border-white/20 bg-black/40 text-emerald-500"
              />
              <Repeat size={12} />
              Loop
            </label>
            <button
              type="button"
              onClick={() => onRemoveAttachment(selectedClip.attachment.id)}
              className="inline-flex items-center gap-1 rounded-full border border-red-500/30 px-3 py-1 text-xs text-red-200 hover:bg-red-500/10"
            >
              <Trash2 size={12} />
              Remove
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TimelineClipBlock({
  clip,
  durationSec,
  selected,
  onSelect,
  onResize,
}: {
  clip: TimelineClip;
  durationSec: number;
  selected: boolean;
  onSelect: () => void;
  onResize: (nextDurationSec: number) => void;
}) {
  const dragRef = useRef<{ startX: number; startDuration: number } | null>(null);
  const leftPct = (clip.startSec / durationSec) * 100;
  const widthPct = (clip.durationSec / durationSec) * 100;
  const mediaType = clip.attachment.mediaAsset.mediaType;

  function onResizePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startDuration: clip.durationSec };
  }

  function onResizePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) return;
    const parent = event.currentTarget.parentElement?.parentElement;
    if (!parent) return;
    const deltaRatio = (event.clientX - dragRef.current.startX) / parent.clientWidth;
    onResize(dragRef.current.startDuration + deltaRatio * durationSec);
  }

  function onResizePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div
      className={[
        "absolute top-0 flex h-full min-w-[3rem] overflow-hidden rounded-md border text-left text-[11px] transition",
        selected
          ? "border-emerald-400/60 bg-emerald-400/20 text-white"
          : "border-white/15 bg-white/10 text-white/80 hover:border-white/30",
      ].join(" ")}
      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1"
        title={clip.attachment.label ?? clip.attachment.mediaAsset.originalName}
      >
        <span className="truncate font-medium">
          {clip.attachment.label ?? clip.attachment.mediaAsset.originalName}
        </span>
        <span className="shrink-0 rounded bg-black/30 px-1 py-0.5 uppercase">{mediaType}</span>
        {clip.loop ? <Repeat size={10} className="shrink-0 opacity-60" /> : null}
      </button>
      {selected ? (
        <button
          type="button"
          aria-label="Trim or stretch clip"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          className="w-2 shrink-0 cursor-ew-resize bg-emerald-400/40 hover:bg-emerald-400/70"
        />
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
