import { useMemo } from "react";

import { useVisualizer } from "../VisualizerProvider";
import { VISUALIZER_PALETTES } from "../visualizerPalettes";

export function VisualizerDevPanel() {
  const { settings, setPaletteId, updateSettings } = useVisualizer();
  const visible = import.meta.env.DEV && settings.showDevControls;
  const presetJson = useMemo(() => JSON.stringify(settings, null, 2), [settings]);

  if (!visible) return null;

  return (
    <div className="pointer-events-auto fixed right-4 top-[calc(var(--spacing-topbar)+1rem)] z-[80] w-72 rounded border border-white/10 bg-[var(--color-canvas-alt)] p-3 text-xs text-white shadow-xl">
      <div className="mb-3 font-semibold">Visualizer Dev</div>
      <label className="mb-2 block">
        <span className="mb-1 block text-[var(--color-text-muted)]">Palette</span>
        <select value={settings.paletteId} onChange={(event) => setPaletteId(event.target.value)} className="w-full rounded bg-[var(--color-surface)] p-2">
          {VISUALIZER_PALETTES.map((palette) => (
            <option key={palette.id} value={palette.id}>{palette.name}</option>
          ))}
        </select>
      </label>
      <label className="mb-2 block">
        <span className="mb-1 block text-[var(--color-text-muted)]">Intensity</span>
        <input type="range" min={0} max={1.5} step={0.05} value={settings.intensity} onChange={(event) => updateSettings({ intensity: Number(event.target.value) })} className="w-full" />
      </label>
      <label className="mb-2 block">
        <span className="mb-1 block text-[var(--color-text-muted)]">Opacity</span>
        <input type="range" min={0} max={1} step={0.05} value={settings.backgroundOpacity} onChange={(event) => updateSettings({ backgroundOpacity: Number(event.target.value) })} className="w-full" />
      </label>
      <label className="mb-2 block">
        <span className="mb-1 block text-[var(--color-text-muted)]">Glow</span>
        <input type="range" min={0} max={1.5} step={0.05} value={settings.glow} onChange={(event) => updateSettings({ glow: Number(event.target.value) })} className="w-full" />
      </label>
      <button
        type="button"
        onClick={() => void navigator.clipboard?.writeText(presetJson)}
        className="mt-2 rounded bg-white px-3 py-1.5 font-semibold text-black"
      >
        Copy JSON
      </button>
    </div>
  );
}
