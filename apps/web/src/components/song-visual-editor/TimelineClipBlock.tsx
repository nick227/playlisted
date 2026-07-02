import { Repeat, Scissors } from "lucide-react";
import { useState, type PointerEvent as ReactPointerEvent } from "react";

import { isPointerDrag, timeSecFromTimelinePointer } from "./timelineLayout";
import type { TimelineClip } from "./types";

type TimelineClipBlockProps = {
  clip: TimelineClip;
  durationSec: number;
  selected: boolean;
  cutMode: boolean;
  isBusy: boolean;
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
  const mediaType = clip.attachment.mediaAsset.mediaType;

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
        "absolute top-0 flex h-full min-w-[3rem] overflow-hidden rounded-md border text-left text-[11px] transition-colors",
        selected
          ? "border-emerald-400/60 bg-emerald-400/20 text-white"
          : "border-white/15 bg-white/10 text-white/80 hover:border-white/30",
        cutMode ? "cursor-crosshair" : selected ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        preview ? "opacity-90" : "",
      ].join(" ")}
      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
      onPointerDown={cutMode ? undefined : (event) => beginDrag("move", event)}
      onPointerMove={cutMode ? undefined : updateDragPreview}
      onPointerUp={cutMode ? onCutPointerUp : finishDrag}
    >
      {selected && !cutMode ? (
        <button
          type="button"
          aria-label="Trim clip start"
          onPointerDown={(event) => beginDrag("resize-start", event)}
          onPointerMove={updateDragPreview}
          onPointerUp={finishDrag}
          className="w-2 shrink-0 cursor-ew-resize bg-emerald-400/40 hover:bg-emerald-400/70"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1">
        <span className="truncate font-medium">
          {clip.attachment.label ?? clip.attachment.mediaAsset.originalName}
        </span>
        <span className="shrink-0 rounded bg-black/30 px-1 py-0.5 uppercase">{mediaType}</span>
        {clip.loop ? <Repeat size={10} className="shrink-0 opacity-60" /> : null}
        {cutMode ? <Scissors size={10} className="shrink-0 opacity-60" /> : null}
      </div>

      {selected && !cutMode ? (
        <button
          type="button"
          aria-label="Trim clip end"
          onPointerDown={(event) => beginDrag("resize-end", event)}
          onPointerMove={updateDragPreview}
          onPointerUp={finishDrag}
          className="w-2 shrink-0 cursor-ew-resize bg-emerald-400/40 hover:bg-emerald-400/70"
        />
      ) : null}
    </div>
  );
}
