import { getPreset, type ScenePresetDef } from '../registry/scenePresets'
import { isPresetQuarantined } from '../controller/presetQuarantine'
import { hasDynamicPreset, syncDynamicPresets } from '../media/dynamicPresetStore'
import { resolvePreset } from '../media/resolvePreset'
import type { SongVisualPolicy } from '../media/types'
import {
  avoidFirstPosition,
  buildFxShuffleBag,
  DEFAULT_BAG_BUILD_STRATEGY,
  expandWeightedPresetIds,
  shuffleIds,
  type BagBuildStrategy,
} from './buildWeightedShuffleBag'
import {
  collectWeightedFamilyCatalog,
  collectWeightedPresetCatalog,
  computeCatalogVersion,
  type WeightedFamilyCatalogEntry,
  type WeightedPresetEntry,
} from './catalogVersion'
import {
  createLocalFxBagStorage,
  loadFxBagState,
  type FxBagStorage,
  type FxBagStorageState,
} from './fxBagStorage'
import type { PickContext } from './types'

function presetIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const id = new URLSearchParams(window.location.search).get('theatrePreset')?.trim()
  if (!id || !resolvePreset(id)) return null
  return id
}

function resolvePresetForContext(id: string, ctx: PickContext): ScenePresetDef | null {
  const preset = resolvePreset(id)
  if (!preset) return null
  if (ctx.reducedMotion && preset.reducedMotionPreset) {
    return resolvePreset(preset.reducedMotionPreset) ?? preset
  }
  return preset
}

export function buildExcludePresetIds(ctx: PickContext): string[] {
  const exclude = new Set(ctx.excludePresetIds ?? [])
  if (ctx.activePresetId) exclude.add(ctx.activePresetId)
  return Array.from(exclude)
}

function buildAvoidFirstIds(ctx: PickContext, lastPresetId?: string): string[] {
  const avoid = new Set<string>()
  if (ctx.activePresetId) avoid.add(ctx.activePresetId)
  if (lastPresetId) avoid.add(lastPresetId)
  return Array.from(avoid)
}

export type FxSelectorOptions = {
  storage?: FxBagStorage
  isValidPresetId?: (id: string) => boolean
  catalogVersion?: string
  bagStrategy?: BagBuildStrategy
  getCatalogFamilies?: () => WeightedFamilyCatalogEntry[]
  getCatalogEntries?: () => WeightedPresetEntry[]
}

export class FxSelector {
  private candidate: ScenePresetDef | null = null
  private candidateBagId: string | null = null
  private bagState: FxBagStorageState | null = null
  private dynamicBag: string[] = []
  private dynamicBagSignature = ''
  private readonly storage: FxBagStorage
  private readonly isValidPresetId: (id: string) => boolean
  private readonly catalogVersionOverride?: string
  private readonly bagStrategy: BagBuildStrategy
  private readonly getCatalogFamiliesOverride?: () => WeightedFamilyCatalogEntry[]
  private readonly getCatalogEntriesOverride?: () => WeightedPresetEntry[]

  constructor(options: FxSelectorOptions = {}) {
    this.storage = options.storage ?? createLocalFxBagStorage()
    this.isValidPresetId = options.isValidPresetId ?? defaultIsValidPresetId
    this.catalogVersionOverride = options.catalogVersion
    this.bagStrategy = options.bagStrategy ?? DEFAULT_BAG_BUILD_STRATEGY
    this.getCatalogFamiliesOverride = options.getCatalogFamilies
    this.getCatalogEntriesOverride = options.getCatalogEntries
  }

  clearCandidate(): void {
    this.candidate = null
    this.candidateBagId = null
  }

  peekNext(ctx: PickContext): ScenePresetDef | null {
    const urlPick = this.tryUrlPreset(ctx)
    if (urlPick) {
      this.candidate = urlPick
      return urlPick
    }

    const cached = this.resolveCached(ctx)
    if (cached) return cached

    const id = this.nextBagId(ctx, false)
    if (!id) return null

    const preset = resolvePresetForContext(id, ctx)
    this.candidateBagId = id
    this.candidate = preset
    return preset
  }

