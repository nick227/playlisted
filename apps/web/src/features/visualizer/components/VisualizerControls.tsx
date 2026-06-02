import { Activity, MonitorOff } from "lucide-react";

import { useVisualizer } from "../VisualizerProvider";
import { VISUALIZER_MODES } from "../visualizerModes";

export function VisualizerControls() {
  const { settings, setEnabled, setMode } = useVisualizer();

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setEnabled(!settings.enabled)}
        aria-pressed={settings.enabled}
        aria-label={settings.enabled ? "Turn visualizer off" : "Turn visualizer on"}
        title={settings.enabled ? "Visualizer on" : `Visualizer off${settings.disabledReason ? `: ${settings.disabledReason}` : ""}`}
        className={`transition ${
          settings.enabled ? "text-[var(--color-brand)]" : "text-[var(--color-text-muted)] hover:text-white"
        }`}
      >
        {settings.enabled ? <Activity size={18} /> : <MonitorOff size={18} />}
      </button>
      <select
        value={settings.mode}
        onChange={(event) => setMode(event.target.value as typeof settings.mode)}
        aria-label="Visualizer mode"
        disabled={!settings.enabled}
        className="max-w-24 rounded border border-white/10 bg-transparent px-2 py-1 text-xs text-[var(--color-text-muted)] outline-none transition hover:text-white disabled:opacity-40"
      >
        {VISUALIZER_MODES.map((mode) => (
          <option key={mode.id} value={mode.id} className="bg-[var(--color-canvas-alt)] text-white">
            {mode.name}
          </option>
        ))}
      </select>
    </div>
  );
}
