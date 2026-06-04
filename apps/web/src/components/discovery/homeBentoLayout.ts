export type BentoMediaKind = "song" | "playlist" | "artist";

export type BentoSlot = {
  kind: BentoMediaKind;
  index: number;
  placement: string;
  aspectClass: string;
  shape?: "square" | "circle";
  /** Compact label under art, or title overlay on large/wide tiles */
  meta?: "below" | "overlay";
};

export type HomeExploreBentoLimits = {
  songs: number;
  playlists: number;
  artists: number;
};

export const HOME_BENTO_DEFAULT_LIMITS: HomeExploreBentoLimits = {
  songs: 5,
  playlists: 4,
  artists: 4,
};

/** Mixed-size bento slots (4-column desktop grid). */
export const HOME_BENTO_SLOTS: BentoSlot[] = [
  { kind: "song", index: 0, placement: "md:col-span-2 md:row-span-2", aspectClass: "aspect-square", meta: "overlay" },
  { kind: "playlist", index: 0, placement: "md:col-span-2 md:col-start-3 md:row-start-1", aspectClass: "aspect-[2/1]" },
  { kind: "playlist", index: 1, placement: "md:col-span-2 md:col-start-3 md:row-start-2", aspectClass: "aspect-[2/1]" },
  { kind: "song", index: 1, placement: "md:col-start-1 md:row-start-3", aspectClass: "aspect-square" },
  { kind: "song", index: 2, placement: "md:col-start-2 md:row-start-3", aspectClass: "aspect-square" },
  { kind: "artist", index: 0, placement: "md:col-span-2 md:row-span-2 md:col-start-3 md:row-start-3", aspectClass: "aspect-[4/5]", meta: "overlay" },
  { kind: "playlist", index: 2, placement: "md:col-start-1 md:row-start-4", aspectClass: "aspect-[4/3]" },
  { kind: "playlist", index: 3, placement: "md:col-start-2 md:row-start-4", aspectClass: "aspect-square" },
  { kind: "song", index: 3, placement: "md:col-span-2 md:row-start-5", aspectClass: "aspect-[2/1]", meta: "overlay" },
  { kind: "song", index: 4, placement: "md:col-span-2 md:row-start-6", aspectClass: "aspect-[4/3]" },
  { kind: "artist", index: 1, placement: "md:col-start-3 md:row-start-5", aspectClass: "aspect-square", shape: "circle" },
  { kind: "artist", index: 2, placement: "md:col-start-4 md:row-start-5", aspectClass: "aspect-square", shape: "circle" },
  {
    kind: "artist",
    index: 3,
    placement: "md:col-span-2 md:col-start-3 md:row-start-6",
    aspectClass: "aspect-[2/1]",
    meta: "overlay",
  },
];

export function resolveHomeBentoLimits(
  limits?: Partial<HomeExploreBentoLimits>,
): HomeExploreBentoLimits {
  const resolved = { ...HOME_BENTO_DEFAULT_LIMITS };
  if (limits?.songs != null) resolved.songs = Math.max(0, limits.songs);
  if (limits?.playlists != null) resolved.playlists = Math.max(0, limits.playlists);
  if (limits?.artists != null) resolved.artists = Math.max(0, limits.artists);
  return resolved;
}

const BENTO_LIMIT_KEY: Record<BentoMediaKind, keyof HomeExploreBentoLimits> = {
  song: "songs",
  playlist: "playlists",
  artist: "artists",
};

export function selectBentoSlots(
  slots: BentoSlot[],
  limits: HomeExploreBentoLimits,
): BentoSlot[] {
  return slots.filter((slot) => slot.index < limits[BENTO_LIMIT_KEY[slot.kind]]);
}
