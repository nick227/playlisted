import type { SongVisualAttachmentRecord } from "@/lib/visualMediaApi";
import type { SongVisualPolicy } from "@/theatre/media/types";

export type TimelineClip = {
  attachment: SongVisualAttachmentRecord;
  startSec: number;
  endSec: number;
  durationSec: number;
  loop: boolean;
  naturalDurationSec: number;
};

export type SongVisualEditorRecording = {
  id: string;
  title: string;
  audioUrl?: string | null;
  durationSeconds?: number | null;
};

/** Checked = built-in site/theatre visuals may appear alongside attached media. */
export function policyIncludesSiteMedia(policy: SongVisualPolicy): boolean {
  return policy !== "attachedOnly";
}

export function policyFromIncludeSiteMedia(includeSiteMedia: boolean): Exclude<SongVisualPolicy, "defaultOnly"> {
  return includeSiteMedia ? "preferAttached" : "attachedOnly";
}

export function findClipAtTime(clips: TimelineClip[], timeSec: number): TimelineClip | null {
  return clips.find((clip) => timeSec >= clip.startSec && timeSec < clip.endSec) ?? null;
}

export function resolveAssetUrl(url: string) {
  return new URL(url, window.location.origin).href;
}

export { layoutTimelineClips, getRemainingTimelineSec } from "./timelineLayout";
