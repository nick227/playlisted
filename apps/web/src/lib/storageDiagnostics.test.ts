import { describe, expect, it, vi } from "vitest";

import {
  clearOptionalLocalStorage,
  collectLocalStorageReport,
  collectStorageBuckets,
  collectStorageHealth,
} from "./storageDiagnostics";

function createStorage(): Storage {
  const values = new Map<string, string>();
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
      values.set(key, value);
    },
  };
}

describe("storageDiagnostics", () => {
  it("reports localStorage keys sorted by estimated size", () => {
    const storage = createStorage();
    storage.setItem("small", "x");
    storage.setItem("large", "x".repeat(100));

    const report = collectLocalStorageReport(storage);

    expect(report.entries[0].key).toBe("large");
    expect(report.totalBytes).toBeGreaterThan(100);
  });

  it("clears only optional Playlisted cache keys", () => {
    const storage = createStorage();
    storage.setItem("playlisted:theatre:animation-progress:test", "{}");
    storage.setItem("playlisted.auth.session", "keep");
    storage.setItem("external-key", "keep");

    expect(clearOptionalLocalStorage(storage)).toEqual(["playlisted:theatre:animation-progress:test"]);
    expect(storage.getItem("playlisted.auth.session")).toBe("keep");
    expect(storage.getItem("external-key")).toBe("keep");
  });

  it("reports whether browser storage writes are allowed", async () => {
    const storage = createStorage();
    vi.stubGlobal("window", {
      localStorage: storage,
      sessionStorage: storage,
    });
    vi.stubGlobal("navigator", {
      storage: {
        estimate: () => Promise.resolve({ quota: 1000, usage: 100 }),
      },
    });

    const health = await collectStorageHealth();

    expect(health.localStorageWritable).toBe(true);
    expect(health.sessionStorageWritable).toBe(true);
    expect(health.estimate).toEqual({ quota: 1000, usage: 100 });
    vi.unstubAllGlobals();
  });

  it("reports origin storage bucket names when browser APIs allow it", async () => {
    vi.stubGlobal("window", {
      caches: {
        keys: () => Promise.resolve(["vite-cache"]),
      },
      indexedDB: {
        databases: () => Promise.resolve([{ name: "app-db", version: 1 }]),
      },
    });
    vi.stubGlobal("navigator", {
      storage: {
        estimate: () => Promise.resolve({ quota: 1000, usage: 100 }),
      },
    });

    await expect(collectStorageBuckets()).resolves.toEqual({
      estimate: { quota: 1000, usage: 100 },
      caches: ["vite-cache"],
      indexedDBDatabases: ["app-db"],
      opfs: { available: false, entries: [], bytes: null, error: null },
      serviceWorkers: null,
    });
    vi.unstubAllGlobals();
  });
});
