/** Which UI surface started playback — controls whether origin shifts on queue next/prev. */
export type PlaybackOriginScope = "track" | "playlist" | "artist";

export function surfaceIsActive(
  matches: boolean,
  activeOriginKey: string | null,
  originKey?: string,
): boolean {
  if (!matches) return false;
  if (originKey !== undefined) return activeOriginKey === originKey;
  return activeOriginKey == null;
}
