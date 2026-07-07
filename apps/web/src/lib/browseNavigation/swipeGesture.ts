const SWIPE_EXCLUDED_SELECTOR = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "[role='button']",
  "[role='link']",
  "[data-bottom-player]",
  "[data-playback-focus-interactive]",
  ".topbar-chrome",
  ".sidebar-nav-content",
].join(",");

export const SWIPE_AXIS_THRESHOLD_PX = 12;
export const SWIPE_COMMIT_THRESHOLD_PX = 80;
export const SWIPE_VELOCITY_THRESHOLD = 0.35;
export const SWIPE_PREFETCH_RATIO = 0.4;
export const SWIPE_BOUNCE_MAX_PX = 56;
export const SWIPE_CLICK_SUPPRESS_MS = 450;

export function isSwipeExcludedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(SWIPE_EXCLUDED_SELECTOR));
}

export function rubberBandOffset(delta: number, max: number): number {
  const sign = Math.sign(delta);
  const abs = Math.abs(delta);
  return sign * max * (1 - Math.exp(-abs / max));
}
