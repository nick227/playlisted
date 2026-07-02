import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { buildRulerMarks, formatTimelineTime, timeSecFromTimelinePointer } from "./timelineLayout";

type TimelineScrubRulerProps = {
  durationSec: number;
  currentTimeSec: number;
  onSeek: (timeSec: number) => void;
};

export function TimelineScrubRuler({ durationSec, currentTimeSec, onSeek }: TimelineScrubRulerProps) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [widthPx, setWidthPx] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  useEffect(() => {
    const element = rulerRef.current;
    if (!element) return;
    const update = () => setWidthPx(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const marks = useMemo(() => buildRulerMarks(durationSec, widthPx), [durationSec, widthPx]);

  function seekFromClientX(clientX: number) {
    const rect = rulerRef.current?.getBoundingClientRect();
    if (!rect || durationSec <= 0) return;
    onSeek(timeSecFromTimelinePointer(clientX, rect, durationSec));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (durationSec <= 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsScrubbing(true);
    seekFromClientX(event.clientX);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isScrubbing || durationSec <= 0) return;
    seekFromClientX(event.clientX);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isScrubbing) return;
    setIsScrubbing(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div
      ref={rulerRef}
      className={[
        "relative h-8 shrink-0 cursor-ew-resize border-b border-white/10 bg-[#121820] select-none",
        isScrubbing ? "bg-[#161d28]" : "",
      ].join(" ")}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      role="slider"
      aria-label="Timeline scrubber"
      aria-valuemin={0}
      aria-valuemax={durationSec}
      aria-valuenow={currentTimeSec}
    >
      <span className="pointer-events-none absolute left-2 top-1 z-10 text-[10px] font-medium tabular-nums text-white/70">
        0:00
      </span>
      <span className="pointer-events-none absolute right-2 top-1 z-10 text-[10px] font-medium tabular-nums text-white/70">
        {formatTimelineTime(durationSec)}
      </span>

      <div className="pointer-events-none absolute inset-x-14 bottom-0 top-3.5">
        {marks.map((mark) => {
          const leftPct = durationSec > 0 ? (mark.sec / durationSec) * 100 : 0;
          if (leftPct <= 0.5 || leftPct >= 99.5) return null;
          return (
            <div
              key={`${mark.sec}-${mark.major ? "major" : "minor"}`}
              className="absolute bottom-0 flex flex-col items-center"
              style={{ left: `${leftPct}%` }}
            >
              {mark.major ? (
                <span className="mb-0.5 text-[9px] tabular-nums text-white/40">
                  {formatTimelineTime(mark.sec)}
                </span>
              ) : null}
              <div className={mark.major ? "h-2.5 w-px bg-white/50" : "h-1.5 w-px bg-white/25"} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
