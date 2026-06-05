import type { AnimationPackage } from '../../registry/packages'
import speakerFactory from './SpeakerScene'
import { speakerManifest } from './manifest'
import { speakerPresets } from './presets'

export { speakerFactory }

export const speakerPackage: AnimationPackage = {
  manifest: speakerManifest,
  animations: [
    { id: 'speaker', label: 'Speaker Pulse', factory: speakerFactory, visualType: 'canvas', mood: 'calm', role: 'subject', weight: 3 },
  ],
  presets: speakerPresets,
}
