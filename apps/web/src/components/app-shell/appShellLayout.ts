type MainContentLayoutOptions = {
  bodyFocusMode: boolean;
  snapReveal: boolean;
  isChatPage: boolean;
  shellHasPlayer: boolean;
};

export function isRadioShellActive(
  radioPlaying: boolean,
  hasRadioNowPlaying: boolean,
  pathname: string,
  radioUiMounted: boolean,
): boolean {
  return radioPlaying && hasRadioNowPlaying && pathname !== "/radio" && !radioUiMounted;
}

export function buildMainContentClassName({
  bodyFocusMode,
  snapReveal,
  isChatPage,
  shellHasPlayer,
}: MainContentLayoutOptions): string {
  const visibility = [
    "player-shell-transition play-focus-content justify-start sm:justify-center flex-1 min-h-0 min-w-0 overflow-x-clip px-4 md:px-8 flex flex-col",
    bodyFocusMode ? "is-play-focus-hidden" : "",
    snapReveal ? "is-play-focus-revealing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (isChatPage) {
    return `${visibility} flex min-h-0 flex-col overflow-hidden pb-0`;
  }

  const padding = shellHasPlayer
    ? "pb-[calc(var(--spacing-player-safe-mobile)+1.5rem)] md:pb-[calc(var(--spacing-player)+1.5rem)]"
    : "pb-6";

  return `${visibility} overflow-y-auto ${padding}`;
}

export function buildRevealShieldClassName(withPlayer: boolean): string {
  return `play-focus-theatre-hit-area${withPlayer ? "" : " play-focus-theatre-hit-area--no-player"}`;
}
