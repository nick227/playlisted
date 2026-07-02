import type { SongVisualPolicy, VisualMediaType } from "@prisma/client";

export type TheatreSongVisualPolicy =
  | "defaultOnly"
  | "preferAttached"
  | "attachedOnly"
  | "mixAttachedAndDefault";

export type VisualMediaAssetDto = {
  id: string;
  ownerId: string;
  mediaType: "image" | "video";
  url: string;
  thumbnailUrl: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  createdAt: string;
};

export type SongVisualAttachmentDto = {
  id: string;
  songId: string;
  recordingId: string;
  mediaAssetId: string;
  policy: TheatreSongVisualPolicy;
  weight: number;
  order: number;
  label: string | null;
  enabled: boolean;
  playback: Record<string, unknown> | null;
  rotation: Record<string, unknown> | null;
  beatFx: Record<string, unknown> | null;
  tags: string[] | null;
  mediaAsset: VisualMediaAssetDto;
  createdAt: string;
  updatedAt: string;
};

export type SongVisualMediaResponse = {
  songId: string;
  recordingId: string;
  policy: TheatreSongVisualPolicy;
  attachments: SongVisualAttachmentDto[];
};

export function prismaMediaTypeToDto(type: VisualMediaType): "image" | "video" {
  return type === "VIDEO" ? "video" : "image";
}

export function dtoMediaTypeToPrisma(type: "image" | "video"): VisualMediaType {
  return type === "video" ? "VIDEO" : "IMAGE";
}

export function prismaPolicyToTheatre(policy: SongVisualPolicy): Exclude<TheatreSongVisualPolicy, "defaultOnly"> {
  switch (policy) {
    case "ATTACHED_ONLY":
      return "attachedOnly";
    case "MIX_ATTACHED_AND_DEFAULT":
      return "mixAttachedAndDefault";
    default:
      return "preferAttached";
  }
}

export function theatrePolicyToPrisma(
  policy: TheatreSongVisualPolicy | undefined,
): SongVisualPolicy {
  switch (policy) {
    case "attachedOnly":
      return "ATTACHED_ONLY";
    case "mixAttachedAndDefault":
      return "MIX_ATTACHED_AND_DEFAULT";
    default:
      return "PREFER_ATTACHED";
  }
}

export function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseJsonStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const tags = value.filter((entry): entry is string => typeof entry === "string");
  return tags.length > 0 ? tags : null;
}