  consumeNext(ctx: PickContext): ScenePresetDef | null {
    const urlPick = this.tryUrlPreset(ctx)
    if (urlPick) {
      this.candidate = null
      this.candidateBagId = null
      return urlPick
    }

    const cached = this.resolveCached(ctx)
    if (cached) {
      const bagId = this.candidateBagId ?? cached.id
      this.candidate = null
      this.candidateBagId = null
      this.removeConsumedId(bagId, ctx)
      return cached
    }

    const id = this.nextBagId(ctx, true)
    if (!id) return null
    return resolvePresetForContext(id, ctx)
  }

  private tryUrlPreset(ctx: PickContext): ScenePresetDef | null {
    const allowUrl = ctx.allowUrlPreset ?? false
    if (!allowUrl || buildExcludePresetIds(ctx).length > 0) return null

    const fromUrl = presetIdFromUrl()
    if (!fromUrl) return null

    return resolvePresetForContext(fromUrl, ctx)
  }

  private resolveCached(ctx: PickContext) {
    if (!this.candidate) return null

    const exclude = new Set(buildExcludePresetIds(ctx))
    if (exclude.has(this.candidate.id)) {
      this.candidate = null
      this.candidateBagId = null
      return null
    }

    return this.candidate
  }

  private resolveSongVisualPolicy(ctx: PickContext): SongVisualPolicy {
    if (ctx.songVisualPolicy) return ctx.songVisualPolicy
    if ((ctx.dynamicPresets?.length ?? 0) > 0) return 'preferAttached'
    return 'defaultOnly'
  }

  private rebuildDynamicBag(ctx: PickContext): void {
    const presets = ctx.dynamicPresets ?? []
    const signature = presets.map(preset => `${preset.id}:${preset.weight ?? 1}`).join('|')
    if (signature === this.dynamicBagSignature && this.dynamicBag.length > 0) return

    syncDynamicPresets(presets)
    this.dynamicBagSignature = signature
    this.dynamicBag = shuffleIds(expandWeightedPresetIds(
      presets.map(preset => ({ id: preset.id, weight: preset.weight ?? 1 })),
    ))
    this.dynamicBag = avoidFirstPosition(this.dynamicBag, buildAvoidFirstIds(ctx, undefined))
  }

  private peekDynamicBagId(ctx: PickContext): string | null {
    const policy = this.resolveSongVisualPolicy(ctx)
    if (policy === 'defaultOnly') return null

    const presets = ctx.dynamicPresets ?? []
    if (presets.length === 0) return null

    this.rebuildDynamicBag(ctx)
    const exclude = new Set(buildExcludePresetIds(ctx))
    return this.dynamicBag.find(candidateId => !exclude.has(candidateId)) ?? null
  }

  private nextDynamicBagId(ctx: PickContext, consume: boolean): string | null {
    const id = this.peekDynamicBagId(ctx)
    if (!id) {
      if (this.resolveSongVisualPolicy(ctx) === 'attachedOnly') {
        this.dynamicBagSignature = ''
        this.rebuildDynamicBag(ctx)
        const exclude = new Set(buildExcludePresetIds(ctx))
        const retry = this.dynamicBag.find(candidateId => !exclude.has(candidateId)) ?? null
        if (!retry) return null
        if (consume) this.consumeDynamicId(retry)
        return retry
      }
      return null
    }

    if (consume) this.consumeDynamicId(id)
    return id
  }

  private consumeDynamicId(id: string): void {
    const index = this.dynamicBag.indexOf(id)
    if (index >= 0) this.dynamicBag.splice(index, 1)
  }

  private getCatalogFamilies(): WeightedFamilyCatalogEntry[] {
    return this.getCatalogFamiliesOverride?.() ?? collectWeightedFamilyCatalog()
  }

  private getCatalogEntries(): WeightedPresetEntry[] {
    return this.getCatalogEntriesOverride?.() ?? collectWeightedPresetCatalog()
  }

  private getCatalogVersion(): string {
    if (this.catalogVersionOverride) return this.catalogVersionOverride
    return computeCatalogVersion(this.getCatalogFamilies())
  }

