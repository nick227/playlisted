export const playbackFocusTiming = {
  theatre: {
    delayMs: 2900,
    fadeInMs: 1200,
    fadeOutMs: 1450,
    exitBufferMs: 380,
  },
  subtitle: {
    delayMs: 3000,
    fadeInMs: 1200,
    fadeOutMs: 450,
    exitBufferMs: 180,
  },
  miniView: {
    delayMs: 3000,
    fadeInMs: 620,
  },
  body: {
    delayMs: 3000,
    fadeOutMs: 2000,
  },
  sidebarNav: {
    blurDelayMs: 3500,
    fadeMs: 620,
  },
  snapRevealMs: 120,
} as const;

function ms(value: number) {
  return `${value}ms`;
}

export function applyPlaybackFocusTimingCssVars(root: HTMLElement) {
  root.style.setProperty("--duration-theatre-fade", ms(playbackFocusTiming.theatre.fadeInMs));
  root.style.setProperty("--duration-theatre-fade-in", ms(playbackFocusTiming.theatre.fadeInMs));
  root.style.setProperty("--duration-theatre-fade-out", ms(playbackFocusTiming.theatre.fadeOutMs));
  root.style.setProperty("--delay-subtitle", ms(playbackFocusTiming.subtitle.delayMs));
  root.style.setProperty("--duration-subtitle-fade-in", ms(playbackFocusTiming.subtitle.fadeInMs));
  root.style.setProperty("--duration-subtitle-fade-out", ms(playbackFocusTiming.subtitle.fadeOutMs));
  root.style.setProperty("--duration-subtitle-exit-buffer", ms(playbackFocusTiming.subtitle.exitBufferMs));
  root.style.setProperty("--duration-play-focus-miniview-fade", ms(playbackFocusTiming.miniView.fadeInMs));
  root.style.setProperty("--duration-play-focus-body-fade", ms(playbackFocusTiming.body.fadeOutMs));
  root.style.setProperty("--duration-sidebar-nav-fade", ms(playbackFocusTiming.sidebarNav.fadeMs));
}
