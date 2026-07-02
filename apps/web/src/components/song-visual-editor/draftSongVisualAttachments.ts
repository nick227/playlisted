import type { SongVisualAttachmentRecord, SongVisualMediaRecord } from "@/lib/visualMediaApi";
import type { SongVisualPolicy, VisualMediaBeatFx } from "@/theatre/media/types";

import { buildPlaybackPatch } from "./timelineLayout";
import type { ClipBounds } from "./timelineLayout";
import { cloneAttachment } from "./hooks/optimisticSongVisualCache";

export function cloneAttachments(attachments: SongVisualAttachmentRecord[]) {
  return attachments.map(cloneAttachment);
}

export function isDraftAttachmentId(id: string) {
  return id.startsWith("draft-");
}

function normalizeAttachment(attachment: SongVisualAttachmentRecord) {
  return {
    id: attachment.id,
    mediaAssetId: attachment.mediaAssetId,
    policy: attachment.policy,
    weight: attachment.weight,
    order: attachment.order,
    label: attachment.label,
    enabled: attachment.enabled,
    playback: attachment.playback,
    beatFx: attachment.beatFx,
  };
}

export function attachmentsListEqual(
  left: SongVisualAttachmentRecord[],
  right: SongVisualAttachmentRecord[],
) {
  if (left.length !== right.length) return false;
  const rightById = new Map(right.map((attachment) => [attachment.id, attachment]));
  return left.every((attachment) => {
    const other = rightById.get(attachment.id);
    if (!other) return false;
    return JSON.stringify(normalizeAttachment(attachment)) === JSON.stringify(normalizeAttachment(other));
  });
}

export function patchDraftAttachment(
  attachments: SongVisualAttachmentRecord[],
  attachmentId: string,
  patch: {
    playback?: Record<string, unknown> | null;
    beatFx?: VisualMediaBeatFx | null;
    policy?: SongVisualPolicy;
    order?: number;
    enabled?: boolean;
  },
) {
  return attachments.map((attachment) => {
    if (attachment.id !== attachmentId) return attachment;
    return {
      ...attachment,
      ...(patch.order != null ? { order: patch.order } : {}),
      ...(patch.enabled != null ? { enabled: patch.enabled } : {}),
      ...(patch.policy != null ? { policy: patch.policy } : {}),
      ...(patch.playback !== undefined ? { playback: patch.playback } : {}),
      ...(patch.beatFx !== undefined ? { beatFx: patch.beatFx } : {}),
    };
  });
}

export function applyDraftClipBounds(
  attachments: SongVisualAttachmentRecord[],
  attachmentId: string,
  attachment: SongVisualAttachmentRecord,
  bounds: ClipBounds,
  order?: number,
) {
  return patchDraftAttachment(attachments, attachmentId, {
    order,
    playback: buildPlaybackPatch(attachment, {
      timelineStartSec: bounds.timelineStartSec,
      timelineDurationSec: bounds.timelineDurationSec,
      startOffsetMs: bounds.startOffsetMs,
    }),
  });
}

export function applyDraftPolicy(
  attachments: SongVisualAttachmentRecord[],
  policy: SongVisualPolicy,
) {
  return attachments.map((attachment) =>
    attachment.enabled ? { ...attachment, policy } : attachment,
  );
}

export function removeDraftAttachment(attachments: SongVisualAttachmentRecord[], attachmentId: string) {
  return attachments.filter((attachment) => attachment.id !== attachmentId);
}

export function createDraftAttachment(input: {
  recordingId: string;
  asset: SongVisualAttachmentRecord["mediaAsset"];
  policy: SongVisualPolicy;
  order: number;
  label: string;
  playback: Record<string, unknown>;
  beatFx?: VisualMediaBeatFx | null;
}): SongVisualAttachmentRecord {
  const now = new Date().toISOString();
  return {
    id: `draft-${crypto.randomUUID()}`,
    songId: input.recordingId,
    recordingId: input.recordingId,
    mediaAssetId: input.asset.id,
    policy: input.policy,
    weight: 1,
    order: input.order,
    label: input.label,
    enabled: true,
    playback: input.playback,
    rotation: null,
    beatFx: input.beatFx ?? null,
    tags: null,
    mediaAsset: input.asset,
    createdAt: now,
    updatedAt: now,
  };
}

export function draftPolicyFromServer(data: SongVisualMediaRecord | undefined): SongVisualPolicy {
  return data?.policy ?? "preferAttached";
}
