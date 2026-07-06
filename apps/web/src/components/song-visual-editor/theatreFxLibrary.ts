import "@/theatre/registry/seed";

import { SEED_IMAGE_ENTRIES } from "@/theatre/packages/createImagePackage";
import { SEED_VIDEO_ENTRIES } from "@/theatre/packages/createVideoPackage";
import registry from "@/theatre/registry";
import { listPresets, type ScenePresetDef } from "@/theatre/registry/scenePresets";
import { THEATRE_PRESET_TAG_PREFIX } from "@/theatre/media/attachmentToScenePreset";

import type { VisualLibraryRow } from "./useSongVisualLibraryItems";

export { readTheatrePresetIdFromTags } from "@/theatre/media/attachmentToScenePreset";

export type CommunityKind = "animations" | "videos" | "images";

export function theatrePresetTag(presetId: string) {
  return `${THEATRE_PRESET_TAG_PREFIX}${presetId}`;
}

const VIDEO_URL_BY_PRESET_ID = new Map(
  SEED_VIDEO_ENTRIES.map((entry) => [entry.id, entry.videoUrl]),
);

const IMAGE_URLS_BY_PRESET_ID = new Map(
  SEED_IMAGE_ENTRIES.map((entry) => [entry.id, entry.imageUrlCandidates]),
);

function presetPrimaryKind(preset: ScenePresetDef): CommunityKind | null {
  const animationId = preset.layers[0]?.animationId;
  if (!animationId) return null;

  const entry = registry.get(animationId);
  if (!entry) return null;

  if (entry.visualType === "video") return "videos";
  if (entry.visualType === "image") return "images";
  if (entry.visualType === "canvas" || entry.visualType === "hybrid") return "animations";
  return null;
}

function isSelectableCommunityPreset(preset: ScenePresetDef) {
  if (preset.tags?.includes("internal")) return false;
  if (preset.tags?.includes("user-media")) return false;
  if (preset.id === "quietPulse") return false;
  return presetPrimaryKind(preset) != null;
}

function presetToRow(preset: ScenePresetDef, kind: CommunityKind, rank: number): VisualLibraryRow {
  const imageUrls = kind === "images" ? IMAGE_URLS_BY_PRESET_ID.get(preset.id) : undefined;
  const previewUrl =
    kind === "videos"
      ? VIDEO_URL_BY_PRESET_ID.get(preset.id) ?? null
      : imageUrls?.[0] ?? null;
  const detail =
    kind === "animations" ? "Theatre animation" : kind === "videos" ? "Theatre video" : "Theatre image";

  return {
    id: `community-${kind}-${preset.id}`,
    label: preset.label,
    detail,
    thumbUrl: previewUrl,
    thumbUrls: imageUrls,
    mediaType: kind === "videos" ? "video" : "image",
    theatrePresetId: preset.id,
    rank,
    communityKind: kind,
  };
}

export function buildCommunityLibraryRows(): Record<CommunityKind, VisualLibraryRow[]> {
  const buckets: Record<CommunityKind, VisualLibraryRow[]> = {
    animations: [],
    videos: [],
    images: [],
  };

  const presets = listPresets()
    .filter(isSelectableCommunityPreset)
    .sort((left, right) => left.label.localeCompare(right.label));

  for (const [index, preset] of presets.entries()) {
    const kind = presetPrimaryKind(preset);
    if (!kind) continue;
    buckets[kind].push(presetToRow(preset, kind, index));
  }

  return buckets;
}
