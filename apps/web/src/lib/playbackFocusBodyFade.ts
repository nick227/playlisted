export type PlaybackFocusBodyFadeConfig = {
  disabled: boolean;
  delayMs?: number;
};

export type PlaybackFocusBodyFadeContext = {
  /** The homepage radio section is on screen (it registers radio UI while visible). */
  radioStageVisible: boolean;
  /** Radio audio is actually playing (a loaded-but-paused station never fades the page). */
  radioPlaying: boolean;
};

/**
 * Page policy only: artwork and subtitle preferences never control UI visibility.
 * Home is a scrolling feed, so the inactivity fade + focus lanes run only while
 * radio is playing with its section on stage; paused radio, site-track playback,
 * or scrolling down to charts/library keeps the body visible.
 */
export function getPlaybackFocusBodyFadeConfig(
  pathname: string,
  { radioStageVisible, radioPlaying }: PlaybackFocusBodyFadeContext,
): PlaybackFocusBodyFadeConfig {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === "/" && radioStageVisible && radioPlaying
    ? { disabled: false, delayMs: 5000 }
    : { disabled: true };
}
