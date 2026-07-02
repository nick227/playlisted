import { GripVertical, Repeat, Scissors } from "lucide-react";
import { useState, type PointerEvent as ReactPointerEvent } from "react";

import { MediaAssetThumb } from "./MediaAssetThumb";
import { isPointerDrag, timeSecFromTimelinePointer } from "./timelineLayout";
import type { TimelineClip } from "./types";

type TimelineClipBlockProps = {
  clip: TimelineClip;
  durationSec: number;
  selected: boolean;
  cutMode: boolean;
  isBusy: boolean;
  stackOrder: number;
  trackRect: DOMRect | null;
  onSelect: () => void;
  onMove: (nextStartSec: number) => void;
  onResizeEnd: (nextDurationSec: number) => void;
  onResizeStart: (nextStartSec: number) => void;
  onCutAt: (cutSec: number) => void;
};

type DragMode = "move" | "resize-start" | "resize-end";

type DragState = {
  mode: DragMode;
  startX: number;
  startY: number;
  startSec: number;
  startDuration: number;
};

export function TimelineClipBlock({
  clip,
  durationSec,
  selected,
  cutMode,
  isBusy,
  stackOrder,
  trackRect,
  onSelect,
  onMove,
  onResizeEnd,
  onResizeStart,
  onCutAt,
}: TimelineClipBlockProps) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [preview, setPreview] = useState<{ startSec: number; durationSec: number } | null>(null);

  const renderStartSec = preview?.startSec ?? clip.startSec;
  const renderDurationSec = preview?.durationSec ?? clip.durationSec;
  const leftPct = (renderStartSec / durationSec) * 100;
  const widthPct = (renderDurationSec / durationSec) * 100;
  const isDragging = drag != null;

  function trackTime(clientX: number) {
    if (!trackRect) return clip.startSec;
    return timeSecFromTimelinePointer(clientX, trackRect, durationSec);
  }

  function beginDrag(mode: DragMode, event: ReactPointerEvent<HTMLElement>) {
    if (isBusy) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startSec: clip.startSec,
      startDuration: clip.durationSec,
    });
    onSelect();
  }

  function updateDragPreview(event: ReactPointerEvent<HTMLElement>) {
    if (!drag || !trackRect) return;
    const timeSec = trackTime(event.clientX);

    if (drag.mode === "move") {
      const deltaRatio = (event.clientX - drag.startX) / trackRect.width;
      setPreview({
        startSec: drag.startSec + deltaRatio * durationSec,
        durationSec: drag.startDuration,
      });
      return;
    }

    if (drag.mode === "resize-end") {
      setPreview({
        startSec: drag.startSec,
        durationSec: timeSec - drag.startSec,
      });
      return;
    }

    setPreview({
      startSec: timeSec,
      durationSec: drag.startSec + drag.startDuration - timeSec,
    });
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
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function onCutPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (isBusy) return;
    event.stopPropagation();
    onCutAt(trackTime(event.clientX));
  }

  return (
    <div
      className={[
        "absolute top-0 flex h-full min-w-[4rem] overflow-hidden rounded-md border text-left text-[11px]",
        selected
          ? "border-emerald-400 ring-2 ring-emerald-400/30 text-white"
          : "border-white/20 text-white/90 hover:border-white/40",
        cutMode ? "cursor-crosshair" : "cursor-grab",
        isDragging ? "z-50 scale-[1.02] shadow-lg shadow-emerald-500/20" : "",
      ].join(" ")}
      style={{ left: `${leftPct}%`, width: `${widthPct}%`, zIndex: isDragging ? 50 : stackOrder }}
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
