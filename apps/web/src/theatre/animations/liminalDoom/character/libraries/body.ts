import type { BodyGender } from '../../body/bodies'

export type BodyBuild = 'slim' | 'average' | 'broad'

export type BodyPresetDef = {
  id: string
  label: string
  gender: BodyGender
  build: BodyBuild
  shoulderMul: number
  hipMul: number
  torsoMul: number
  legMul: number
  headMul: number
}

export const BODY_PRESETS: Record<string, BodyPresetDef> = {
  'body.slim-m': {
    id: 'body.slim-m', label: 'Slim M', gender: 'male', build: 'slim',
    shoulderMul: 0.9, hipMul: 0.88, torsoMul: 0.95, legMul: 1.05, headMul: 0.95,
  },
  'body.average-m': {
    id: 'body.average-m', label: 'Average M', gender: 'male', build: 'average',
    shoulderMul: 1, hipMul: 1, torsoMul: 1, legMul: 1, headMul: 1,
  },
  'body.broad-m': {
    id: 'body.broad-m', label: 'Broad M', gender: 'male', build: 'broad',
    shoulderMul: 1.14, hipMul: 1.05, torsoMul: 1.05, legMul: 0.96, headMul: 1.02,
  },
  'body.slim-f': {
    id: 'body.slim-f', label: 'Slim F', gender: 'female', build: 'slim',
    shoulderMul: 0.88, hipMul: 0.92, torsoMul: 0.94, legMul: 1.06, headMul: 0.96,
  },
  'body.average-f': {
    id: 'body.average-f', label: 'Average F', gender: 'female', build: 'average',
    shoulderMul: 1, hipMul: 1, torsoMul: 1, legMul: 1, headMul: 1,
  },
  'body.broad-f': {
    id: 'body.broad-f', label: 'Broad F', gender: 'female', build: 'broad',
    shoulderMul: 1.06, hipMul: 1.1, torsoMul: 1.02, legMul: 0.98, headMul: 1,
  },
  'body.lanky-m': {
    id: 'body.lanky-m', label: 'Lanky M', gender: 'male', build: 'slim',
    shoulderMul: 0.86, hipMul: 0.9, torsoMul: 1.08, legMul: 1.12, headMul: 0.92,
  },
  'body.curvy-f': {
    id: 'body.curvy-f', label: 'Curvy F', gender: 'female', build: 'broad',
    shoulderMul: 0.98, hipMul: 1.14, torsoMul: 0.96, legMul: 0.94, headMul: 1.02,
  },
}

export const BODY_PRESET_IDS = Object.keys(BODY_PRESETS)
