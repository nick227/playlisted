import { useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";

import type { ClipSyncStatus } from "./hooks/optimisticSongVisualCache";
import { useTimelineSnapGuides } from "./hooks/useTimelineSnapGuides";
import { useTimelineTrackRect } from "./hooks/useTimelineTrackRect";
import { drawWaveformPeaks, drawWaveformPlayhead } from "./drawWaveformPeaks";
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
  const waveformRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    const container = waveformRef.current;
    if (!canvas || !container || !peaks?.length || durationSec <= 0) return;

    const draw = () => {
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
      drawWaveformPeaks(context, peaks, width, height);
      drawWaveformPlayhead(context, width, height, currentTimeSec, durationSec);
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(container);
    return () => observer.disconnect();
  }, [currentTimeSec, durationSec, peaks]);

  function seekFromClientX(clientX: number) {
    const waveformRect = waveformRef.current?.getBoundingClientRect();
    const trackRect = getTrackRect();
    const rect = waveformRect ?? trackRect;
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

  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-black/30">
      <div
        ref={waveformRef}
        className="relative h-14 w-full cursor-crosshair border-b border-white/10 bg-black/40"
        onClick={(event) => seekFromClientX(event.clientX)}
        role="slider"
        aria-label="Audio waveform"
        aria-valuemin={0}
        aria-valuemax={durationSec}
        aria-valuenow={currentTimeSec}
      >
        {waveformLoading ? (
          <div className="flex h-full items-center justify-center text-[11px] text-white/35">Loading waveform…</div>
        ) : peaks?.length ? (
          <canvas ref={waveformCanvasRef} className="absolute inset-0 h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-white/35">
            {waveformError ?? "Audio waveform unavailable for this track."}
          </div>
        )}
      </div>

      <div
        ref={trackRef}
        className="relative min-h-[5.5rem]"
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
              snapMoveStart={(proposedStartSec) => snapMoveStart(clip.attachment.id, clip, proposedStartSec)}
              snapResizeStart={(proposedStartSec) => snapResizeStart(clip.attachment.id, proposedStartSec)}
              snapResizeEnd={(proposedEndSec) => snapResizeEnd(clip.attachment.id, proposedEndSec)}
              onSnapEnd={clearSnapGuide}
            />
          ))}
        </div>

        {guidePct != null ? (
          <div
            className="pointer-events-none absolute inset-y-0 z-[65] w-px bg-amber-300/90 shadow-[0_0_8px_rgba(252,211,77,0.55)]"
            style={{ left: `${guidePct}%` }}
            aria-hidden
          />
        ) : null}

        <div
          className="pointer-events-none absolute inset-y-0 z-[60] w-0.5 bg-emerald-400/70"
          style={{ left: `${playheadPct}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
