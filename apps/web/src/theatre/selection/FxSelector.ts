import { getPreset, type ScenePresetDef } from '../registry/scenePresets'
import { isPresetQuarantined } from '../controller/presetQuarantine'
import {
  buildFxShuffleBag,
  DEFAULT_BAG_BUILD_STRATEGY,
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
  if (!id || !getPreset(id)) return null
  return id
}

function resolvePresetForContext(id: string, ctx: PickContext): ScenePresetDef | null {
  const preset = getPreset(id)
  if (!preset) return null
  if (ctx.reducedMotion && preset.reducedMotionPreset) {
    return getPreset(preset.reducedMotionPreset) ?? preset
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
      this.removeBagId(bagId, ctx)
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

  private nextBagId(ctx: PickContext, consume: boolean): string | null {
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
    if (consume) this.removeBagId(id, ctx)
    return id
  }

  private removeBagId(id: string, ctx: PickContext) {
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
  return getPreset(id) !== null && !isPresetQuarantined(id)
}
