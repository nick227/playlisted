import { MousePointer2, Repeat, Scissors, Trash2 } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { TimelineClipBlock } from "./TimelineClipBlock";
import type { TimelineClip } from "./types";

type TimelineEditMode = "select" | "cut";

type SongVisualEditorTimelineProps = {
  clips: TimelineClip[];
  durationSec: number;
  remainingSec: number;
  currentTimeSec: number;
  isBusy: boolean;
  selectedAttachmentId: string | null;
  onSelectAttachment: (attachmentId: string | null) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onToggleLoop: (attachmentId: string, loop: boolean) => void;
  onMoveClip: (attachmentId: string, nextStartSec: number) => void;
  onResizeClip: (attachmentId: string, nextDurationSec: number) => void;
  onResizeClipStart: (attachmentId: string, nextStartSec: number) => void;
  onCutClipAt: (attachmentId: string, cutSec: number) => void;
};

export function SongVisualEditorTimeline({
  clips,
  durationSec,
  remainingSec,
  currentTimeSec,
  isBusy,
  selectedAttachmentId,
  onSelectAttachment,
  onRemoveAttachment,
  onToggleLoop,
  onMoveClip,
  onResizeClip,
  onResizeClipStart,
  onCutClipAt,
}: SongVisualEditorTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [editMode, setEditMode] = useState<TimelineEditMode>("select");
  const [trackRect, setTrackRect] = useState<DOMRect | null>(null);

  const playheadPct = durationSec > 0 ? (currentTimeSec / durationSec) * 100 : 0;
  const selectedClip = clips.find((clip) => clip.attachment.id === selectedAttachmentId) ?? null;

  function refreshTrackRect() {
    setTrackRect(trackRef.current?.getBoundingClientRect() ?? null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-white/40">Timeline</span>
          <div className="inline-flex rounded-full border border-white/10 p-0.5">
            <ModeButton
              active={editMode === "select"}
              disabled={isBusy}
              label="Select"
              onClick={() => setEditMode("select")}
            >
              <MousePointer2 size={12} />
            </ModeButton>
            <ModeButton
              active={editMode === "cut"}
              disabled={isBusy}
              label="Cut"
              onClick={() => setEditMode("cut")}
            >
              <Scissors size={12} />
            </ModeButton>
          </div>
        </div>
        <span className="text-xs text-white/40">
          {editMode === "cut" ? "Click a clip to split" : "Drag clips · trim handles when selected"}
        </span>
      </div>

      <div
        ref={trackRef}
        className="relative min-h-[4.5rem] rounded-lg border border-white/10 bg-black/30"
        onPointerEnter={refreshTrackRect}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onSelectAttachment(null);
          }
        }}
      >
        <div className="absolute inset-y-2 left-0 right-0">
          {clips.map((clip) => (
            <TimelineClipBlock
              key={clip.attachment.id}
              clip={clip}
              durationSec={durationSec}
              selected={clip.attachment.id === selectedAttachmentId}
              cutMode={editMode === "cut"}
              isBusy={isBusy}
              trackRect={trackRect}
              onSelect={() => onSelectAttachment(clip.attachment.id)}
              onMove={(nextStartSec) => onMoveClip(clip.attachment.id, nextStartSec)}
              onResizeEnd={(nextDurationSec) => onResizeClip(clip.attachment.id, nextDurationSec)}
              onResizeStart={(nextStartSec) => onResizeClipStart(clip.attachment.id, nextStartSec)}
              onCutAt={(cutSec) => onCutClipAt(clip.attachment.id, cutSec)}
            />
          ))}
          {remainingSec > 0.5 ? (
            <div
              className="pointer-events-none absolute top-0 flex h-full items-center justify-center border border-dashed border-white/10 bg-white/[0.02] text-[10px] uppercase tracking-wide text-white/30"
              style={{
                left: `${((clips.reduce((max, clip) => Math.max(max, clip.endSec), 0)) / durationSec) * 100}%`,
                width: `${(remainingSec / durationSec) * 100}%`,
              }}
            >
              Empty
            </div>
          ) : null}
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-emerald-400/70"
          style={{ left: `${playheadPct}%` }}
          aria-hidden
        />
      </div>

      {selectedClip ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm text-white">
              {selectedClip.attachment.label ?? selectedClip.attachment.mediaAsset.originalName}
            </p>
            <p className="text-xs text-white/45">
              {selectedClip.startSec.toFixed(1)}s – {selectedClip.endSec.toFixed(1)}s
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
                disabled={isBusy}
                onChange={(event) => onToggleLoop(selectedClip.attachment.id, event.target.checked)}
                className="rounded border-white/20 bg-black/40 text-emerald-500"
              />
              <Repeat size={12} />
              Loop
            </label>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onRemoveAttachment(selectedClip.attachment.id)}
              className="inline-flex items-center gap-1 rounded-full border border-red-500/30 px-3 py-1 text-xs text-red-200 hover:bg-red-500/10 disabled:opacity-40"
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

function ModeButton({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
        active ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80",
        disabled ? "opacity-40" : "",
      ].join(" ")}
      aria-pressed={active}
      aria-label={label}
    >
      {children}
      {label}
    </button>
  );
}
