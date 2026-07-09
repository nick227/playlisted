import { listAtmosphereFxPresets } from "@/theatre/atmosphere/catalog";
import type { AtmosphereFxMode, SongAtmosphereFx } from "@/theatre/media/types";

const MODES: { value: AtmosphereFxMode; label: string }[] = [
  { value: "inherit", label: "Inherit" },
  { value: "off", label: "Off" },
  { value: "subtle", label: "Subtle" },
  { value: "normal", label: "Normal" },
  { value: "strong", label: "Strong" },
];

type AtmosphereFxPanelProps = {
  value: SongAtmosphereFx;
  disabled?: boolean;
  onChange: (next: SongAtmosphereFx) => void;
};

export function AtmosphereFxPanel({ value, disabled, onChange }: AtmosphereFxPanelProps) {
  const presets = listAtmosphereFxPresets();
  const presetDisabled = disabled || value.mode === "off";

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-lg border border-white/10 bg-black/25">
      <div className="border-b border-white/5 px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
          Atmosphere FX
        </span>
      </div>
      <div className="space-y-2.5 px-2.5 py-2.5">
        <p className="text-[11px] leading-snug text-white/35">
          Rendered as a full-frame audio-reactive overlay.
        </p>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-wide text-white/40">Intensity</span>
          <select
            className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white"
            disabled={disabled}
            value={value.mode}
            onChange={(event) =>
              onChange({ ...value, mode: event.target.value as AtmosphereFxMode })
            }
          >
            {MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase tracking-wide text-white/40">Preset</span>
          <select
            className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white disabled:opacity-40"
            disabled={presetDisabled}
            value={value.presetId ?? ""}
            onChange={(event) =>
              onChange({
                ...value,
                presetId: event.target.value ? event.target.value : null,
              })
            }
          >
            <option value="">Default (Glow)</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
