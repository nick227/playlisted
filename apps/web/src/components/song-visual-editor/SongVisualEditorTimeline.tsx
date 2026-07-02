import { MousePointer2, Scissors } from "lucide-react";
import { useMemo, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import type { ClipSyncStatus } from "./hooks/optimisticSongVisualCache";
import { useTimelineTrackRect } from "./hooks/useTimelineTrackRect";
import { timeSecFromTimelinePointer } from "./timelineLayout";
import { TimelineClipBlock } from "./TimelineClipBlock";
import type { TimelineClip } from "./types";

type TimelineEditMode = "select" | "cut";

type SongVisualEditorTimelineProps = {
  clips: TimelineClip[];
  durationSec: number;
  currentTimeSec: number;
  isLibraryBusy: boolean;
  clipSyncStatus: Record<string, ClipSyncStatus>;
  hasClipboard: boolean;
  selectedAttachmentId: string | null;
  onSelectAttachment: (attachmentId: string | null) => void;
  onMoveClip: (attachmentId: string, nextStartSec: number) => void;
  onResizeClip: (attachmentId: string, nextDurationSec: number) => void;
  onResizeClipStart: (attachmentId: string, nextStartSec: number) => void;
  onCutClipAt: (attachmentId: string, cutSec: number) => void;
  onCutAtTime: (cutSec: number) => void;
};

export function SongVisualEditorTimeline({
  clips,
  durationSec,
  currentTimeSec,
  isLibraryBusy,
  clipSyncStatus,
  hasClipboard,
  selectedAttachmentId,
  onSelectAttachment,
  onMoveClip,
  onResizeClip,
  onResizeClipStart,
  onCutClipAt,
  onCutAtTime,
}: SongVisualEditorTimelineProps) {
  const { trackRef, getTrackRect, refreshTrackRect } = useTimelineTrackRect();
  const [editMode, setEditMode] = useState<TimelineEditMode>("select");

  const playheadPct = durationSec > 0 ? (currentTimeSec / durationSec) * 100 : 0;

  const sortedClips = useMemo(
    () => [...clips].sort((left, right) => left.attachment.order - right.attachment.order),
    [clips],
  );

  function cutSecFromPointer(clientX: number) {
    const rect = getTrackRect();
    if (!rect) return null;
    return timeSecFromTimelinePointer(clientX, rect, durationSec);
  }

  function handleTrackPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    refreshTrackRect();
    if (editMode === "cut") return;
    if (event.target === event.currentTarget) {
      onSelectAttachment(null);
    }
  }

  function handleTrackPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (editMode !== "cut") return;
    const cutSec = cutSecFromPointer(event.clientX);
    if (cutSec == null) return;
    onCutAtTime(cutSec);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-white/40">Timeline</span>
          <div className="inline-flex rounded-full border border-white/10 p-0.5">
            <ModeButton
              active={editMode === "select"}
              disabled={isLibraryBusy}
              label="Select"
              onClick={() => setEditMode("select")}
            >
              <MousePointer2 size={12} />
            </ModeButton>
            <ModeButton
              active={editMode === "cut"}
              disabled={isLibraryBusy}
              label="Cut"
              onClick={() => setEditMode("cut")}
            >
              <Scissors size={12} />
            </ModeButton>
          </div>
        </div>
        <span className="text-xs text-white/40">
          {editMode === "cut"
            ? "Click a clip or empty lane — shorter side is removed"
            : "Drag grip to move · edges to resize · Ctrl+C/V · Del to remove"}
          {hasClipboard ? " · clipboard ready" : ""}
        </span>
      </div>

      <div
        ref={trackRef}
        className="relative min-h-[5.5rem] rounded-lg border border-white/10 bg-black/30"
        onPointerDown={handleTrackPointerDown}
        onPointerUp={handleTrackPointerUp}
      >
        <div className="absolute inset-y-2 left-0 right-0">
          {sortedClips.map((clip, index) => (
            <TimelineClipBlock
              key={clip.attachment.id}
              clip={clip}
              songDurationSec={durationSec}
              selected={clip.attachment.id === selectedAttachmentId}
              cutMode={editMode === "cut"}
              isLocked={clipSyncStatus[clip.attachment.id] === "saving"}
              syncStatus={clipSyncStatus[clip.attachment.id]}
              stackOrder={index + 1}
              getTrackRect={getTrackRect}
              onRefreshTrackRect={refreshTrackRect}
              onSelect={() => onSelectAttachment(clip.attachment.id)}
              onMove={(nextStartSec) => onMoveClip(clip.attachment.id, nextStartSec)}
              onResizeEnd={(nextDurationSec) => onResizeClip(clip.attachment.id, nextDurationSec)}
              onResizeStart={(nextStartSec) => onResizeClipStart(clip.attachment.id, nextStartSec)}
              onCutAt={(cutSec) => onCutClipAt(clip.attachment.id, cutSec)}
            />
          ))}
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 z-[60] w-0.5 bg-emerald-400/70"
          style={{ left: `${playheadPct}%` }}
          aria-hidden
        />
      </div>
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
