import { useEffect, useLayoutEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";

import type { ClipSyncStatus } from "./hooks/optimisticSongVisualCache";
import { useTimelineSnapGuides } from "./hooks/useTimelineSnapGuides";
import { useTimelineTrackRect } from "./hooks/useTimelineTrackRect";
import { drawWaveformPeaks } from "./drawWaveformPeaks";
import { timeSecFromTimelinePointer } from "./timelineLayout";
import { TimelineClipBlock } from "./TimelineClipBlock";
import type { TimelineEditMode } from "./SongVisualEditorToolbar";
import type { TimelineClip } from "./types";

type SongVisualEditorTimelineProps = {
  clips: TimelineClip[];
  durationSec: number;
  currentTimeSec: number;
  peaks?: number[];
  waveformLoading?: boolean;
  waveformError?: string | null;
  clipSyncStatus: Record<string, ClipSyncStatus>;
  editMode: TimelineEditMode;
  selectedAttachmentId: string | null;
  onSeek: (timeSec: number) => void;
  onSelectAttachment: (attachmentId: string | null) => void;
  onMoveClip: (attachmentId: string, nextStartSec: number) => void;
  onResizeClip: (attachmentId: string, nextDurationSec: number) => void;
  onResizeClipStart: (attachmentId: string, nextStartSec: number) => void;
  onCutClipAt: (attachmentId: string, cutSec: number) => void;
  onCutAtTime: (cutSec: number) => void;
};

function drawTimelineRuler(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  durationSec: number,
) {
  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.lineWidth = 1;
  const tickCount = Math.max(4, Math.min(24, Math.floor(durationSec / 15)));
  for (let index = 0; index <= tickCount; index += 1) {
    const x = (index / tickCount) * width;
    context.beginPath();
    context.moveTo(x, height - 10);
    context.lineTo(x, height);
    context.stroke();
  }
}

export function SongVisualEditorTimeline({
  clips,
  durationSec,
  currentTimeSec,
  peaks,
  waveformLoading,
  waveformError,
  clipSyncStatus,
  editMode,
  selectedAttachmentId,
  onSeek,
  onSelectAttachment,
  onMoveClip,
  onResizeClip,
  onResizeClipStart,
  onCutClipAt,
  onCutAtTime,
}: SongVisualEditorTimelineProps) {
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const { trackRef, getTrackRect, refreshTrackRect } = useTimelineTrackRect();
  const { activeGuide, snapMoveStart, snapResizeStart, snapResizeEnd, clearSnapGuide } = useTimelineSnapGuides({
    clips,
    songDurationSec: durationSec,
    playheadSec: currentTimeSec,
    getTrackRect,
  });

  const guidePct = durationSec > 0 && activeGuide ? (activeGuide.timeSec / durationSec) * 100 : null;
  const playheadPct = durationSec > 0 ? (currentTimeSec / durationSec) * 100 : 0;

  const sortedClips = useMemo(
    () => [...clips].sort((left, right) => left.attachment.order - right.attachment.order),
    [clips],
  );

  const redrawWaveform = useMemo(() => {
    return () => {
      const canvas = waveformCanvasRef.current;
      const container = trackRef.current;
      if (!canvas || !container) return;

      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const context = canvas.getContext("2d");
      if (!context) return;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = "rgba(8, 12, 18, 0.92)";
      context.fillRect(0, 0, width, height);

      if (peaks?.length && durationSec > 0) {
        drawWaveformPeaks(context, peaks, width, height);
      } else {
        drawTimelineRuler(context, width, height, durationSec);
      }
    };
  }, [durationSec, peaks, trackRef]);

  useLayoutEffect(() => {
    redrawWaveform();
    const frame = requestAnimationFrame(redrawWaveform);
    return () => cancelAnimationFrame(frame);
  }, [redrawWaveform]);

  useEffect(() => {
    const container = trackRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => redrawWaveform());
    observer.observe(container);
    return () => observer.disconnect();
  }, [redrawWaveform, trackRef]);

  function seekFromClientX(clientX: number) {
    const rect = getTrackRect();
    if (!rect || durationSec <= 0) return;
    onSeek(timeSecFromTimelinePointer(clientX, rect, durationSec));
  }

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

  function handleTrackClick(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    seekFromClientX(event.clientX);
  }

  return (
    <div className="shrink-0 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Timeline</p>
      <div
        ref={trackRef}
        className="relative h-36 min-h-[9rem] w-full shrink-0 cursor-crosshair overflow-hidden rounded-lg border-2 border-white/15 bg-[#080d14] shadow-inner ring-1 ring-white/5"
        onClick={handleTrackClick}
        onPointerDown={handleTrackPointerDown}
        onPointerUp={handleTrackPointerUp}
        role="slider"
        aria-label="Audio timeline"
        aria-valuemin={0}
        aria-valuemax={durationSec}
        aria-valuenow={currentTimeSec}
      >
        {waveformLoading ? (
          <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center text-xs text-white/45">
            Loading waveform…
          </div>
        ) : null}

        <canvas ref={waveformCanvasRef} className="pointer-events-none absolute inset-0 z-0 h-full w-full" />

        {!waveformLoading && !peaks?.length ? (
          <div className="pointer-events-none absolute inset-x-0 top-2 z-[1] px-3 text-center text-[11px] text-white/40">
            {waveformError ?? "Waveform unavailable — clips still align to track duration."}
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 inset-y-2 z-10">
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
              tintIndex={index}
              getTrackRect={getTrackRect}
              onRefreshTrackRect={refreshTrackRect}
              onSelect={() => onSelectAttachment(clip.attachment.id)}
              onMove={(nextStartSec) => onMoveClip(clip.attachment.id, nextStartSec)}
              onResizeEnd={(nextDurationSec) => onResizeClip(clip.attachment.id, nextDurationSec)}
              onResizeStart={(nextStartSec) => onResizeClipStart(clip.attachment.id, nextStartSec)}
              onCutAt={(cutSec) => onCutClipAt(clip.attachment.id, cutSec)}
              snapMoveStart={(proposedStartSec) => snapMoveStart(clip.attachment.id, clip, proposedStartSec)}
              snapResizeStart={(proposedStartSec) => snapResizeStart(clip.attachment.id, proposedStartSec)}
              snapResizeEnd={(proposedEndSec) => snapResizeEnd(clip.attachment.id, proposedEndSec)}
              onSnapEnd={clearSnapGuide}
            />
          ))}
        </div>

        {guidePct != null ? (
          <div
            className="pointer-events-none absolute inset-y-0 z-20 w-px bg-amber-300/90 shadow-[0_0_8px_rgba(252,211,77,0.55)]"
            style={{ left: `${guidePct}%` }}
            aria-hidden
          />
        ) : null}

        <div
          className="pointer-events-none absolute inset-y-0 z-30 w-0.5 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]"
          style={{ left: `${playheadPct}%` }}
          aria-hidden
        />

        {sortedClips.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center px-4 text-center text-xs text-white/35">
            Add clips from the library — they layer over the audio here
          </div>
        ) : null}
      </div>
    </div>
  );
}
