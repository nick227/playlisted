import { registerCastPreset } from '../../sceneKit'
import type { CastMemberDef } from '../../sceneKit'

const BARTENDER: CastMemberDef = {
  id: 'bartender',
  placement: { nx: 0.58, ny: 0.78, scale: 1.08, z: 0.42 },
  speaks: true,
  phraseBank: 'bar',
  phraseSalt: 11,
  eyeTrackX: 0.15,
  eyeTrackY: -0.1,
  faceMode: 'watching',
}

const CONVERSATION_PRIMARY: CastMemberDef = {
  id: 'host',
  placement: { nx: 0.38, ny: 0.48, scale: 2.35, z: 0.52 },
  speaks: true,
  phraseBank: 'venue',
  phraseSalt: 77,
  eyeTrackX: 0.12,
  eyeTrackY: -0.05,
  faceMode: 'talking',
}

const CONVERSATION_GUEST: CastMemberDef = {
  id: 'guest',
  placement: { nx: 0.68, ny: 0.54, scale: 1.65, z: 0.5 },
  speaks: false,
  eyeTrackX: -0.1,
  eyeTrackY: 0.08,
  alpha: 0.85,
  faceMode: 'watching',
}

const DOOR_WHISPERER: CastMemberDef = {
  id: 'threshold-voice',
  placement: { nx: 0.5, ny: 0.62, scale: 1.2, z: 0.58 },
  speaks: true,
  phraseBank: 'venue',
  phraseSalt: 203,
  faceMode: 'dissolving',
}

export function registerLiminalCastPresets() {
  registerCastPreset('liminal.bartender', [BARTENDER])
  registerCastPreset('liminal.conversation', [CONVERSATION_PRIMARY, CONVERSATION_GUEST])
  registerCastPreset('liminal.doorWhisper', [DOOR_WHISPERER])
}
