export const FX_BAG_STORAGE_KEY = 'theatre.fxBag.v1'

export type FxBagStorageState = {
  version: string
  bag: string[]
  lastPresetId?: string
  /** Most recent consumed preset ids, oldest first — kept away from the front of fresh bags. */
  recentPresetIds?: string[]
  updatedAt: number
}

export type FxBagStorage = {
  read(): FxBagStorageState | null
  write(state: FxBagStorageState): void
  remove(): void
}

export function createLocalFxBagStorage(
  storage: Storage | null | undefined = typeof window === 'undefined' ? null : window.localStorage,
): FxBagStorage {
  return {
    read() {
      if (!storage) return null
      const raw = storage.getItem(FX_BAG_STORAGE_KEY)
      if (!raw) return null
      try {
        const parsed = JSON.parse(raw) as FxBagStorageState
        if (!parsed || typeof parsed.version !== 'string' || !Array.isArray(parsed.bag)) return null
        return parsed
      } catch {
        return null
      }
    },
    write(state) {
      if (!storage) return
      try {
        storage.setItem(FX_BAG_STORAGE_KEY, JSON.stringify(state))
      } catch {
        // localStorage may be unavailable or full.
      }
    },
    remove() {
      if (!storage) return
      storage.removeItem(FX_BAG_STORAGE_KEY)
    },
  }
}

export function sanitizeFxBagState(
  state: FxBagStorageState,
  catalogVersion: string,
  isValidPresetId: (id: string) => boolean,
): FxBagStorageState | null {
  if (state.version !== catalogVersion) return null
  return {
    ...state,
    bag: state.bag.filter(isValidPresetId),
  }
}

export function loadFxBagState(
  catalogVersion: string,
  storage: FxBagStorage = createLocalFxBagStorage(),
  isValidPresetId: (id: string) => boolean,
): FxBagStorageState | null {
  const raw = storage.read()
  if (!raw) return null
  return sanitizeFxBagState(raw, catalogVersion, isValidPresetId)
}
