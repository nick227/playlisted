import type { CSSProperties } from "react";

import { getSubtitleStylePreset, type SubtitleStylePreset } from "@/lib/subtitleStylePresets";

export function subtitleStylePresetToCss(preset: SubtitleStylePreset): CSSProperties {
  return {
    fontFamily: preset.fontFamily,
    fontSize: preset.fontSize,
    fontWeight: preset.fontWeight,
    color: preset.color,
    backgroundColor: preset.backgroundColor,
    backgroundImage: preset.backgroundImage,
    textShadow: preset.textShadow,
    borderRadius: preset.borderRadius,
    letterSpacing: preset.letterSpacing,
  };
}

export function subtitleStylePresetToPlaybackCss(preset: SubtitleStylePreset): CSSProperties {
  return {
    fontFamily: preset.fontFamily,
    fontWeight: preset.fontWeight,
    color: preset.color,
    backgroundColor: preset.backgroundColor,
    backgroundImage: preset.backgroundImage,
    textShadow: preset.textShadow,
    borderRadius: preset.borderRadius,
    letterSpacing: preset.letterSpacing,
  };
}

export function subtitleStyleIdToCss(styleId: string): CSSProperties {
  return subtitleStylePresetToCss(getSubtitleStylePreset(styleId));
}

export function subtitleStyleIdToPlaybackCss(styleId: string): CSSProperties {
  return subtitleStylePresetToPlaybackCss(getSubtitleStylePreset(styleId));
}

export function subtitlePositionClassName(position: string): string {
  if (position === "top") return " focus-lane--position-top";
  if (position === "bottom") return " focus-lane--position-bottom";
  return " focus-lane--position-middle";
}
