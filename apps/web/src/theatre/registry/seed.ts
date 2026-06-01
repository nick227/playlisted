import registry from './index'
import { registerPreset } from '../scenePresets'

import speakerFactory from '../animations/speaker'
import spinAmpFactory from '../animations/spinAmp'
import bioMachineFactory from '../animations/bioMachine'
import weatherSpeakerFactory from '../animations/weatherSpeaker'
import monsterWaveFactory from '../animations/monsterWave'
import stopMotionFlowerStormFactory from '../animations/stopMotionFlowerStorm'
import cuteMonstroFactory from '../animations/cuteMonstro'
import signalOrganismFactory from '../animations/signalOrganism'

// ─── Animation registry ──────────────────────────────────────────────────────

registry.register({ id: 'speaker',               label: 'Speaker Pulse',          factory: speakerFactory,               visualType: 'canvas', mood: 'calm',    role: 'subject',     weight: 3 })
registry.register({ id: 'spinAmp',               label: 'Spin Amp',               factory: spinAmpFactory,               visualType: 'canvas', mood: 'calm',    role: 'foreground',  weight: 2 })
registry.register({ id: 'bioMachine',            label: 'Bio Machine',            factory: bioMachineFactory,            visualType: 'canvas', mood: 'dynamic', role: 'subject',     weight: 1 })
registry.register({ id: 'weatherSpeaker',        label: 'Weather Speaker',        factory: weatherSpeakerFactory,        visualType: 'canvas', mood: 'dynamic', role: 'background',  weight: 2 })
registry.register({ id: 'monsterWave',           label: 'Monster Wave',           factory: monsterWaveFactory,           visualType: 'canvas', mood: 'chaos',   role: 'foreground',  weight: 1 })
registry.register({ id: 'stopMotionFlowerStorm', label: 'Stop-Motion Flower Storm', factory: stopMotionFlowerStormFactory, visualType: 'canvas', mood: 'dynamic', role: 'subject',   weight: 2 })
registry.register({ id: 'cuteMonstro',          label: 'Cute Monstro',           factory: cuteMonstroFactory,           visualType: 'canvas', mood: 'dynamic', role: 'subject',   weight: 2 })
registry.register({ id: 'signalOrganismScene',  label: 'Signal Organism',        factory: signalOrganismFactory,        visualType: 'canvas', mood: 'dynamic', role: 'subject',   weight: 2 })

// ─── Scene presets ────────────────────────────────────────────────────────────

// Reduced-motion base: single calm speaker at low intensity
registerPreset({
  id: 'quietPulse', label: 'Quiet Pulse', category: 'production', weight: 1,
  layers: [
    { animationId: 'speaker', role: 'subject',
      options: { opacity: 0.75, zIndex: 101, blendMode: 'normal', intensity: 0.25, sensitivity: 0.4 } },
  ],
})


// Unified organism: cells, veins, tendrils, core, rings, gear — phase-driven
registerPreset({
  id: 'signalOrganism', label: 'Signal Organism', category: 'production', weight: 3,
  reducedMotionPreset: 'quietPulse',
  layers: [
    { animationId: 'signalOrganismScene', role: 'subject',
      options: { opacity: 0.98, zIndex: 101, blendMode: 'normal', intensity: 1.0, sensitivity: 1.0 } },
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

// Cute monster character with music-reactive lighting and comets
registerPreset({
  id: 'monsterWaveStack', label: 'Cute Monstro', category: 'production', weight: 2,
  reducedMotionPreset: 'quietPulse',
  layers: [
    { animationId: 'cuteMonstro', role: 'subject',
      options: { opacity: 1.0, zIndex: 101, blendMode: 'normal', intensity: 1.0, sensitivity: 1.0 } },
  ],
})

export default registry