  private ensureBagState(ctx: PickContext): FxBagStorageState {
    const version = this.getCatalogVersion()

    if (!this.bagState || this.bagState.version !== version) {
      this.bagState = loadFxBagState(version, this.storage, this.isValidPresetId)
        ?? this.createFreshBagState(version, ctx)
    }

    this.bagState.bag = this.bagState.bag.filter(id => this.isValidPresetId(id))
    if (this.bagState.bag.length === 0) {
      this.bagState = this.createFreshBagState(version, ctx, this.bagState.lastPresetId)
      this.persistBag()
    }

    return this.bagState
  }

  private createFreshBagState(
    version: string,
    ctx: PickContext,
    lastPresetId?: string,
  ): FxBagStorageState {
    const bag = buildFxShuffleBag({
      strategy: this.bagStrategy,
      families: this.getCatalogFamilies(),
      entries: this.getCatalogEntries(),
      avoidFirstIds: buildAvoidFirstIds(ctx, lastPresetId),
    })
    return {
      version,
      bag,
      lastPresetId,
      updatedAt: Date.now(),
    }
  }

  private peekBuiltinBagId(ctx: PickContext): string | null {
    const state = this.ensureBagState(ctx)
    const exclude = new Set(buildExcludePresetIds(ctx))
    return state.bag.find(candidateId => !exclude.has(candidateId) && this.isValidPresetId(candidateId)) ?? null
  }

  private nextBuiltinBagId(ctx: PickContext, consume: boolean): string | null {
    const state = this.ensureBagState(ctx)
    const exclude = new Set(buildExcludePresetIds(ctx))
    let id = state.bag.find(candidateId => !exclude.has(candidateId) && this.isValidPresetId(candidateId)) ?? null

    if (!id) {
      this.bagState = this.createFreshBagState(state.version, ctx, state.lastPresetId)
      this.persistBag()
      id = this.bagState.bag.find(candidateId => !exclude.has(candidateId) && this.isValidPresetId(candidateId)) ?? null
      if (!id) id = this.bagState.bag[0] ?? null
    }

    if (!id) return null
    if (consume) this.removeBuiltinBagId(id, ctx)
    return id
  }

  private nextBagId(ctx: PickContext, consume: boolean): string | null {
    const policy = this.resolveSongVisualPolicy(ctx)

    if (policy === 'defaultOnly') {
      return this.nextBuiltinBagId(ctx, consume)
    }

    if (policy === 'mixAttachedAndDefault') {
      const dynamicId = this.peekDynamicBagId(ctx)
      const builtinId = this.peekBuiltinBagId(ctx)
      if (dynamicId && builtinId) {
        const pickDynamic = Math.random() < 0.5
        return pickDynamic
          ? this.nextDynamicBagId(ctx, consume)
          : this.nextBuiltinBagId(ctx, consume)
      }
      if (dynamicId) return this.nextDynamicBagId(ctx, consume)
      return this.nextBuiltinBagId(ctx, consume)
    }

    if (policy === 'attachedOnly') {
      return this.nextDynamicBagId(ctx, consume)
    }

    const dynamicId = this.nextDynamicBagId(ctx, consume)
    if (dynamicId) return dynamicId
    return this.nextBuiltinBagId(ctx, consume)
  }

  private removeConsumedId(id: string, ctx: PickContext): void {
    if (hasDynamicPreset(id)) {
      this.consumeDynamicId(id)
      return
    }
    this.removeBuiltinBagId(id, ctx)
  }

  private removeBuiltinBagId(id: string, ctx: PickContext) {
    const state = this.ensureBagState(ctx)
    const index = state.bag.indexOf(id)
    if (index >= 0) state.bag.splice(index, 1)

    state.lastPresetId = id
    state.updatedAt = Date.now()

    if (state.bag.length === 0) {
      this.bagState = this.createFreshBagState(state.version, ctx, id)
    }

    this.persistBag()
  }

  private persistBag() {
    if (!this.bagState) return
    this.storage.write(this.bagState)
  }
}

function defaultIsValidPresetId(id: string): boolean {
  return (getPreset(id) !== null || hasDynamicPreset(id)) && !isPresetQuarantined(id)
}
