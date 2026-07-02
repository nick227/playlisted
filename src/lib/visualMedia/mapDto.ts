import type { SongVisualAttachment, VisualMediaAsset } from "@prisma/client";

import {
  sanitizeBeatFxJson,
  sanitizeLabel,
  sanitizeMediaDimension,
  sanitizeMediaDurationMs,
  sanitizeOrder,
  sanitizePlaybackJson,
  sanitizeRotationJson,
  sanitizeTagsJson,
  sanitizeWeight,
} from "./sanitizeAttachmentJson.js";
import {
  prismaMediaTypeToDto,
  prismaPolicyToTheatre,
  type TheatreSongVisualPolicy,
  type SongVisualAttachmentDto,
  type SongVisualMediaResponse,
  type VisualMediaAssetDto,
} from "./types.js";

type AttachmentWithAsset = SongVisualAttachment & { mediaAsset: VisualMediaAsset };

export function mapVisualMediaAsset(asset: VisualMediaAsset): VisualMediaAssetDto {
  return {
    id: asset.id,
    ownerId: asset.ownerId,
    mediaType: prismaMediaTypeToDto(asset.mediaType),
    url: asset.url,
    thumbnailUrl: asset.thumbnailUrl,
    originalName: asset.originalName,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    durationMs: sanitizeMediaDurationMs(asset.durationMs),
    width: sanitizeMediaDimension(asset.width),
    height: sanitizeMediaDimension(asset.height),
    createdAt: asset.createdAt.toISOString(),
  };
}

export function mapSongVisualAttachment(
  attachment: AttachmentWithAsset,
  recordingId: string,
): SongVisualAttachmentDto {
  return {
    id: attachment.id,
    songId: recordingId,
    recordingId,
    mediaAssetId: attachment.mediaAssetId,
    policy: prismaPolicyToTheatre(attachment.policy),
    weight: sanitizeWeight(attachment.weight),
    order: sanitizeOrder(attachment.sortOrder),
    label: sanitizeLabel(attachment.label),
    enabled: attachment.enabled,
    playback: sanitizePlaybackJson(attachment.playbackJson),
    rotation: sanitizeRotationJson(attachment.rotationJson),
    beatFx: sanitizeBeatFxJson(attachment.beatFxJson),
    tags: sanitizeTagsJson(attachment.tagsJson),
    mediaAsset: mapVisualMediaAsset(attachment.mediaAsset),
    createdAt: attachment.createdAt.toISOString(),
    updatedAt: attachment.updatedAt.toISOString(),
  };
}

function resolveEnabledVisualPolicy(attachments: AttachmentWithAsset[]): TheatreSongVisualPolicy {
  const enabled = attachments.filter((attachment) => attachment.enabled);
  if (enabled.length === 0) return "defaultOnly";

  const policies = enabled.map((attachment) => prismaPolicyToTheatre(attachment.policy));
  if (policies.includes("attachedOnly")) return "attachedOnly";
  if (policies.includes("mixAttachedAndDefault")) return "mixAttachedAndDefault";
  return "preferAttached";
}

export function buildSongVisualMediaResponse(
  recordingId: string,
  attachments: AttachmentWithAsset[],
): SongVisualMediaResponse {
  return {
    songId: recordingId,
    recordingId,
    policy: resolveEnabledVisualPolicy(attachments),
    attachments: attachments.map((attachment) => mapSongVisualAttachment(attachment, recordingId)),
  };
}
