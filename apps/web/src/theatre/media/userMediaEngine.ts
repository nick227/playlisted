import VideoAnimation from '../core/VideoAnimation'
import { ImageAnimation } from '../core/ImageAnimation'
import registry from '../registry'

export const USER_VIDEO_MEDIA_ID = 'userVideoMedia'
export const USER_IMAGE_MEDIA_ID = 'userImageMedia'

export function registerUserMediaEngine(): void {
  if (!registry.has(USER_VIDEO_MEDIA_ID)) {
    registry.register({
      id: USER_VIDEO_MEDIA_ID,
      label: 'User Video Media',
      factory: () => new VideoAnimation({ defaultZIndex: 100 }),
      visualType: 'video',
      mood: 'calm',
      role: 'background',
      weight: 1,
    })
  }

  if (!registry.has(USER_IMAGE_MEDIA_ID)) {
    registry.register({
      id: USER_IMAGE_MEDIA_ID,
      label: 'User Image Media',
      factory: () => new ImageAnimation({ defaultZIndex: 100 }),
      visualType: 'image',
      mood: 'calm',
      role: 'background',
      weight: 1,
    })
  }
}
