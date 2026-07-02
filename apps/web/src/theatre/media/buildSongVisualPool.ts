import type { ScenePresetDef } from '../registry/scenePresets'
import type { TheatreTrackContext } from '../rotation/types'
import type { PickContext } from '../selection/types'
import { attachmentsToScenePresets } from './attachmentToScenePreset'
import { syncDynamicPresets } from './dynamicPresetStore'
import { resolveTrackVisualMedia } from './resolveTrackVisualMedia'
import type { SongVisualPolicy } from './types'

export type SongVisualPickExtras = Pick<PickContext, 'songVisualPolicy' | 'dynamicPresets'>

export function buildSongVisualPickExtras(
  track: TheatreTrackContext | null | undefined,
): Required<SongVisualPickExtras> {
  const resolved = resolveTrackVisualMedia(track)
  if (resolved.attachments.length === 0) {
    syncDynamicPresets([])
    return { songVisualPolicy: 'defaultOnly', dynamicPresets: [] }
  }

  const dynamicPresets = attachmentsToScenePresets(resolved.attachments)
  syncDynamicPresets(dynamicPresets)

  return {
    songVisualPolicy: resolved.policy,
    dynamicPresets,
  }
}
