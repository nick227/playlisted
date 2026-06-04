import type { CharacterRecipe, CharacterRecipeModifiers } from '../../../sceneKit'
import type { BodyGender, BodyStyle, CastActivity } from '../body/bodies'
import type { FashionSet } from '../body/fashion'
import type { BodyPresetDef } from './libraries/body'
import type { ClothesPresetDef } from './libraries/clothes'
import type { EyesPresetDef } from './libraries/eyes'
import type { FacePresetDef } from './libraries/face'
import type { GraphicHeadDef } from './libraries/graphicHeads'
import type { HairPresetDef } from './libraries/hair'
import type { MouthPresetDef } from './libraries/mouth'

export type { CharacterRecipe }
export type CharacterModifiers = CharacterRecipeModifiers

export type ResolvedCharacter = {
  recipe: CharacterRecipe
  modifiers: CharacterModifiers
  seed: number
  body: BodyPresetDef
  face: FacePresetDef
  graphicHead?: GraphicHeadDef
  graphicHeadImageSrc?: string
  hair: HairPresetDef
  eyes: EyesPresetDef
  mouth: MouthPresetDef
  clothes: ClothesPresetDef
  /** For activity / wander — not part of recipe libraries. */
  activity: CastActivity
  gender: BodyGender
  style: BodyStyle
  fashion: FashionSet
}
