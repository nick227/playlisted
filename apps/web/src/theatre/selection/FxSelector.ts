import { getPreset } from '../registry/scenePresets'
import { pickPackagePreset } from '../registry/packageRotation'
import type { FxSelectorPickFn, PickContext } from './types'

function presetIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const id = new URLSearchParams(window.location.search).get('theatrePreset')?.trim()
  if (!id || !getPreset(id)) return null
  return id
}

function resolveReducedMotionPreset(preset: ScenePresetDef, reducedMotion: boolean): ScenePresetDef {
  if (reducedMotion && preset.reducedMotionPreset) {
    return getPreset(preset.reducedMotionPreset) ?? preset
  }
  return preset
}

export function buildExcludePresetIds(ctx: PickContext): string[] {
  const exclude = new Set(ctx.excludePresetIds ?? [])
  if (ctx.activePresetId) exclude.add(ctx.activePresetId)
  return Array.from(exclude)
}

/** Default random pick — package family weight, then preset weight. */
export const defaultFxPick: FxSelectorPickFn = (ctx: PickContext) => {
  const excludeIds = buildExcludePresetIds(ctx)
  const allowUrl = ctx.allowUrlPreset ?? false

  if (allowUrl && excludeIds.length === 0) {
    const fromUrl = presetIdFromUrl()
    if (fromUrl) {
      const preset = getPreset(fromUrl)
      if (preset) return resolveReducedMotionPreset(preset, ctx.reducedMotion)
    }
  }

  return pickPackagePreset({
    reducedMotion: ctx.reducedMotion,
    excludePresetIds: excludeIds,
    preferCategory: ctx.preferCategory ?? 'all',
  })
}

export class FxSelector {
  private candidate: ScenePresetDef | null = null

  constructor(private readonly pickFn: FxSelectorPickFn = defaultFxPick) {}

  clearCandidate(): void {
    this.candidate = null
  }

  peekNext(ctx: PickContext) {
    const cached = this.resolveCached(ctx)
    if (cached) return cached

    const picked = this.pickFn(ctx)
    this.candidate = picked
    return picked
  }

  consumeNext(ctx: PickContext) {
    const cached = this.resolveCached(ctx)
    if (cached) {
      this.candidate = null
      return cached
    }

    return this.pickFn(ctx)
  }

  private resolveCached(ctx: PickContext) {
    if (!this.candidate) return null

    const exclude = new Set(buildExcludePresetIds(ctx))
    if (exclude.has(this.candidate.id)) {
      this.candidate = null
      return null
    }

    return this.candidate
  }
}
