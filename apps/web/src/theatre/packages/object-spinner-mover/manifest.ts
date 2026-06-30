import type { AnimationPackageManifest } from '../../registry/packages'

export const objectSpinnerMoverManifest: AnimationPackageManifest = {
  id: 'object-spinner-mover',
  label: 'Object Spinner Mover',
  version: '1.0.0',
  kind: 'effect-system',
  category: 'lab',
  description: 'Composable sticker theatre — shape packs, motion presets, beat reactivity, backgrounds, and hero objects from tiny seed entries.',
  capabilities: ['audio-features', 'visual-triggers', 'external-raf', 'reduced-motion', 'particles'],
  reducedMotionSafe: true,
}
