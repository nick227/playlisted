import { Loader2, Monitor } from "lucide-react";

import { useTheatreMode } from "@/components/app-shell/useTheatreMode";

export function TheatreModeButton() {
  const { canEnterTheatre, theatreFxEnabled, theatreLoading, toggleTheatreMode } = useTheatreMode();

  return (
    <button
      type="button"
      onClick={toggleTheatreMode}
      disabled={theatreLoading || (!theatreFxEnabled && !canEnterTheatre)}
      className={`inline-flex shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 sm:p-2 ${
        theatreFxEnabled
          ? "text-[var(--color-brand)]"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-white"
      }`}
      title={
        theatreLoading
          ? "Loading theatre..."
          : theatreFxEnabled
            ? "Disable theatre visualizations"
            : canEnterTheatre
              ? "Enable theatre visualizations"
              : "Play music to enable theatre visualizations"
      }
      aria-busy={theatreLoading}
      aria-pressed={theatreFxEnabled}
    >
      {theatreLoading ? <Loader2 size={20} className="animate-spin" /> : <Monitor size={20} />}
    </button>
  );
}
