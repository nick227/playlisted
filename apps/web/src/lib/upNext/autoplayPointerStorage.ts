const AUTOPLAY_POINTER_KEY = "playlisted-autoplay-pointer";
const POINTER_VERSION = 1;
const MAX_RECENT_PLAYLISTS = 80;
const MAX_REJECTED_PLAYLISTS = 80;
const MAX_COMPLETED_PLAYLISTS = 120;
const REJECTED_RETRY_MS = 7 * 24 * 60 * 60 * 1000;

export type AutoplayPointer = {
  version: 1;
  recentPlaylistIds: string[];
  rejectedPlaylistIds: string[];
  rejectedAtByPlaylistId: Record<string, number>;
  completedPlaylistIds: string[];
  lastSeedPlaylistId?: string;
  lastResolvedPlaylistId?: string;
  updatedAt: number;
};

export type AutoplayAvoidance = {
  avoidedPlaylistIds: Set<string>;
  rejectedPlaylistIds: Set<string>;
  recentPlaylistIds: Set<string>;
  completedPlaylistIds: Set<string>;
};

function emptyPointer(): AutoplayPointer {
  return {
    version: POINTER_VERSION,
    recentPlaylistIds: [],
    rejectedPlaylistIds: [],
    rejectedAtByPlaylistId: {},
    completedPlaylistIds: [],
    updatedAt: 0,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanIdList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0 || seen.has(item)) continue;
    seen.add(item);
    ids.push(item);
    if (ids.length >= limit) break;
  }
  return ids;
}

function cleanRejectedAt(value: unknown, rejectedIds: string[]): Record<string, number> {
  if (!isRecord(value)) return {};
  const allowed = new Set(rejectedIds);
  const next: Record<string, number> = {};
  for (const id of rejectedIds) {
    const timestamp = value[id];
    if (allowed.has(id) && typeof timestamp === "number" && Number.isFinite(timestamp)) {
      next[id] = timestamp;
    }
  }
  return next;
}

function normalizePointer(value: unknown): AutoplayPointer {
  if (!isRecord(value)) return emptyPointer();
  const rejectedPlaylistIds = cleanIdList(value.rejectedPlaylistIds, MAX_REJECTED_PLAYLISTS);
  return {
    version: POINTER_VERSION,
    recentPlaylistIds: cleanIdList(value.recentPlaylistIds, MAX_RECENT_PLAYLISTS),
    rejectedPlaylistIds,
    rejectedAtByPlaylistId: cleanRejectedAt(value.rejectedAtByPlaylistId, rejectedPlaylistIds),
    completedPlaylistIds: cleanIdList(value.completedPlaylistIds, MAX_COMPLETED_PLAYLISTS),
    lastSeedPlaylistId:
      typeof value.lastSeedPlaylistId === "string" ? value.lastSeedPlaylistId : undefined,
    lastResolvedPlaylistId:
      typeof value.lastResolvedPlaylistId === "string" ? value.lastResolvedPlaylistId : undefined,
    updatedAt:
      typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt) ? value.updatedAt : 0,
  };
}

function uniquePrepend(ids: string[], id: string, limit: number): string[] {
  return [id, ...ids.filter((item) => item !== id)].slice(0, limit);
}

export function readAutoplayPointer(): AutoplayPointer {
  if (typeof window === "undefined") return emptyPointer();
  try {
    const raw = window.localStorage.getItem(AUTOPLAY_POINTER_KEY);
    if (!raw) return emptyPointer();
    return normalizePointer(JSON.parse(raw));
  } catch {
    return emptyPointer();
  }
}

export function writeAutoplayPointer(pointer: AutoplayPointer) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTOPLAY_POINTER_KEY, JSON.stringify(normalizePointer(pointer)));
  } catch {
    // Autoplay memory is optional; playback should never fail because storage is unavailable.
  }
}

export function buildAutoplayAvoidance(sessionPlaylistIds: Set<string>): AutoplayAvoidance {
  const pointer = readAutoplayPointer();
  const now = Date.now();
  const recentPlaylistIds = new Set(pointer.recentPlaylistIds);
  const completedPlaylistIds = new Set(pointer.completedPlaylistIds);
  const rejectedPlaylistIds = new Set(
    pointer.rejectedPlaylistIds.filter((id) => {
      const rejectedAt = pointer.rejectedAtByPlaylistId[id] ?? 0;
      return now - rejectedAt < REJECTED_RETRY_MS;
    }),
  );
  const avoidedPlaylistIds = new Set<string>(sessionPlaylistIds);

  for (const id of recentPlaylistIds) avoidedPlaylistIds.add(id);
  for (const id of completedPlaylistIds) avoidedPlaylistIds.add(id);
  for (const id of rejectedPlaylistIds) avoidedPlaylistIds.add(id);

  return {
    avoidedPlaylistIds,
    rejectedPlaylistIds,
    recentPlaylistIds,
    completedPlaylistIds,
  };
}

export function buildRelaxedAutoplayAvoidance(sessionPlaylistIds: Set<string>): Set<string> {
  const { rejectedPlaylistIds, completedPlaylistIds } = buildAutoplayAvoidance(sessionPlaylistIds);
  const avoidedPlaylistIds = new Set<string>(sessionPlaylistIds);
  for (const id of rejectedPlaylistIds) avoidedPlaylistIds.add(id);
  for (const id of completedPlaylistIds) avoidedPlaylistIds.add(id);
  return avoidedPlaylistIds;
}

export function recordAutoplayPlaylistStarted(playlistId: string, seedPlaylistId: string | undefined) {
  const pointer = readAutoplayPointer();
  writeAutoplayPointer({
    ...pointer,
    recentPlaylistIds: uniquePrepend(pointer.recentPlaylistIds, playlistId, MAX_RECENT_PLAYLISTS),
    lastSeedPlaylistId: seedPlaylistId,
    lastResolvedPlaylistId: playlistId,
    updatedAt: Date.now(),
  });
}

export function recordAutoplayPlaylistRejected(playlistId: string) {
  const pointer = readAutoplayPointer();
  const now = Date.now();
  const rejectedPlaylistIds = uniquePrepend(
    pointer.rejectedPlaylistIds,
    playlistId,
    MAX_REJECTED_PLAYLISTS,
  );
  const rejectedAtByPlaylistId: Record<string, number> = {};
  for (const id of rejectedPlaylistIds) {
    rejectedAtByPlaylistId[id] =
      id === playlistId ? now : pointer.rejectedAtByPlaylistId[id] ?? now;
  }
  writeAutoplayPointer({
    ...pointer,
    rejectedPlaylistIds,
    rejectedAtByPlaylistId,
    updatedAt: now,
  });
}

export function recordAutoplayPlaylistCompleted(playlistId: string) {
  const pointer = readAutoplayPointer();
  writeAutoplayPointer({
    ...pointer,
    completedPlaylistIds: uniquePrepend(
      pointer.completedPlaylistIds,
      playlistId,
      MAX_COMPLETED_PLAYLISTS,
    ),
    updatedAt: Date.now(),
  });
}
