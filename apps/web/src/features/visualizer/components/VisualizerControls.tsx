import { Activity, MonitorOff } from "lucide-react";

import { useVisualizer } from "../VisualizerProvider";
import type { VisualizerDisabledReason } from "../visualizerTypes";

const REASON_LABELS: Record<VisualizerDisabledReason, string> = {
  "reduced-motion": "reduced motion is enabled",
  "performance": "disabled due to low frame rate",
  "error": "a rendering error occurred",
  "user": "",
};

export function VisualizerControls() {
  const { settings, setEnabled } = useVisualizer();
  const reasonLabel = settings.disabledReason ? REASON_LABELS[settings.disabledReason] : "";

  return (
    <button
      type="button"
      onClick={() => setEnabled(!settings.enabled)}
      aria-pressed={settings.enabled}
      aria-label={settings.enabled ? "Turn visualizer off" : "Turn visualizer on"}
      title={settings.enabled ? "Visualizer on" : `Visualizer off${reasonLabel ? ` — ${reasonLabel}` : ""}`}
      className={`transition ${
        settings.enabled ? "text-[var(--color-brand)]" : "text-[var(--color-text-muted)] hover:text-white"
      }`}
    >
      {settings.enabled ? <Activity size={18} /> : <MonitorOff size={18} />}
    </button>
  );
}
