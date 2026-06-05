import type { AnimationPackage } from '../../registry/packages'
import spinAmpFactory from './SpinAmpScene'
import { spinAmpManifest } from './manifest'
import { spinAmpPresets } from './presets'

export { spinAmpFactory }

export const spinAmpPackage: AnimationPackage = {
  manifest: spinAmpManifest,
  animations: [
    { id: 'spinAmp', label: 'Spin Amp', factory: spinAmpFactory, visualType: 'canvas', mood: 'calm', role: 'foreground', weight: 2 },
  ],
  presets: spinAmpPresets,
}
