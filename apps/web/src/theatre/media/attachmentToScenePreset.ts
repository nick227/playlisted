import type { ScenePresetDef } from '../registry/scenePresets'
import { ROTATION_HOLD_DEFAULT } from '../registry/presetTuning'
import type { VisualMediaAttachment } from './types'
import { USER_IMAGE_MEDIA_ID, USER_VIDEO_MEDIA_ID } from './userMediaEngine'

export const USER_MEDIA_PRESET_PREFIX = 'user-media:'

export function userMediaPresetId(attachmentId: string): string {
  return `${USER_MEDIA_PRESET_PREFIX}${attachmentId}`
}

export function attachmentToScenePreset(attachment: VisualMediaAttachment): ScenePresetDef {
  const isVideo = attachment.mediaType === 'video'
  const playback = attachment.playback ?? {}

  return {
    id: userMediaPresetId(attachment.id),
    label: attachment.label ?? (isVideo ? 'User Video' : 'User Image'),
    category: 'production',
    weight: attachment.weight ?? 1,
    tags: ['user-media', attachment.mediaType, ...(attachment.tags ?? [])],
    audioSensitivity: attachment.beatFx?.enabled ? 'vivid' : 'tame',
    rotation: {
      mode: 'timedMusicAware',
      ...ROTATION_HOLD_DEFAULT,
      ...attachment.rotation,
    },
    layers: [{
      animationId: isVideo ? USER_VIDEO_MEDIA_ID : USER_IMAGE_MEDIA_ID,
      role: 'background',
      options: {
        preset: 'tame',
        zIndex: 100,
        opacity: 1,
        videoUrl: isVideo ? attachment.url : undefined,
        imageUrl: !isVideo ? attachment.url : undefined,
        loop: playback.loop ?? true,
        muted: playback.muted ?? true,
        objectFit: playback.objectFit ?? 'cover',
        startOffsetMs: playback.startOffsetMs ?? 0,
        beatFx: attachment.beatFx,
        mediaAttachmentId: attachment.id,
      },
    }],
  }
}

export function attachmentsToScenePresets(attachments: VisualMediaAttachment[]): ScenePresetDef[] {
  return attachments.map(attachmentToScenePreset)
}
