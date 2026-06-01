import { registerCastPreset } from '../../sceneKit'
import type { CastMemberDef } from '../../sceneKit'

const BARTENDER: CastMemberDef = {
  id: 'bartender',
  placement: { nx: 0.57, ny: 0.72, scale: 0.48, z: 0.42 },
  role: 'speaker',
  faceLayer: 'studio',
  speaks: true,
  phraseBank: 'bar',
  phraseSalt: 11,
  phraseFormat: 'bubble',
  speakDelayMs: 1400,
  eyeTrackX: 0.15,
  eyeTrackY: -0.1,
  faceMode: 'watching',
}

const CONVERSATION_HOST: CastMemberDef = {
  id: 'host',
  placement: { nx: 0.36, ny: 0.5, scale: 1.0, z: 0.52 },
  role: 'speaker',
  faceLayer: 'studio',
  speaks: true,
  phraseBank: 'venue',
  phraseSalt: 77,
  phraseFormat: 'subtitleShard',
  speakDelayMs: 700,
  eyeTrackX: 0.12,
  eyeTrackY: -0.05,
  faceMode: 'talking',
}

const CONVERSATION_GUEST: CastMemberDef = {
  id: 'guest',
  placement: { nx: 0.7, ny: 0.54, scale: 0.72, z: 0.5 },
  role: 'listener',
  faceLayer: 'studio',
  speaks: false,
  eyeTrackX: -0.08,
  eyeTrackY: 0.06,
  alpha: 0.9,
  faceMode: 'watching',
}

const DOOR_WHISPERER: CastMemberDef = {
  id: 'threshold-voice',
  placement: { nx: 0.5, ny: 0.58, scale: 0.55, z: 0.58 },
  role: 'speaker',
  faceLayer: 'studio',
  speaks: true,
  phraseBank: 'threshold',
  phraseSalt: 203,
  phraseFormat: 'wallText',
  speakDelayMs: 180,
  faceMode: 'dissolving',
}

export function registerLiminalCastPresets() {
  registerCastPreset('liminal.bartender', [BARTENDER])
  registerCastPreset('liminal.conversation', [CONVERSATION_HOST, CONVERSATION_GUEST])
  registerCastPreset('liminal.doorWhisper', [DOOR_WHISPERER])
}
