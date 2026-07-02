import type { QueryClient } from "@tanstack/react-query";

import type { SongVisualAttachmentRecord, SongVisualMediaRecord } from "@/lib/visualMediaApi";
import type { VisualMediaBeatFx } from "@/theatre/media/types";

import { buildPlaybackPatch } from "../timelineLayout";
import type { ClipBounds } from "../timelineLayout";

export type ClipSyncStatus = "saving" | "error";

export function songVisualQueryKey(recordingId: string) {
  return ["song-visual-media", recordingId] as const;
}

export function readSongVisualData(
  queryClient: QueryClient,
  recordingId: string,
): SongVisualMediaRecord | undefined {
  return queryClient.getQueryData(songVisualQueryKey(recordingId));
}

export function cloneAttachment(attachment: SongVisualAttachmentRecord): SongVisualAttachmentRecord {
  return {
    ...attachment,
    playback: attachment.playback ? { ...attachment.playback } : null,
    beatFx: attachment.beatFx ? { ...attachment.beatFx } : null,
  };
}

export function applyAttachmentPatch(
  queryClient: QueryClient,
  recordingId: string,
  attachmentId: string,
  patch: {
    playback?: Record<string, unknown> | null;
    beatFx?: VisualMediaBeatFx | null;
    order?: number;
    enabled?: boolean;
  },
) {
  queryClient.setQueryData<SongVisualMediaRecord>(songVisualQueryKey(recordingId), (current) => {
    if (!current) return current;
    return {
      ...current,
      attachments: current.attachments.map((attachment) => {
        if (attachment.id !== attachmentId) return attachment;
        return {
          ...attachment,
          ...(patch.order != null ? { order: patch.order } : {}),
          ...(patch.enabled != null ? { enabled: patch.enabled } : {}),
          ...(patch.playback !== undefined
            ? { playback: patch.playback }
            : {}),
          ...(patch.beatFx !== undefined
            ? { beatFx: patch.beatFx }
            : {}),
        };
      }),
    };
  });
}

export function applyClipBoundsPatch(
  queryClient: QueryClient,
  recordingId: string,
  attachmentId: string,
  attachment: SongVisualAttachmentRecord,
  bounds: ClipBounds,
  order?: number,
) {
  applyAttachmentPatch(queryClient, recordingId, attachmentId, {
    order,
    playback: buildPlaybackPatch(attachment, {
      timelineStartSec: bounds.timelineStartSec,
      timelineDurationSec: bounds.timelineDurationSec,
      startOffsetMs: bounds.startOffsetMs,
    }),
  });
}

export function applyLoopPatch(
  queryClient: QueryClient,
  recordingId: string,
  attachmentId: string,
  attachment: SongVisualAttachmentRecord,
  loop: boolean,
  timelineStartSec: number,
  timelineDurationSec: number,
) {
  applyAttachmentPatch(queryClient, recordingId, attachmentId, {
    playback: buildPlaybackPatch(attachment, {
      loop,
      timelineStartSec,
      timelineDurationSec,
    }),
  });
}

export function applyBeatFxPatch(
  queryClient: QueryClient,
  recordingId: string,
  attachmentId: string,
  beatFx: VisualMediaBeatFx,
) {
  applyAttachmentPatch(queryClient, recordingId, attachmentId, { beatFx });
}

export function removeAttachmentFromCache(
  queryClient: QueryClient,
  recordingId: string,
  attachmentId: string,
) {
  queryClient.setQueryData<SongVisualMediaRecord>(songVisualQueryKey(recordingId), (current) => {
    if (!current) return current;
    return {
      ...current,
      attachments: current.attachments.filter((attachment) => attachment.id !== attachmentId),
    };
  });
}

export function restoreAttachmentInCache(
  queryClient: QueryClient,
  recordingId: string,
  snapshot: SongVisualAttachmentRecord,
) {
  queryClient.setQueryData<SongVisualMediaRecord>(songVisualQueryKey(recordingId), (current) => {
    if (!current) return current;
    const exists = current.attachments.some((attachment) => attachment.id === snapshot.id);
    if (exists) {
      return {
        ...current,
        attachments: current.attachments.map((attachment) =>
          attachment.id === snapshot.id ? snapshot : attachment,
        ),
      };
    }
    return {
      ...current,
      attachments: [...current.attachments, snapshot].sort((left, right) => left.order - right.order),
    };
  });
}

export function reconcileAttachmentInCache(
  queryClient: QueryClient,
  recordingId: string,
  updated: SongVisualAttachmentRecord,
) {
  queryClient.setQueryData<SongVisualMediaRecord>(songVisualQueryKey(recordingId), (current) => {
    if (!current) return current;
    return {
      ...current,
      attachments: current.attachments.map((attachment) =>
        attachment.id === updated.id ? updated : attachment,
      ),
    };
  });
}
