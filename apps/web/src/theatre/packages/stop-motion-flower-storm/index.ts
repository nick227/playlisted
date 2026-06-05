import type { AnimationPackage } from '../../registry/packages'
import stopMotionFlowerStormFactory from './StopMotionFlowerStormScene'
import { stopMotionFlowerStormManifest } from './manifest'
import { stopMotionFlowerStormPresets } from './presets'

export { stopMotionFlowerStormFactory }

export const stopMotionFlowerStormPackage: AnimationPackage = {
  manifest: stopMotionFlowerStormManifest,
  animations: [
    { id: 'stopMotionFlowerStorm', label: 'Stop-Motion Flower Storm', factory: stopMotionFlowerStormFactory, visualType: 'canvas', mood: 'dynamic', role: 'subject', weight: 2 },
  ],
  presets: stopMotionFlowerStormPresets,
}
