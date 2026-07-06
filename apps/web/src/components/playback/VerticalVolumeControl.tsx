import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useRef, useState } from "react";

type VerticalVolumeControlProps = {
  volume: number;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  variant?: "player" | "radio";
  className?: string;
};

const HOLD_MS = 320;

export function VerticalVolumeControl({
  volume,
  onVolumeChange,
  onToggleMute,
  variant = "player",
  className = "",
}: VerticalVolumeControlProps) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const holdTimerRef = useRef<number | null>(null);
  const holdOpenedRef = useRef(false);
  const popoverOpen = hoverOpen || pinnedOpen;
  const isMuted = volume === 0;

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current === null) return;
    window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  }, []);

  const handlePointerDown = useCallback(() => {
    holdOpenedRef.current = false;
    clearHoldTimer();
    holdTimerRef.current = window.setTimeout(() => {
      holdOpenedRef.current = true;
      setPinnedOpen(true);
      holdTimerRef.current = null;
    }, HOLD_MS);
  }, [clearHoldTimer]);

  const handlePointerUp = useCallback(() => {
    clearHoldTimer();
    if (holdOpenedRef.current) return;
    onToggleMute();
  }, [clearHoldTimer, onToggleMute]);

  const handlePointerCancel = useCallback(() => {
    clearHoldTimer();
    holdOpenedRef.current = false;
  }, [clearHoldTimer]);

  const handleBlur = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setHoverOpen(false);
      setPinnedOpen(false);
    }
  }, []);

  const isRadio = variant === "radio";
  const buttonClass = isRadio
    ? "relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-[var(--color-surface)]/80 text-white/72 shadow-lg shadow-black/20 transition hover:border-white/20 hover:bg-white/[0.09] hover:text-white"
    : "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-[var(--color-text-muted)] transition hover:bg-white/10 hover:text-white md:h-9 md:w-9";

  const popoverClass = isRadio
    ? "absolute bottom-[3.25rem] left-1/2 z-10 flex h-36 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-white/[0.08] bg-black/70 py-4 shadow-2xl shadow-black/40 backdrop-blur-md transition"
    : "absolute bottom-[2.75rem] left-1/2 z-10 flex h-32 w-10 -translate-x-1/2 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas-alt)] py-3 shadow-xl transition md:bottom-[3rem] md:h-36 md:w-11";

  const sliderClass = isRadio
    ? "h-24 w-2 cursor-pointer accent-white [direction:rtl] [writing-mode:vertical-lr]"
    : "h-20 w-2 cursor-pointer accent-[var(--color-brand)] [direction:rtl] [writing-mode:vertical-lr] md:h-24";

  return (
    <div
      className={`group/volume relative flex items-center justify-center ${isRadio ? "h-11 w-11" : "h-8 w-8 md:h-9 md:w-9"} ${className}`}
      onMouseEnter={() => setHoverOpen(true)}
      onMouseLeave={() => setHoverOpen(false)}
      onBlur={handleBlur}
    >
      <span
        className={`absolute bottom-0 left-1/2 z-0 -translate-x-1/2 ${isRadio ? "h-48 w-11" : "h-40 w-10 md:h-44 md:w-11"}`}
        aria-hidden="true"
      />
      <div
        className={`${popoverClass} ${
          popoverOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
          className={sliderClass}
          aria-label="Playback volume"
        />
      </div>
      <button
        type="button"
        className={buttonClass}
        aria-label={isMuted ? "Unmute" : "Mute"}
        aria-expanded={popoverOpen}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerCancel}
      >
        {isMuted ? <VolumeX size={isRadio ? 18 : 16} /> : <Volume2 size={isRadio ? 18 : 16} />}
      </button>
    </div>
  );
}
