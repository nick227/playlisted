import type { ScenePresetDef } from '../registry/scenePresets'
import { ROTATION_HOLD_DEFAULT } from '../registry/presetTuning'
import { getNaturalDurationSec, readClipPlayback } from './timelineClipLayout'
import type { VisualMediaAttachment } from './types'
import { resolvePreset } from './resolvePreset'
import { USER_IMAGE_MEDIA_ID, USER_VIDEO_MEDIA_ID } from './userMediaEngine'

export const USER_MEDIA_PRESET_PREFIX = 'user-media:'
export const THEATRE_PRESET_TAG_PREFIX = 'theatre-preset:'

export function userMediaPresetId(attachmentId: string): string {
  return `${USER_MEDIA_PRESET_PREFIX}${attachmentId}`
}

export function readTheatrePresetIdFromTags(tags?: string[] | null): string | null {
  const tag = tags?.find((entry) => entry.startsWith(THEATRE_PRESET_TAG_PREFIX))
  return tag ? tag.slice(THEATRE_PRESET_TAG_PREFIX.length) : null
}

function theatrePresetForAttachment(attachment: VisualMediaAttachment): ScenePresetDef | null {
  const theatrePresetId = readTheatrePresetIdFromTags(attachment.tags)
  if (!theatrePresetId) return null
  return resolvePreset(theatrePresetId)
}

export function attachmentToScenePreset(attachment: VisualMediaAttachment): ScenePresetDef {
  const theatrePreset = theatrePresetForAttachment(attachment)
  if (theatrePreset) {
    const playback = readClipPlayback(attachment)
    const isVideo = attachment.mediaType === 'video'
    const timelineStartSec = playback.timelineStartSec
    const timelineSync = isVideo && typeof timelineStartSec === 'number'
      ? {
        timelineStartSec,
        startOffsetSec: (playback.startOffsetMs ?? 0) / 1000,
        loop: playback.loop ?? true,
        naturalDurationSec: getNaturalDurationSec(attachment),
      }
      : undefined

    return {
      ...theatrePreset,
      id: userMediaPresetId(attachment.id),
      label: attachment.label ?? theatrePreset.label,
      layers: theatrePreset.layers.map((layer) => ({
        ...layer,
        options: {
          ...layer.options,
          ...(timelineSync ? { timelineSync } : {}),
          beatFx: attachment.beatFx,
          mediaAttachmentId: attachment.id,
        },
      })),
    }
  }

  const isVideo = attachment.mediaType === 'video'
  const playback = readClipPlayback(attachment)
  const timelineStartSec = playback.timelineStartSec
  const timelineSync = isVideo && typeof timelineStartSec === 'number'
    ? {
      timelineStartSec,
      startOffsetSec: (playback.startOffsetMs ?? 0) / 1000,
      loop: playback.loop ?? true,
      naturalDurationSec: getNaturalDurationSec(attachment),
    }
    : undefined

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
        loop: timelineSync ? false : (playback.loop ?? true),
        muted: playback.muted ?? true,
        objectFit: playback.objectFit ?? 'cover',
        startOffsetMs: playback.startOffsetMs ?? 0,
        beatFx: attachment.beatFx,
        mediaAttachmentId: attachment.id,
        timelineSync,
      },
    }],
  }
}

export function attachmentsToScenePresets(attachments: VisualMediaAttachment[]): ScenePresetDef[] {
  return attachments.map(attachmentToScenePreset)
}
