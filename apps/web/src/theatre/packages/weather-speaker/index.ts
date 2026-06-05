import type { AnimationPackage } from '../../registry/packages'
import weatherSpeakerFactory from './WeatherSpeakerScene'
import { weatherSpeakerManifest } from './manifest'
import { weatherSpeakerPresets } from './presets'

export { weatherSpeakerFactory }

export const weatherSpeakerPackage: AnimationPackage = {
  manifest: weatherSpeakerManifest,
  animations: [
    { id: 'weatherSpeaker', label: 'Weather Speaker', factory: weatherSpeakerFactory, visualType: 'canvas', mood: 'dynamic', role: 'background', weight: 2 },
  ],
  presets: weatherSpeakerPresets,
}
