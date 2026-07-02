import { getPreset } from "@/theatre/registry/scenePresets";
import { SEED_VIDEO_ENTRIES } from "@/theatre/packages/createVideoPackage";
import { THEATRE_PRESET_TAG_PREFIX } from "@/theatre/media/attachmentToScenePreset";

import type { VisualLibraryRow } from "./useSongVisualLibraryItems";

export { readTheatrePresetIdFromTags } from "@/theatre/media/attachmentToScenePreset";

export function theatrePresetTag(presetId: string) {
  return `${THEATRE_PRESET_TAG_PREFIX}${presetId}`;
}

const FEATURED_CANVAS_PRESET_IDS = ["cheechChongFarm"];

export function buildTheatreFxCommunityRows(): VisualLibraryRow[] {
  const rows: VisualLibraryRow[] = [];

  for (const presetId of FEATURED_CANVAS_PRESET_IDS) {
    const preset = getPreset(presetId);
    if (!preset) continue;
    rows.push({
      id: `theatre-preset-${presetId}`,
      label: preset.label,
      detail: "Theatre animation",
      thumbUrl: null,
      mediaType: "image",
      theatrePresetId: presetId,
      rank: -2,
      communitySource: "theatre",
    });
  }

  for (const [index, video] of SEED_VIDEO_ENTRIES.entries()) {
    rows.push({
      id: `theatre-video-${video.id}`,
      label: video.label,
      detail: "Theatre video",
      thumbUrl: null,
      mediaType: "video",
      importUrl: video.videoUrl,
      rank: 100 + index,
      communitySource: "theatre",
    });
  }

  return rows;
}
