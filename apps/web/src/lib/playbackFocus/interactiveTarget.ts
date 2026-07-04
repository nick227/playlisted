/** Marks playback-focus UI that should not trigger body reveal or dismiss. */
export const PLAYBACK_FOCUS_INTERACTIVE_ATTR = "data-playback-focus-interactive";

export function isPlaybackFocusInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(`[${PLAYBACK_FOCUS_INTERACTIVE_ATTR}]`));
}

export function stopPlaybackFocusBubble(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}
