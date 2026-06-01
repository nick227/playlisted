import { registerCastPreset } from '../../../sceneKit'
import type { CastMemberDef } from '../../../sceneKit'
import { buildBandMembers, buildBarPatrons, buildDancers, buildHallwayWatchers } from './crowd'

const BARTENDER: CastMemberDef = {
  id: 'bartender',
  placement: { nx: 0.57, ny: 0.76, scale: 0.52, z: 0.42 },
  activity: 'bartend',
  role: 'ambient',
  faceLayer: 'studio',
  recipe: {
    bodyId: 'body.average-f',
    faceId: 'face.soft',
    hairId: 'hair.bob',
    eyesId: 'eyes.heavy',
    mouthId: 'mouth.small',
    clothesId: 'clothes.classic',
  },
  gender: 'female',
  style: 'classic',
  bodyScale: 0.52,
  // faceScale = fraction of back-wall width for the face radius (0.04 ≈ 17px on a 432px stage)
  faceScale: 0.04,
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
  recipe: {
    bodyId: 'body.average-m',
    faceId: 'face.angular',
    hairId: 'hair.crop',
    eyesId: 'eyes.wide',
    mouthId: 'mouth.wide',
    clothesId: 'clothes.thrift',
  },
  gender: 'male',
  style: 'thrift',
  bodyScale: 0.48,
  // 0.13 → face radius ≈ 56px on a 432px stage — "slightly too large and too close"
  faceScale: 0.13,
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
  recipe: {
    bodyId: 'body.slim-f',
    faceId: 'face.round',
    hairId: 'hair.long',
    eyesId: 'eyes.lazy',
    mouthId: 'mouth.thin',
    clothesId: 'clothes.neon',
  },
  gender: 'female',
  style: 'neon',
  bodyScale: 0.42,
  // Guest has a face but smaller than the host — seen over the host's shoulder
  showFace: true,
  faceScale: 0.07,
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
  recipe: {
    bodyId: 'body.slim-m',
    faceId: 'face.sunken',
    hairId: 'hair.crop',
    eyesId: 'eyes.narrow',
    mouthId: 'mouth.thin',
    clothesId: 'clothes.formal',
  },
  recipeModifiers: { distortBias: 0.08 },
  gender: 'male',
  style: 'formal',
  bodyScale: 0.48,
  // 0.065 → face radius ≈ 28px — eerie mid-size dissolving face
  faceScale: 0.065,
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
  registerCastPreset('liminal.danceFloor', buildDancers(7001, 6))
  registerCastPreset('liminal.hallway', buildHallwayWatchers(6001, 2, 2))
  registerCastPreset('liminal.conversation', [CONVERSATION_HOST, CONVERSATION_GUEST])
  registerCastPreset('liminal.doorWhisper', [DOOR_WHISPERER])
}
