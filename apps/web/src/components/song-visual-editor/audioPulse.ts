import type { VisualMediaBeatFx } from "@/theatre/media/types";

import type { SongVisualAttachmentRecord } from "@/lib/visualMediaApi";

export const DEFAULT_VIDEO_BEAT_FX: VisualMediaBeatFx = {
  enabled: true,
  intensity: "subtle",
  effects: ["scale", "brightness"],
};

export function readClipAudioPulse(attachment: Pick<SongVisualAttachmentRecord, "beatFx">): boolean {
  return attachment.beatFx?.enabled === true;
}

export function beatFxForAudioPulse(
  enabled: boolean,
  existing?: VisualMediaBeatFx | null,
): VisualMediaBeatFx {
  if (!enabled) {
    return existing ? { ...existing, enabled: false } : { enabled: false };
  }
  return {
    enabled: true,
    intensity: existing?.intensity ?? DEFAULT_VIDEO_BEAT_FX.intensity,
    effects: existing?.effects ?? DEFAULT_VIDEO_BEAT_FX.effects,
  };
}

export function defaultAssetAudioPulse(_mediaType: "image" | "video"): boolean {
  return false;
}
