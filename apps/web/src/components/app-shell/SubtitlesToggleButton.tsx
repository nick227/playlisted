import { Captions } from "lucide-react";

import { useSubtitleDisplay } from "@/lib/subtitleDisplay";

export function SubtitlesToggleButton() {
  const { subtitlesEnabled, toggleSubtitlesEnabled } = useSubtitleDisplay();

  return (
    <button
      type="button"
      onClick={toggleSubtitlesEnabled}
      className={`inline-flex shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1.5 transition sm:p-2 ${
        subtitlesEnabled
          ? "text-[var(--color-brand)]"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-white"
      }`}
      title={subtitlesEnabled ? "Hide subtitles" : "Show subtitles"}
      aria-pressed={subtitlesEnabled}
      aria-label={subtitlesEnabled ? "Hide subtitles" : "Show subtitles"}
    >
      <Captions size={20} />
    </button>
  );
}
