import { Sparkles } from "lucide-react";

import {
  DEFAULT_ATMOSPHERE_FX_PRESET_ID,
  getAtmosphereFxPreset,
  listAtmosphereFxPresets,
} from "@/theatre/atmosphere/catalog";
import type { SongAtmosphereFx } from "@/theatre/media/types";

import { editorToggleClass } from "./editorToggle";

type AtmosphereFxPanelProps = {
  value: SongAtmosphereFx;
  disabled?: boolean;
  onChange: (next: SongAtmosphereFx) => void;
};

function selectedAtmosphereName(value: SongAtmosphereFx) {
  const presetId = value.presetId ?? DEFAULT_ATMOSPHERE_FX_PRESET_ID;
  return getAtmosphereFxPreset(presetId)?.name ?? "Glow";
}

/**
 * Compact toolbar control — on/off toggle + preset picker, no intensity
 * choice. When on, intensity is always "inherit" (music-driven): every
 * atmosphere scene already reacts continuously to live audio, so a fixed
 * subtle/normal/strong pin only ever fought that instead of adding anything.
 */
export function AtmosphereFxPanel({ value, disabled, onChange }: AtmosphereFxPanelProps) {
  const presets = listAtmosphereFxPresets();
  const enabled = value.mode !== "off";
  const selectedName = selectedAtmosphereName(value);
  const selectedLabel = enabled ? selectedName : `Off · ${selectedName}`;

  return (
    <div className="inline-flex shrink-0 items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange({ ...value, mode: enabled ? "off" : "inherit" })}
        className={editorToggleClass(enabled, Boolean(disabled), "h-7 w-7 justify-center px-0 text-[11px]")}
        aria-pressed={enabled}
        aria-label={enabled ? `Hide atmosphere fx: ${selectedName}` : `Show atmosphere fx: ${selectedName}`}
        title={enabled ? `Hide atmosphere fx: ${selectedName}` : `Show atmosphere fx: ${selectedName}`}
      >
        <Sparkles size={13} />
      </button>
        <select
          className="h-7 rounded-md border border-white/15 bg-white/95 px-2 text-[11px] font-medium text-black/85 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={enabled ? disabled : true}
          value={value.presetId ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              presetId: event.target.value ? event.target.value : null,
            })
          }
          aria-label={`Atmosphere fx preset: ${selectedLabel}`}
          title={`Selected atmosphere: ${selectedLabel}`}
        >
          <option value="">Default ({getAtmosphereFxPreset(DEFAULT_ATMOSPHERE_FX_PRESET_ID)?.name ?? "Glow"})</option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
    </div>
  );
}
