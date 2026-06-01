import type { FaceGender } from './faceUtil'

export type { FaceGender }

export type FaceState = 'idle' | 'watching' | 'talking' | 'dissolving'

export type FaceConfig = {
  state: FaceState
  gender?: FaceGender
  talkLevel: number
  trackX: number
  trackY: number
  distort: number
  dissolveAlpha: number
  fragmentLevel: number
  seed: number
}

export const DEFAULT_FACE_CONFIG: FaceConfig = {
  state: 'idle',
  talkLevel: 0,
  trackX: 0,
  trackY: 0,
  distort: 0,
  dissolveAlpha: 1,
  fragmentLevel: 0,
  seed: 0,
}
