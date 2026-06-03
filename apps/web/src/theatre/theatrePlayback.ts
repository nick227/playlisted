/** Shared playback gates for TheatreController and lazyController. */
export function canEnterFromMediaElement(el: HTMLMediaElement | null): boolean {
  if (!el) return false
  return (
    !el.paused &&
    Boolean(el.currentSrc) &&
    el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
  )
}
