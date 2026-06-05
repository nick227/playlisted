import { Loader2, Monitor } from "lucide-react";

import { useTheatreMode } from "@/components/app-shell/useTheatreMode";

export function TheatreModeButton() {
  const { canEnterTheatre, theatreActive, theatreLoading, toggleTheatreMode } = useTheatreMode();

  return (
    <button
      type="button"
      onClick={toggleTheatreMode}
      disabled={theatreLoading || (!theatreActive && !canEnterTheatre)}
      className={`inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1.5 transition disabled:cursor-not-allowed disabled:opacity-40 sm:p-2 ${
        theatreActive
          ? "text-[var(--color-brand)]"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-white"
      }`}
      title={
        theatreLoading
          ? "Loading theatre..."
          : theatreActive
            ? "Exit Theatre Mode"
            : canEnterTheatre
              ? "Enter Theatre Mode"
              : "Play music to enter Theatre Mode"
      }
      aria-busy={theatreLoading}
    >
      {theatreLoading ? <Loader2 size={20} className="animate-spin" /> : <Monitor size={20} />}
    </button>
  );
}
