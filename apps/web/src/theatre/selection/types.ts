import type { SceneCategory, ScenePresetDef } from '../registry/scenePresets'

export type PickContext = {
  reducedMotion: boolean
  activePresetId?: string | null
  excludePresetIds?: string[]
  preferCategory?: SceneCategory | 'all'
  /** When true, honour ?theatrePreset= URL override (enter only). Defaults to false. */
  allowUrlPreset?: boolean
}

export type FxSelectorPickFn = (ctx: PickContext) => ScenePresetDef | null
