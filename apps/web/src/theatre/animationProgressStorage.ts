const STORAGE_PREFIX = 'playlisted:theatre:animation-progress:'

export function loadAnimationProgress<T>(id: string): T | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + id)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function saveAnimationProgress(id: string, value: unknown) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(value))
  } catch {
    // Ignore storage quota/private-mode failures; animation progress is optional.
  }
}
