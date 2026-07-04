import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadSession, saveSession, type StoredSession } from "./authStorage";

function createStorage(options: { failSetAttempt?: number; failEverySet?: boolean } = {}): Storage {
  const values = new Map<string, string>();
  let setAttempts = 0;

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      setAttempts += 1;
      if (options.failEverySet || options.failSetAttempt === setAttempts) {
        throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      }
      values.set(key, value);
    },
  };
}

const session: StoredSession = {
  accessToken: "token",
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: {
    id: "user-1",
    email: "test@example.com",
    username: "tester",
    displayName: "Tester",
    bio: null,
    avatarUrl: null,
    heroImageUrl: null,
    profileLinks: [],
    role: "CREATOR",
    status: "ACTIVE",
    isFeaturedArtist: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

describe("authStorage", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prunes optional cache and retries when saving a session hits storage quota", () => {
    const storage = createStorage({ failSetAttempt: 2 });
    storage.setItem("playlisted:theatre:animation-progress:test", JSON.stringify({ frame: 12 }));
    vi.stubGlobal("localStorage", storage);

    expect(() => saveSession(session)).not.toThrow();
    expect(storage.getItem("playlisted:theatre:animation-progress:test")).toBeNull();
    expect(loadSession()?.accessToken).toBe("token");
  });

  it("does not reject a successful API login if storage remains full", () => {
    vi.stubGlobal("localStorage", createStorage({ failEverySet: true }));

    expect(() => saveSession(session)).not.toThrow();
  });
});
