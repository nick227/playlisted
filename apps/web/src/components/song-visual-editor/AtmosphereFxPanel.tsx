import { Sparkles } from "lucide-react";

import { listAtmosphereFxPresets } from "@/theatre/atmosphere/catalog";
import type { SongAtmosphereFx } from "@/theatre/media/types";

import { editorToggleClass } from "./editorToggle";

type AtmosphereFxPanelProps = {
  value: SongAtmosphereFx;
  disabled?: boolean;
  onChange: (next: SongAtmosphereFx) => void;
};

/**
 * Compact toolbar control — on/off toggle + preset picker, no intensity
 * choice. When on, intensity is always "inherit" (music-driven): every
 * atmosphere scene already reacts continuously to live audio, so a fixed
 * subtle/normal/strong pin only ever fought that instead of adding anything.
 */
export function AtmosphereFxPanel({ value, disabled, onChange }: AtmosphereFxPanelProps) {
  const presets = listAtmosphereFxPresets();
  const enabled = value.mode !== "off";

  return (
    <div className="inline-flex shrink-0 items-center gap-1">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange({ ...value, mode: enabled ? "off" : "inherit" })}
        className={editorToggleClass(enabled, Boolean(disabled), "h-7 w-7 justify-center px-0 text-[11px]")}
        aria-pressed={enabled}
        aria-label={enabled ? "Hide atmosphere fx" : "Show atmosphere fx"}
        title={enabled ? "Hide atmosphere fx" : "Show atmosphere fx"}
      >
        <Sparkles size={13} />
      </button>
      {enabled ? (
        <select
          className="h-7 rounded-md border border-white/15 bg-white/5 px-2 text-[11px] font-medium text-white/85 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled}
          value={value.presetId ?? ""}
          onChange={(event) =>
            onChange({
              ...value,
              presetId: event.target.value ? event.target.value : null,
            })
          }
          aria-label="Atmosphere fx preset"
        >
          <option value="">Default (Glow)</option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
