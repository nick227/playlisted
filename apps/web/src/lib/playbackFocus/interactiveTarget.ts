/** Marks playback-focus UI that should not trigger body reveal or dismiss. */
export const PLAYBACK_FOCUS_INTERACTIVE_ATTR = "data-playback-focus-interactive";

export const DISPLAY_SETTINGS_INTERACTION_MS = 1000;

let displaySettingsBodyRevealSuppressUntil = 0;

export function isPlaybackFocusInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(`[${PLAYBACK_FOCUS_INTERACTIVE_ATTR}]`));
}

export function armDisplaySettingsBodyRevealSuppression(
  ms: number = DISPLAY_SETTINGS_INTERACTION_MS,
) {
  displaySettingsBodyRevealSuppressUntil = performance.now() + ms;
}

export function isDisplaySettingsBodyRevealSuppressed(): boolean {
  return performance.now() < displaySettingsBodyRevealSuppressUntil;
}

export function displaySettingsBodyRevealSuppressRemainingMs(): number {
  return Math.max(0, displaySettingsBodyRevealSuppressUntil - performance.now());
}

export function stopPlaybackFocusBubble(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}
