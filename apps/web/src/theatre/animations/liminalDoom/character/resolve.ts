import type { CastMemberDef } from '../../../sceneKit'
import { resolveFashion } from '../fashion'
import { hash01 } from '../types'
import { BODY_PRESETS, BODY_PRESET_IDS } from './libraries/body'
import { CLOTHES_PRESETS, CLOTHES_PRESET_IDS } from './libraries/clothes'
import { EYES_PRESETS, EYES_PRESET_IDS } from './libraries/eyes'
import { FACE_PRESETS, FACE_PRESET_IDS } from './libraries/face'
import { HAIR_PRESETS } from './libraries/hair'
import { MOUTH_PRESETS, MOUTH_PRESET_IDS } from './libraries/mouth'
import type { CharacterModifiers, CharacterRecipe, ResolvedCharacter } from './types'

function pickId(ids: string[], seed: number, salt: number): string {
  return ids[Math.floor(hash01(seed, salt) * ids.length)]
}

function presetOrThrow<T extends { id: string }>(map: Record<string, T>, id: string, kind: string): T {
  const p = map[id]
  if (!p) throw new Error(`Unknown ${kind} preset: ${id}`)
  return p
}

/** Fill missing recipe slots from seed; validate ids. */
export function resolveRecipe(
  seed: number,
  partial: Partial<CharacterRecipe> = {},
  modifiers: CharacterModifiers = {},
): ResolvedCharacter {
  const bodyId = partial.bodyId ?? pickId(BODY_PRESET_IDS, seed, 1)
  const body = presetOrThrow(BODY_PRESETS, bodyId, 'body')

  const clothesId = partial.clothesId ?? pickId(CLOTHES_PRESET_IDS, seed, 2)
  const clothes = presetOrThrow(CLOTHES_PRESETS, clothesId, 'clothes')

  const hairId = partial.hairId ?? pickHairForBody(body, seed)
  const hair = presetOrThrow(HAIR_PRESETS, hairId, 'hair')

  const recipe: CharacterRecipe = {
    bodyId,
    faceId: partial.faceId ?? pickId(FACE_PRESET_IDS, seed, 4),
    hairId,
    eyesId: partial.eyesId ?? pickId(EYES_PRESET_IDS, seed, 5),
    mouthId: partial.mouthId ?? pickId(MOUTH_PRESET_IDS, seed, 6),
    clothesId,
  }

  const fashion = resolveFashion(clothes.style, body.gender, seed)
  fashion.hairStyle = hair.hairStyle
  if (clothes.hasJacket !== undefined) fashion.hasJacket = clothes.hasJacket
  if (clothes.hasCollar !== undefined) fashion.hasCollar = clothes.hasCollar
  if (clothes.hasBelt !== undefined) fashion.hasBelt = clothes.hasBelt

  return {
    recipe,
    modifiers,
    seed,
    body,
    face: presetOrThrow(FACE_PRESETS, recipe.faceId, 'face'),
    hair,
    eyes: presetOrThrow(EYES_PRESETS, recipe.eyesId, 'eyes'),
    mouth: presetOrThrow(MOUTH_PRESETS, recipe.mouthId, 'mouth'),
    clothes,
    activity: 'hangOut',
    gender: body.gender,
    style: clothes.style,
    fashion,
  }
}

function pickHairForBody(body: { gender: string }, seed: number): string {
  if (body.gender === 'female') {
    const f = ['hair.bob', 'hair.long', 'hair.bun', 'hair.crop']
    return f[Math.floor(hash01(seed, 3) * f.length)]
  }
  const m = ['hair.crop', 'hair.buzz', 'hair.spiky', 'hair.mohawk']
  return m[Math.floor(hash01(seed, 3) * m.length)]
}

function pickBodyForGender(gender: 'male' | 'female', seed: number): string {
  const pool = BODY_PRESET_IDS.filter((id) => BODY_PRESETS[id].gender === gender)
  return pool[Math.floor(hash01(seed, 1) * pool.length)]
}

function clothesIdForStyle(style: string): string | undefined {
  const id = `clothes.${style}`
  return CLOTHES_PRESETS[id] ? id : undefined
}

/** Map cast def + room seed to a full resolved character. */
export function resolveCharacterFromDef(
  def: CastMemberDef,
  roomSeed: number,
  index: number,
): ResolvedCharacter {
  const seed = roomSeed + index * 31
  const mods = def.recipeModifiers ?? {}
  const partial: Partial<CharacterRecipe> = { ...def.recipe }
  if (!partial.bodyId && def.gender) partial.bodyId = pickBodyForGender(def.gender, seed)
  if (!partial.clothesId && def.style) {
    const cid = clothesIdForStyle(def.style)
    if (cid) partial.clothesId = cid
  }
  const c = resolveRecipe(seed, partial, mods)
  c.activity = def.activity ?? 'hangOut'
  return c
}

export function recipeDistortBase(c: ResolvedCharacter): number {
  return c.face.distort + (c.modifiers.distortBias ?? 0)
}
