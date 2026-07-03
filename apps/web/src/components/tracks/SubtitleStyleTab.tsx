import type { CSSProperties } from "react";
import { AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, AlignVerticalJustifyStart } from "lucide-react";

import {
  getSubtitleStylePreset,
  SUBTITLE_STYLE_PRESETS,
  type SubtitlePosition,
  type SubtitleStylePreset,
} from "@/lib/subtitleStylePresets";

type SubtitleStyleTabProps = {
  position: SubtitlePosition;
  styleId: string;
  previewText?: string;
  onPositionChange: (position: SubtitlePosition) => void;
  onStyleChange: (styleId: string) => void;
};

const POSITION_OPTIONS: Array<{
  value: SubtitlePosition;
  label: string;
  icon: typeof AlignVerticalJustifyStart;
}> = [
  { value: "top", label: "Top", icon: AlignVerticalJustifyStart },
  { value: "middle", label: "Middle", icon: AlignVerticalJustifyCenter },
  { value: "bottom", label: "Bottom", icon: AlignVerticalJustifyEnd },
];

function stylePreviewCss(preset: SubtitleStylePreset): CSSProperties {
  return {
    fontFamily: preset.fontFamily,
    fontSize: preset.fontSize,
    fontWeight: preset.fontWeight,
    color: preset.color,
    backgroundColor: preset.backgroundColor,
    textShadow: preset.textShadow,
    borderRadius: preset.borderRadius,
    letterSpacing: preset.letterSpacing,
  };
}

function positionAlignClass(position: SubtitlePosition): string {
  if (position === "top") return "items-start pt-5";
  if (position === "middle") return "items-center";
  return "items-end pb-5";
}

export function SubtitleStyleTab({
  position,
  styleId,
  previewText = "Sing along with the lyrics here",
  onPositionChange,
  onStyleChange,
}: SubtitleStyleTabProps) {
  const activeStyle = getSubtitleStylePreset(styleId);

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
      <section>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/40">Preview</h3>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900 to-black">
          <div className={`flex h-44 px-4 ${positionAlignClass(position)}`}>
            <p
              className="max-w-[88%] px-3 py-2 text-center leading-snug"
              style={stylePreviewCss(activeStyle)}
            >
              {previewText}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/40">Position</h3>
        <div className="grid grid-cols-3 gap-2">
          {POSITION_OPTIONS.map(({ value, label, icon: Icon }) => {
            const selected = position === value;
            return (
              <button
                key={value}
                type="button"
                className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${
                  selected
                    ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => onPositionChange(value)}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/40">Style</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SUBTITLE_STYLE_PRESETS.map((preset) => {
            const selected = styleId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={`rounded-lg border p-3 text-left transition-colors ${
                  selected
                    ? "border-emerald-400/50 bg-emerald-400/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
                onClick={() => onStyleChange(preset.id)}
              >
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white/50">
                  {preset.name}
                </span>
                <span
                  className="inline-block max-w-full truncate px-2 py-1 text-sm leading-tight"
                  style={stylePreviewCss(preset)}
                >
                  Sample
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
