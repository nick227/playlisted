import type { ScenePresetDef } from '../../registry/scenePresets'

export const weatherSpeakerPresets: ScenePresetDef[] = [
  {
    id: 'weatherSpeakerSolo', label: 'Weather Speaker', category: 'lab', weight: 1, reducedMotionPreset: 'quietPulse',
    layers: [{ animationId: 'weatherSpeaker', role: 'background',
      options: { opacity: 1, zIndex: 100, blendMode: 'normal', intensity: 1, sensitivity: 1 } }],
  },
]
