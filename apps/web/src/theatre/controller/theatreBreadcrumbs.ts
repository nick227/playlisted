const BREADCRUMB_KEY = 'playlisted:theatre:breadcrumb'
const MAX_ENTRIES = 20

export type TheatreBreadcrumb = {
  ts: number
  action: string
  presetId?: string
  detail?: string
}

/** Synchronous write — call immediately before await-heavy theatre work. */
export function theatreBreadcrumb(
  action: string,
  meta?: { presetId?: string; detail?: string },
): void {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(BREADCRUMB_KEY)
    const prev: TheatreBreadcrumb[] = raw ? (JSON.parse(raw) as TheatreBreadcrumb[]) : []
    const entry: TheatreBreadcrumb = { ts: Date.now(), action, ...meta }
    window.localStorage.setItem(
      BREADCRUMB_KEY,
      JSON.stringify([...prev.slice(-(MAX_ENTRIES - 1)), entry]),
    )
  } catch {
    // localStorage may be unavailable in private mode
  }
}

export function readTheatreBreadcrumbs(): TheatreBreadcrumb[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(BREADCRUMB_KEY)
    return raw ? (JSON.parse(raw) as TheatreBreadcrumb[]) : []
  } catch {
    return []
  }
}
