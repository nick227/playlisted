import { registerCastPreset } from '../../sceneKit'
import type { CastMemberDef } from '../../sceneKit'
import { buildBandMembers, buildBarPatrons, buildDancers, buildHallwayWatchers } from './castCrowd'

const BARTENDER: CastMemberDef = {
  id: 'bartender',
  placement: { nx: 0.57, ny: 0.76, scale: 0.46, z: 0.42 },
  role: 'ambient',
  faceLayer: 'studio',
  activity: 'bartend',
  gender: 'female',
  style: 'classic',
  bodyScale: 0.46,
  faceScale: 0.32,
  showFace: true,
  speaks: true,
  phraseBank: 'bar',
  phraseSalt: 11,
  phraseFormat: 'bubble',
  speakDelayMs: 2200,
  eyeTrackX: 0.12,
  eyeTrackY: -0.08,
  faceMode: 'watching',
}

const CONVERSATION_HOST: CastMemberDef = {
  id: 'host',
  placement: { nx: 0.36, ny: 0.58, scale: 0.52, z: 0.52 },
  role: 'speaker',
  faceLayer: 'studio',
  activity: 'hangOut',
  gender: 'male',
  style: 'thrift',
  bodyScale: 0.48,
  faceScale: 1.05,
  showFace: true,
  speaks: true,
  phraseBank: 'venue',
  phraseSalt: 77,
  phraseFormat: 'subtitleShard',
  speakDelayMs: 900,
  faceMode: 'talking',
}

const CONVERSATION_GUEST: CastMemberDef = {
  id: 'guest',
  placement: { nx: 0.7, ny: 0.62, scale: 0.44, z: 0.5 },
  role: 'listener',
  faceLayer: 'studio',
  activity: 'drink',
  gender: 'female',
  style: 'neon',
  bodyScale: 0.42,
  showFace: false,
  eyeTrackX: -0.08,
  eyeTrackY: 0.06,
  faceMode: 'watching',
}

const DOOR_WHISPERER: CastMemberDef = {
  id: 'threshold-voice',
  placement: { nx: 0.5, ny: 0.6, scale: 0.5, z: 0.58 },
  role: 'speaker',
  faceLayer: 'studio',
  activity: 'look',
  gender: 'male',
  style: 'formal',
  bodyScale: 0.48,
  faceScale: 0.55,
  showFace: true,
  speaks: true,
  phraseBank: 'threshold',
  phraseSalt: 203,
  phraseFormat: 'wallText',
  speakDelayMs: 180,
  faceMode: 'dissolving',
}

export function registerLiminalCastPresets() {
  registerCastPreset('liminal.bartender', [BARTENDER])
  registerCastPreset('liminal.bar', buildBarPatrons(9001))
  registerCastPreset('liminal.band', buildBandMembers(8001))
  registerCastPreset('liminal.danceFloor', buildDancers(7001, 10))
  registerCastPreset('liminal.hallway', buildHallwayWatchers(6001, 5, 4))
  registerCastPreset('liminal.conversation', [CONVERSATION_HOST, CONVERSATION_GUEST])
  registerCastPreset('liminal.doorWhisper', [DOOR_WHISPERER])
}
