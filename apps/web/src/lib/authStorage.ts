import type { AuthUser } from "@playlisted/client-sdk";

const STORAGE_KEY = "playlisted.auth.session";
const OPTIONAL_STORAGE_KEYS = [
  "musicpop:player-volume",
  "musicpop:recent-searches",
  "playlisted-autoplay",
  "playlisted-autoplay-pointer",
  "playlisted.radio.listenerId",
  "playlisted.visualizer.settings",
  "playlisted:subtitles-enabled",
  "playlisted:theatre:breadcrumb",
  "theatre.fxBag.v1",
];
const OPTIONAL_STORAGE_PREFIXES = ["playlisted:theatre:animation-progress:"];

export type StoredSession = {
  accessToken: string;
  expiresAt: string;
  user: AuthUser;
};

export function loadSession(): StoredSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as StoredSession;
    if (!session.accessToken || !session.expiresAt || !session.user) {
      return null;
    }
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveSession(session: StoredSession) {
  const serialized = JSON.stringify(session);
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
    return;
  } catch (error) {
    if (!isStorageQuotaError(error)) {
      throw error;
    }
  }

  pruneOptionalStorage();

  try {
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // The API login succeeded. Keep the in-memory auth state usable for this tab
    // even if this browser profile cannot persist the session right now.
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

function isStorageQuotaError(error: unknown) {
  if (!(error instanceof DOMException)) return false;
  return error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED" || error.code === 22;
}

function pruneOptionalStorage() {
  const keysToRemove = new Set(OPTIONAL_STORAGE_KEYS);

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      if (OPTIONAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        keysToRemove.add(key);
      }
    }
  } catch {
    // Ignore storage enumeration failures; the retry below will decide whether persistence works.
  }

  for (const key of keysToRemove) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Optional cache cleanup should not block login.
    }
  }
}
