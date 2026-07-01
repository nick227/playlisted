import type { AnimationContext } from '../../core/IAnimation'
import { ImageAnimation } from '../../core/ImageAnimation'
import type { AnimationPackage } from '../../registry/packages'
import { albumArtManifest } from './manifest'
import { albumArtPresets } from './presets'

function albumArtFactory(_ctx: AnimationContext) {
  return new ImageAnimation()
}

export const albumArtPackage: AnimationPackage = {
  manifest: albumArtManifest,
  animations: [
    {
      id: 'albumArtImage',
      label: 'Album Art Image',
      factory: albumArtFactory,
      visualType: 'image',
      mood: 'calm',
      role: 'background',
      weight: 1,
    },
  ],
  presets: albumArtPresets,
}
