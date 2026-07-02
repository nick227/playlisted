import { GripVertical, Repeat, Scissors, AudioLines } from "lucide-react";
import { useState, type PointerEvent as ReactPointerEvent } from "react";

import { MediaAssetThumb } from "./MediaAssetThumb";
import {
  isPointerDrag,
  previewClipMove,
  previewClipResizeEnd,
  previewClipResizeStart,
  timeSecFromTimelinePointer,
} from "./timelineLayout";
import type { ClipSyncStatus } from "./hooks/optimisticSongVisualCache";
import { readClipAudioPulse } from "./audioPulse";
import type { TimelineClip } from "./types";

type TimelineClipBlockProps = {
  clip: TimelineClip;
  songDurationSec: number;
  selected: boolean;
  cutMode: boolean;
  isLocked: boolean;
  syncStatus?: ClipSyncStatus;
  stackOrder: number;
  getTrackRect: () => DOMRect | null;
  onRefreshTrackRect: () => void;
  onSelect: () => void;
  onMove: (nextStartSec: number) => void;
  onResizeEnd: (nextDurationSec: number) => void;
  onResizeStart: (nextStartSec: number) => void;
  onCutAt: (cutSec: number) => void;
  snapMoveStart: (proposedStartSec: number) => number;
  snapResizeStart: (proposedStartSec: number) => number;
  snapResizeEnd: (proposedEndSec: number) => number;
  onSnapEnd: () => void;
};

type DragMode = "move" | "resize-start" | "resize-end";

type DragState = {
  mode: DragMode;
  startX: number;
  startY: number;
};

