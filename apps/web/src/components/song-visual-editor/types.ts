import type { SongVisualAttachmentRecord } from "@/lib/visualMediaApi";
import type { SongVisualPolicy } from "@/theatre/media/types";

export type TimelineClip = {
  attachment: SongVisualAttachmentRecord;
  startSec: number;
  endSec: number;
};

export type SongVisualEditorRecording = {
  id: string;
  title: string;
  audioUrl?: string | null;
  durationSeconds?: number | null;
  artworkUrl?: string | null;
};

/** Checked = built-in site/theatre visuals may appear alongside attached media. */
export function policyIncludesSiteMedia(policy: SongVisualPolicy): boolean {
  return policy !== "attachedOnly";
}

export function policyFromIncludeSiteMedia(includeSiteMedia: boolean): Exclude<SongVisualPolicy, "defaultOnly"> {
  return includeSiteMedia ? "preferAttached" : "attachedOnly";
}

export function layoutTimelineClips(
  attachments: SongVisualAttachmentRecord[],
  durationSec: number,
): TimelineClip[] {
  const enabled = attachments
    .filter((attachment) => attachment.enabled)
    .sort((left, right) => left.order - right.order);

  if (enabled.length === 0 || durationSec <= 0) return [];

  const totalWeight = enabled.reduce((sum, attachment) => sum + Math.max(1, attachment.weight), 0);
  let cursorSec = 0;

  return enabled.map((attachment) => {
    const fraction = Math.max(1, attachment.weight) / totalWeight;
    const widthSec = durationSec * fraction;
    const clip: TimelineClip = {
      attachment,
      startSec: cursorSec,
      endSec: cursorSec + widthSec,
    };
    cursorSec += widthSec;
    return clip;
  });
}

export function findClipAtTime(clips: TimelineClip[], timeSec: number): TimelineClip | null {
  return clips.find((clip) => timeSec >= clip.startSec && timeSec < clip.endSec) ?? clips.at(-1) ?? null;
}

export function resolveAssetUrl(url: string) {
  return new URL(url, window.location.origin).href;
}
