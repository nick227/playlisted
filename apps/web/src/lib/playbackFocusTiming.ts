/** When false, page activity does not reset the pending body fade timer. */
export const playbackFocusUserActivityEnabled = true;

export const playbackFocusTiming = {
  theatre: {
    delayMs: 0,
    fadeInMs: 1200,
    fadeOutMs: 3200,
    exitBufferMs: 1200,
  },

  body: {
    delayMs: 5000,
    restoreDelayMs: 12000,
    fadeOutMs: 2000,
  },

  focusLane: {
    delayMs: 0,
    fadeInMs: 200,
    fadeOutMs: 450,
    exitBufferMs: 180,
  },

  artistVisual: {
    gapAfterTitleIntroMs: 0,
    minVisibleMs: 6000,
    fadeInMs: 900,
    fadeOutMs: 900,
  },

  titleIntro: {
    delayMs: 1000,
    minVisibleMs: 100000,
    fadeInMs: 900,
    fadeOutMs: 650,
  },

  fallbackSubtitle: {
    gapAfterArtistMs: 15000,
    fadeInMs: 900,
    fadeOutMs: 650,
    maxVisibleMs: 5000,
  },

  /** Gaps shorter than this between consecutive subtitles keep the previous cue visible. */
  subtitleFlow: {
    minGapForArtistVisualMs: 2000,
  },

  miniView: {
    delayMs: 600000,
    fadeInMs: 620,
  },

  sidebarNav: {
    blurDelayMs: 0,
    fadeMs: 620,
  },

  topBarBgFade: {
    fadeMs: 620,
  },

  snapRevealMs: 120,

  /** Block ghost clicks on links after tap-to-reveal from theatre mode. */
  revealClickSuppressMs: 450,
} as const;

function ms(value: number) {
  return `${value}ms`;
}

export function applyPlaybackFocusTimingCssVars(root: HTMLElement) {
  root.style.setProperty("--duration-theatre-fade", ms(playbackFocusTiming.theatre.fadeInMs));
  root.style.setProperty("--duration-theatre-fade-in", ms(playbackFocusTiming.theatre.fadeInMs));
  root.style.setProperty("--duration-theatre-fade-out", ms(playbackFocusTiming.theatre.fadeOutMs));

  root.style.setProperty("--delay-focus-lane", ms(playbackFocusTiming.focusLane.delayMs));
  root.style.setProperty("--duration-focus-lane-fade-in", ms(playbackFocusTiming.focusLane.fadeInMs));
  root.style.setProperty("--duration-focus-lane-fade-out", ms(playbackFocusTiming.focusLane.fadeOutMs));
  root.style.setProperty("--duration-focus-lane-exit-buffer", ms(playbackFocusTiming.focusLane.exitBufferMs));

  root.style.setProperty("--delay-title-intro", ms(playbackFocusTiming.titleIntro.delayMs));
  root.style.setProperty("--duration-title-intro-fade-in", ms(playbackFocusTiming.titleIntro.fadeInMs));
  root.style.setProperty("--duration-title-intro-fade-out", ms(playbackFocusTiming.titleIntro.fadeOutMs));

  root.style.setProperty("--delay-artist-visual", ms(0));
  root.style.setProperty("--duration-artist-visual-fade-in", ms(playbackFocusTiming.artistVisual.fadeInMs));
  root.style.setProperty("--duration-artist-visual-fade-out", ms(playbackFocusTiming.artistVisual.fadeOutMs));

  root.style.setProperty(
    "--duration-play-focus-miniview-fade",
    ms(playbackFocusTiming.miniView.fadeInMs),
  );
  root.style.setProperty("--duration-play-focus-body-fade", ms(playbackFocusTiming.body.fadeOutMs));
  root.style.setProperty("--duration-sidebar-nav-fade", ms(playbackFocusTiming.sidebarNav.fadeMs));
  root.style.setProperty("--duration-topbar-bg-fade", ms(playbackFocusTiming.topBarBgFade.fadeMs));
}
