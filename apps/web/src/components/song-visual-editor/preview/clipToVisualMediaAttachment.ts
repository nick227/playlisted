import type { VisualMediaAttachment, VisualMediaPlayback } from "@/theatre/media/types";

import { readClipPlayback } from "../timelineLayout";
import { resolveAssetUrl, type TimelineClip } from "../types";

export function clipToVisualMediaAttachment(clip: TimelineClip): VisualMediaAttachment {
  const { attachment } = clip;
  const media = attachment.mediaAsset;
  const playback = readClipPlayback(attachment) as VisualMediaPlayback;

  return {
    id: attachment.id,
    songId: attachment.songId,
    trackId: attachment.recordingId,
    mediaType: media.mediaType,
    url: resolveAssetUrl(media.url),
    thumbnailUrl: media.thumbnailUrl ? resolveAssetUrl(media.thumbnailUrl) : undefined,
    label: attachment.label ?? media.originalName,
    weight: attachment.weight,
    order: attachment.order,
    enabled: attachment.enabled,
    durationMs: media.durationMs,
    tags: attachment.tags ?? undefined,
    playback: {
      ...playback,
      timelineStartSec: clip.startSec,
      timelineDurationSec: clip.durationSec,
      loop: clip.loop,
    },
    rotation: attachment.rotation as VisualMediaAttachment["rotation"],
    beatFx: attachment.beatFx ?? undefined,
  };
}
