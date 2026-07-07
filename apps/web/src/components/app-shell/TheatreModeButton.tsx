import { useEffect, useRef, useState } from "react";
import { Captions, Loader2, Monitor } from "lucide-react";

import { useTheatreMode } from "@/components/app-shell/useTheatreMode";
import { useSubtitleDisplay } from "@/lib/subtitleDisplay";

export function TheatreModeButton() {
  const { canEnterTheatre, theatreFxEnabled, theatreLoading, toggleTheatreMode } = useTheatreMode();
  const { subtitlesEnabled, toggleSubtitlesEnabled } = useSubtitleDisplay();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleSubtitlesClick() {
    setOpen(false);
    toggleSubtitlesEnabled();
  }

  function handleTheatreClick() {
    setOpen(false);
    void toggleTheatreMode();
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  return (
    <div 
      className="relative" 
      ref={containerRef} 
      data-playback-focus-interactive
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1.5 transition sm:p-2 ${
          open || theatreFxEnabled || subtitlesEnabled
            ? "text-[var(--color-brand)]"
            : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-white"
        }`}
        title="Display settings"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Display settings"
      >
        <Monitor size={20} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1 shadow-xl">
            <button
              type="button"
              onClick={handleSubtitlesClick}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white hover:bg-white/5"
            >
              <Captions
                size={16}
                className={subtitlesEnabled ? "text-[var(--color-brand)]" : "text-[var(--color-text-muted)]"}
              />
              {subtitlesEnabled ? "Hide subtitles" : "Show subtitles"}
            </button>
            <button
              type="button"
              disabled={theatreLoading || (!theatreFxEnabled && !canEnterTheatre)}
              onClick={handleTheatreClick}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              title={
                theatreLoading
                  ? "Loading theatre..."
                  : !theatreFxEnabled && !canEnterTheatre
                    ? "Play music to enable theatre visualizations"
                    : ""
              }
            >
              {theatreLoading ? (
                <Loader2 size={16} className="animate-spin text-[var(--color-brand)]" />
              ) : (
                <Monitor
                  size={16}
                  className={theatreFxEnabled ? "text-[var(--color-brand)]" : "text-[var(--color-text-muted)]"}
                />
              )}
              {theatreFxEnabled ? "Hide theatre" : "Show theatre"}
            </button>
          </div>
      ) : null}
    </div>
  );
}
