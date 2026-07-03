import { GripVertical, Scissors, AudioLines } from "lucide-react";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

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

const CLIP_TINTS = [
  { shell: "bg-violet-500/28 border-violet-300/50", selected: "border-violet-200 ring-violet-300/35" },
  { shell: "bg-emerald-500/28 border-emerald-300/50", selected: "border-emerald-200 ring-emerald-300/35" },
  { shell: "bg-sky-500/28 border-sky-300/50", selected: "border-sky-200 ring-sky-300/35" },
  { shell: "bg-amber-500/24 border-amber-300/45", selected: "border-amber-200 ring-amber-300/30" },
] as const;

type TimelineClipBlockProps = {
  clip: TimelineClip;
  songDurationSec: number;
  selected: boolean;
  cutMode: boolean;
  isLocked: boolean;
  syncStatus?: ClipSyncStatus;
  stackOrder: number;
  tintIndex: number;
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
  pointerId: number;
  startX: number;
  startY: number;
};

type DragPreview = { startSec: number; durationSec: number };

export function TimelineClipBlock({
  clip,
  songDurationSec,
  selected,
  cutMode,
  isLocked,
  syncStatus,
  stackOrder,
  tintIndex,
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
  const [preview, setPreviewState] = useState<DragPreview | null>(null);
  // React state can lag one pointer event behind; commits read this ref so the
  // final pointermove before pointerup is never dropped.
  const previewRef = useRef<DragPreview | null>(null);

  function setPreview(next: DragPreview | null) {
    previewRef.current = next;
    setPreviewState(next);
  }

  const renderStartSec = preview?.startSec ?? clip.startSec;
  const renderDurationSec = preview?.durationSec ?? clip.durationSec;
  const leftPct = songDurationSec > 0 ? (renderStartSec / songDurationSec) * 100 : 0;
  const widthPct = songDurationSec > 0 ? (renderDurationSec / songDurationSec) * 100 : 0;
  const isDragging = drag != null;
  const { attachment } = clip;
  const audioPulse = readClipAudioPulse(attachment);
  const tint = CLIP_TINTS[tintIndex % CLIP_TINTS.length]!;

  function trackTime(clientX: number) {
    const rect = getTrackRect();
    if (!rect) return clip.startSec;
    return timeSecFromTimelinePointer(clientX, rect, songDurationSec);
  }

  function beginDrag(mode: DragMode, event: ReactPointerEvent<HTMLElement>) {
    if (isLocked || drag) return;
    onRefreshTrackRect();
    event.stopPropagation();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer already released/invalid — without capture the drag would lose
      // events as soon as the cursor leaves the handle, so don't start one.
      return;
    }
    setPreview(null);
    setDrag({ mode, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY });
    onSelect();
  }

  function updateDragPreview(event: ReactPointerEvent<HTMLElement>) {
    if (!drag || event.pointerId !== drag.pointerId) return;
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

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    setDrag(null);
    setPreview(null);
    onSnapEnd();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Capture already gone — nothing to release.
      }
    }
  }

  function finishDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!drag || event.pointerId !== drag.pointerId) return;

    const finalPreview = previewRef.current;
    const dragged = isPointerDrag(event.clientX - drag.startX, event.clientY - drag.startY);
    if (dragged && finalPreview) {
      if (drag.mode === "move") onMove(finalPreview.startSec);
      else if (drag.mode === "resize-end") onResizeEnd(finalPreview.durationSec);
      else onResizeStart(finalPreview.startSec);
    } else if (!dragged && drag.mode === "move") {
      onSelect();
    }

    endDrag(event);
  }

  // Fired on pointercancel (touch scroll, browser gesture takeover) and on
  // lostpointercapture — without this a cancelled drag leaves the block stuck
  // in drag mode, tracking hover moves and committing bogus positions on the
  // next click.
  function cancelDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    endDrag(event);
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
        "pointer-events-auto absolute top-0 flex h-full min-w-[4rem] touch-none select-none overflow-hidden rounded-md border-2 text-left text-[11px] shadow-sm backdrop-blur-[1px] transition-shadow",
        syncStatus === "error"
          ? "border-red-400 bg-red-500/25 ring-2 ring-red-400/40 text-white"
          : selected
            ? `${tint.shell} ${tint.selected} ring-2 text-white`
            : `${tint.shell} text-white/95 hover:brightness-110`,
        syncStatus === "saving" ? "animate-pulse ring-1 ring-amber-400/50" : "",
        cutMode ? "cursor-crosshair" : isLocked ? "cursor-not-allowed opacity-80" : "cursor-grab",
        isDragging ? "z-50 scale-[1.02] shadow-lg shadow-black/40" : "",
      ].join(" ")}
      style={{ left: `${leftPct}%`, width: `${widthPct}%`, zIndex: isDragging ? 50 : stackOrder }}
      onPointerDown={cutMode ? onCutPointerDown : undefined}
      onPointerUp={cutMode ? onCutPointerUp : undefined}
    >
      <MediaAssetThumb
        asset={clip.attachment.mediaAsset}
        className="pointer-events-none absolute inset-0 opacity-35 mix-blend-luminosity"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/25" />

      {!cutMode ? (
        <button
          type="button"
          aria-label="Drag clip"
          onPointerDown={(event) => beginDrag("move", event)}
          onPointerMove={updateDragPreview}
          onPointerUp={finishDrag}
          onPointerCancel={cancelDrag}
          onLostPointerCapture={cancelDrag}
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
        onPointerCancel={cancelDrag}
        onLostPointerCapture={cancelDrag}
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
        onPointerCancel={cutMode ? undefined : cancelDrag}
        onLostPointerCapture={cutMode ? undefined : cancelDrag}
      >
        <span className="truncate font-medium drop-shadow">
          {clip.attachment.label ?? clip.attachment.mediaAsset.originalName}
        </span>
        {audioPulse ? <AudioLines size={10} className="shrink-0 opacity-80" /> : null}
        {cutMode ? <Scissors size={10} className="shrink-0 opacity-80" /> : null}
      </div>

      <button
        type="button"
        aria-label="Trim clip end"
        onPointerDown={(event) => beginDrag("resize-end", event)}
        onPointerMove={updateDragPreview}
        onPointerUp={finishDrag}
        onPointerCancel={cancelDrag}
        onLostPointerCapture={cancelDrag}
        className={[
          "absolute bottom-0 right-0 top-0 z-20 w-2 cursor-ew-resize bg-emerald-400/30 hover:bg-emerald-400/60",
          cutMode ? "hidden" : selected || isDragging ? "opacity-100" : "opacity-0 hover:opacity-100",
        ].join(" ")}
      />
    </div>
  );
}
