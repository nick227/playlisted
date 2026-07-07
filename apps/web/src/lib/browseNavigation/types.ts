export type SwipeDirection = "next" | "prev";

export type PlaylistBrowseNeighbor = {
  kind: "playlist";
  label: string;
  href: string;
  playlistId: string;
  username: string;
  slug: string;
};

export type ArtistBrowseNeighbor = {
  kind: "artist";
  label: string;
  href: string;
  userId: string;
  username: string;
};

export type BrowseNeighbor = PlaylistBrowseNeighbor | ArtistBrowseNeighbor;

export type BrowseNeighborsResult = {
  items: BrowseNeighbor[];
  currentIndex: number;
};

export const BROWSE_SWIPE_NAVIGATION_STATE = "swipe" as const;

export type BrowseNavigationState = {
  intent: typeof BROWSE_SWIPE_NAVIGATION_STATE;
};

export function isBrowseSwipeNavigation(
  state: unknown,
): state is BrowseNavigationState {
  return (
    typeof state === "object" &&
    state !== null &&
    "intent" in state &&
    (state as BrowseNavigationState).intent === BROWSE_SWIPE_NAVIGATION_STATE
  );
}
