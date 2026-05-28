import type { AuthUser } from "@playlisted/client-sdk";

const STORAGE_KEY = "playlisted.auth.session";

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}
