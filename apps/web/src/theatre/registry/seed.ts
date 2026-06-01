import registry from './index'
import { registerPreset } from '../scenePresets'

import speakerFactory from '../animations/speaker'
import spinAmpFactory from '../animations/spinAmp'
import bioMachineFactory from '../animations/bioMachine'
import weatherSpeakerFactory from '../animations/weatherSpeaker'
import monsterWaveFactory from '../animations/monsterWave'
import stopMotionFlowerStormFactory from '../animations/stopMotionFlowerStorm'

// ─── Animation registry ──────────────────────────────────────────────────────

registry.register({ id: 'speaker',               label: 'Speaker Pulse',          factory: speakerFactory,               visualType: 'canvas', mood: 'calm',    role: 'subject',     weight: 3 })
registry.register({ id: 'spinAmp',               label: 'Spin Amp',               factory: spinAmpFactory,               visualType: 'canvas', mood: 'calm',    role: 'foreground',  weight: 2 })
registry.register({ id: 'bioMachine',            label: 'Bio Machine',            factory: bioMachineFactory,            visualType: 'canvas', mood: 'dynamic', role: 'subject',     weight: 1 })
registry.register({ id: 'weatherSpeaker',        label: 'Weather Speaker',        factory: weatherSpeakerFactory,        visualType: 'canvas', mood: 'dynamic', role: 'background',  weight: 2 })
registry.register({ id: 'monsterWave',           label: 'Monster Wave',           factory: monsterWaveFactory,           visualType: 'canvas', mood: 'chaos',   role: 'foreground',  weight: 1 })
registry.register({ id: 'stopMotionFlowerStorm', label: 'Stop-Motion Flower Storm', factory: stopMotionFlowerStormFactory, visualType: 'canvas', mood: 'dynamic', role: 'subject',   weight: 2 })

// ─── Scene presets ────────────────────────────────────────────────────────────

// Reduced-motion base: single calm speaker at low intensity
registerPreset({
  id: 'quietPulse', label: 'Quiet Pulse', category: 'production', weight: 1,
  layers: [
    { animationId: 'speaker', role: 'subject',
      options: { opacity: 0.75, zIndex: 101, blendMode: 'normal', intensity: 0.25, sensitivity: 0.4 } },
  ],
})

// Artwork-first: weather atmosphere behind a centred speaker pulse
registerPreset({
  id: 'safeArtwork', label: 'Safe Artwork', category: 'production', weight: 3,
  reducedMotionPreset: 'quietPulse',
  layers: [
    { animationId: 'weatherSpeaker', role: 'background',
      options: { opacity: 0.55, zIndex: 100, blendMode: 'normal', intensity: 0.5, sensitivity: 0.7 } },
    { animationId: 'speaker', role: 'subject',
      options: { opacity: 0.92, zIndex: 101, blendMode: 'normal', intensity: 0.9, sensitivity: 1.0 } },
    { animationId: 'spinAmp', role: 'foreground',
      options: { opacity: 0.70, zIndex: 102, blendMode: 'screen', intensity: 0.8, sensitivity: 0.9 } },
  ],
})

// Bio + signal: cellular field behind a speaker, spinning rings on top
registerPreset({
  id: 'signalOrganism', label: 'Signal Organism', category: 'production', weight: 2,
  reducedMotionPreset: 'quietPulse',
  layers: [
    { animationId: 'bioMachine', role: 'background',
      options: { opacity: 0.50, zIndex: 100, blendMode: 'normal', intensity: 0.6, sensitivity: 0.8 } },
    { animationId: 'speaker', role: 'subject',
      options: { opacity: 0.90, zIndex: 101, blendMode: 'normal', intensity: 1.0, sensitivity: 1.0 } },
    { animationId: 'spinAmp', role: 'foreground',
      options: { opacity: 0.80, zIndex: 102, blendMode: 'screen', intensity: 1.0, sensitivity: 1.0 } },
  ],
})

// Geometric tunnel: spin rings dominate, bio + wave layers blend underneath
registerPreset({
  id: 'geometryTunnel', label: 'Geometry Tunnel', category: 'production', weight: 2,
  reducedMotionPreset: 'quietPulse',
  layers: [
    { animationId: 'spinAmp', role: 'background',
      options: { opacity: 0.70, zIndex: 100, blendMode: 'normal', intensity: 1.2, sensitivity: 1.3 } },
    { animationId: 'bioMachine', role: 'subject',
      options: { opacity: 0.60, zIndex: 101, blendMode: 'screen', intensity: 0.8, sensitivity: 0.9 } },
    { animationId: 'monsterWave', role: 'foreground',
      options: { opacity: 0.50, zIndex: 102, blendMode: 'screen', intensity: 0.9, sensitivity: 1.0 } },
  ],
})

// Stop-motion flower narrative — full-canvas, single layer
registerPreset({
  id: 'stormFlower', label: 'Storm Flower', category: 'lab', weight: 2,
  reducedMotionPreset: 'quietPulse',
  layers: [
    { animationId: 'stopMotionFlowerStorm', role: 'subject',
      options: { opacity: 0.98, zIndex: 101 } },
  ],
})

// Layered waves + speaker pulse
registerPreset({
  id: 'monsterWaveStack', label: 'Monster Wave Stack', category: 'lab', weight: 1,
  reducedMotionPreset: 'quietPulse',
  layers: [
    { animationId: 'monsterWave', role: 'background',
      options: { opacity: 0.60, zIndex: 100, blendMode: 'normal', intensity: 0.7, sensitivity: 0.8 } },
    { animationId: 'speaker', role: 'subject',
      options: { opacity: 0.90, zIndex: 101, blendMode: 'normal', intensity: 1.0, sensitivity: 1.0 } },
    { animationId: 'spinAmp', role: 'foreground',
      options: { opacity: 0.75, zIndex: 102, blendMode: 'screen', intensity: 0.8, sensitivity: 0.9 } },
  ],
})

export default registry