export function TimelineClipBlock({
  clip,
  songDurationSec,
  selected,
  cutMode,
  isLocked,
  syncStatus,
  stackOrder,
  getTrackRect,
  onRefreshTrackRect,
  onSelect,
  onMove,
  onResizeEnd,
  onResizeStart,
  onCutAt,
  snapMoveStart,
  snapResizeStart,
  snapResizeEnd,
  onSnapEnd,
}: TimelineClipBlockProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [preview, setPreview] = useState<{ startSec: number; durationSec: number } | null>(null);

  const renderStartSec = preview?.startSec ?? clip.startSec;
  const renderDurationSec = preview?.durationSec ?? clip.durationSec;
  const leftPct = songDurationSec > 0 ? (renderStartSec / songDurationSec) * 100 : 0;
  const widthPct = songDurationSec > 0 ? (renderDurationSec / songDurationSec) * 100 : 0;
  const isDragging = drag != null;
  const { attachment } = clip;
  const audioPulse = readClipAudioPulse(attachment);

  function trackTime(clientX: number) {
    const rect = getTrackRect();
    if (!rect) return clip.startSec;
    return timeSecFromTimelinePointer(clientX, rect, songDurationSec);
  }

  function beginDrag(mode: DragMode, event: ReactPointerEvent<HTMLElement>) {
    if (isLocked) return;
    onRefreshTrackRect();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ mode, startX: event.clientX, startY: event.clientY });
    onSelect();
  }

  function updateDragPreview(event: ReactPointerEvent<HTMLElement>) {
    if (!drag) return;
    const rect = getTrackRect();
    if (!rect) return;

    if (drag.mode === "move") {
      const deltaRatio = (event.clientX - drag.startX) / rect.width;
      const rawStartSec = clip.startSec + deltaRatio * songDurationSec;
      const snappedStartSec = snapMoveStart(rawStartSec);
      const next = previewClipMove(attachment, clip, snappedStartSec, songDurationSec);
      if (next) setPreview(next);
      return;
    }

    if (drag.mode === "resize-end") {
      const rawEndSec = trackTime(event.clientX);
      const snappedEndSec = snapResizeEnd(rawEndSec);
      const next = previewClipResizeEnd(
        attachment,
        clip,
        snappedEndSec - clip.startSec,
        songDurationSec,
      );
      if (next) setPreview(next);
      return;
    }

    const rawStartSec = trackTime(event.clientX);
    const snappedStartSec = snapResizeStart(rawStartSec);
    const next = previewClipResizeStart(attachment, clip, snappedStartSec, songDurationSec);
    if (next) setPreview(next);
  }

  function finishDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!drag) return;

    const dragged = isPointerDrag(event.clientX - drag.startX, event.clientY - drag.startY);
    if (dragged && preview) {
      if (drag.mode === "move") onMove(preview.startSec);
      else if (drag.mode === "resize-end") onResizeEnd(preview.durationSec);
      else onResizeStart(preview.startSec);
    } else if (!dragged && drag.mode === "move") {
      onSelect();
    }

    setDrag(null);
    setPreview(null);
    onSnapEnd();
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function onCutPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (isLocked) return;
    onRefreshTrackRect();
    event.stopPropagation();
  }

  function onCutPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (isLocked) return;
    event.stopPropagation();
    onCutAt(trackTime(event.clientX));
  }

  return (
    <div
      className={[
        "absolute top-0 flex h-full min-w-[4rem] overflow-hidden rounded-md border text-left text-[11px] transition-shadow",
        syncStatus === "error"
          ? "border-red-400 ring-2 ring-red-400/40 text-white"
          : selected
            ? "border-emerald-400 ring-2 ring-emerald-400/30 text-white"
            : "border-white/20 text-white/90 hover:border-white/40",
        syncStatus === "saving" ? "animate-pulse ring-1 ring-amber-400/50" : "",
        cutMode ? "cursor-crosshair" : isLocked ? "cursor-not-allowed opacity-80" : "cursor-grab",
        isDragging ? "z-50 scale-[1.02] shadow-lg shadow-emerald-500/20" : "",
      ].join(" ")}
      style={{ left: `${leftPct}%`, width: `${widthPct}%`, zIndex: isDragging ? 50 : stackOrder }}
      onPointerDown={cutMode ? onCutPointerDown : undefined}
      onPointerUp={cutMode ? onCutPointerUp : undefined}
    >
      <MediaAssetThumb
        asset={clip.attachment.mediaAsset}
        className="pointer-events-none absolute inset-0 opacity-70"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-black/55" />

      {!cutMode ? (
        <button
          type="button"
          aria-label="Drag clip"
          onPointerDown={(event) => beginDrag("move", event)}
          onPointerMove={updateDragPreview}
          onPointerUp={finishDrag}
          className={[
            "relative z-10 flex w-5 shrink-0 items-center justify-center border-r border-white/10 bg-black/40",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          ].join(" ")}
        >
          <GripVertical size={12} className="text-white/70" />
        </button>
      ) : null}

      <button
        type="button"
        aria-label="Trim clip start"
        onPointerDown={(event) => beginDrag("resize-start", event)}
        onPointerMove={updateDragPreview}
        onPointerUp={finishDrag}
        className={[
          "absolute bottom-0 left-0 top-0 z-20 w-2 cursor-ew-resize bg-emerald-400/30 hover:bg-emerald-400/60",
          cutMode ? "hidden" : selected || isDragging ? "opacity-100" : "opacity-0 hover:opacity-100",
        ].join(" ")}
      />

      <div
        className="relative z-10 flex min-w-0 flex-1 items-center gap-1 px-1.5 py-1"
        onPointerDown={cutMode ? undefined : (event) => beginDrag("move", event)}
        onPointerMove={cutMode ? undefined : updateDragPreview}
        onPointerUp={cutMode ? undefined : finishDrag}
      >
        <span className="truncate font-medium drop-shadow">
          {clip.attachment.label ?? clip.attachment.mediaAsset.originalName}
        </span>
        {clip.loop ? <Repeat size={10} className="shrink-0 opacity-80" /> : null}
        {audioPulse ? <AudioLines size={10} className="shrink-0 opacity-80" /> : null}
        {cutMode ? <Scissors size={10} className="shrink-0 opacity-80" /> : null}
      </div>

      <button
        type="button"
        aria-label="Trim clip end"
        onPointerDown={(event) => beginDrag("resize-end", event)}
        onPointerMove={updateDragPreview}
        onPointerUp={finishDrag}
        className={[
          "absolute bottom-0 right-0 top-0 z-20 w-2 cursor-ew-resize bg-emerald-400/30 hover:bg-emerald-400/60",
          cutMode ? "hidden" : selected || isDragging ? "opacity-100" : "opacity-0 hover:opacity-100",
        ].join(" ")}
      />
    </div>
  );
}
