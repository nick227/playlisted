const OPTIONAL_KEYS = [
  "musicpop:player-volume",
  "musicpop:recent-searches",
  "playlisted-autoplay",
  "playlisted-autoplay-pointer",
  "playlisted.radio.chatName",
  "playlisted.radio.listenerId",
  "playlisted.traffic.visitorId",
  "playlisted.visualizer.settings",
  "playlisted:subtitles-enabled",
  "playlisted:theatre:breadcrumb",
  "theatre.fxBag.v1",
];
const OPTIONAL_PREFIXES = ["playlisted:theatre:animation-progress:"];
const WARNING_BYTES = 2.5 * 1024 * 1024;

type IterableDirectoryHandle = FileSystemDirectoryHandle & {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
};

export type StorageEntryReport = {
  key: string;
  bytes: number;
  valueChars: number;
};

export type StorageReport = {
  totalBytes: number;
  entries: StorageEntryReport[];
};

export type StorageHealthReport = StorageReport & {
  localStorageWritable: boolean;
  sessionStorageWritable: boolean;
  localStorageError: string | null;
  sessionStorageError: string | null;
  estimate: StorageEstimate | null;
};

export type StorageBucketReport = {
  estimate: StorageEstimate | null;
  caches: string[];
  indexedDBDatabases: string[] | null;
  opfs: {
    available: boolean;
    entries: string[];
    bytes: number | null;
    error: string | null;
  };
  serviceWorkers: string[] | null;
};

declare global {
  interface Window {
    __playlistedStorageReport?: () => StorageReport;
    __playlistedStorageHealth?: () => Promise<StorageHealthReport>;
    __playlistedStorageBuckets?: () => Promise<StorageBucketReport>;
    __playlistedClearOptionalStorage?: () => string[];
  }
}

function estimateBytes(value: string) {
  return new Blob([value]).size;
}

function isOptionalKey(key: string) {
  return OPTIONAL_KEYS.includes(key) || OPTIONAL_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function collectLocalStorageReport(storage: Storage = window.localStorage): StorageReport {
  const entries: StorageEntryReport[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;

    const value = storage.getItem(key) ?? "";
    entries.push({
      key,
      bytes: estimateBytes(key) + estimateBytes(value),
      valueChars: value.length,
    });
  }

  entries.sort((left, right) => right.bytes - left.bytes);
  return {
    totalBytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
    entries,
  };
}

export function clearOptionalLocalStorage(storage: Storage = window.localStorage): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key && isOptionalKey(key)) {
      keys.push(key);
    }
  }

  for (const key of keys) {
    storage.removeItem(key);
  }

  return keys;
}

function testStorageWrite(storage: Storage, key: string) {
  try {
    storage.setItem(key, "1");
    storage.removeItem(key);
    return { writable: true, error: null };
  } catch (error) {
    return {
      writable: false,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  }
}

export async function collectStorageHealth(): Promise<StorageHealthReport> {
  const report = collectLocalStorageReport();
  const localStorage = testStorageWrite(window.localStorage, "__playlisted_storage_probe__");
  const sessionStorage = testStorageWrite(window.sessionStorage, "__playlisted_storage_probe__");
  const estimate = navigator.storage?.estimate ? await navigator.storage.estimate().catch(() => null) : null;

  return {
    ...report,
    localStorageWritable: localStorage.writable,
    sessionStorageWritable: sessionStorage.writable,
    localStorageError: localStorage.error,
    sessionStorageError: sessionStorage.error,
    estimate,
  };
}

export async function collectStorageBuckets(): Promise<StorageBucketReport> {
  const estimate = navigator.storage?.estimate ? await navigator.storage.estimate().catch(() => null) : null;
  const caches = window.caches ? await window.caches.keys().catch(() => []) : [];
  const databases =
    "indexedDB" in window && "databases" in window.indexedDB
      ? await window.indexedDB.databases().catch(() => null)
      : null;
  const opfs = await inspectOpfs();
  const serviceWorkers = navigator.serviceWorker
    ? await navigator.serviceWorker.getRegistrations().then(
        (registrations) => registrations.map((registration) => registration.scope),
        () => null,
      )
    : null;

  return {
    estimate,
    caches,
    indexedDBDatabases: databases?.map((database) => database.name).filter((name): name is string => Boolean(name)) ?? null,
    opfs,
    serviceWorkers,
  };
}

async function inspectOpfs(): Promise<StorageBucketReport["opfs"]> {
  if (!navigator.storage?.getDirectory) {
    return { available: false, entries: [], bytes: null, error: null };
  }

  try {
    const root = await navigator.storage.getDirectory();
    const entries: string[] = [];
    const bytes = await walkOpfs(root, "", entries);
    return { available: true, entries, bytes, error: null };
  } catch (error) {
    return {
      available: true,
      entries: [],
      bytes: null,
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    };
  }
}

async function walkOpfs(
  directory: FileSystemDirectoryHandle,
  prefix: string,
  entries: string[],
): Promise<number> {
  let bytes = 0;
  for await (const [name, handle] of (directory as IterableDirectoryHandle).entries()) {
    const path = `${prefix}${name}`;
    entries.push(path);
    if (handle.kind === "file") {
      const file = await (handle as FileSystemFileHandle).getFile();
      bytes += file.size;
    } else {
      bytes += await walkOpfs(handle as FileSystemDirectoryHandle, `${path}/`, entries);
    }
  }
  return bytes;
}

export function installStorageDiagnostics() {
  if (typeof window === "undefined") return;

  window.__playlistedStorageReport = () => {
    const report = collectLocalStorageReport();
    console.table(report.entries.slice(0, 20));
    console.info(`[Playlisted] localStorage total: ${Math.round(report.totalBytes / 1024)} KB`);
    return report;
  };

  window.__playlistedStorageHealth = async () => {
    const report = await collectStorageHealth();
    console.table(report.entries.slice(0, 20));
    console.info(`[Playlisted] localStorage total: ${Math.round(report.totalBytes / 1024)} KB`);
    console.info("[Playlisted] storage health", {
      localStorageWritable: report.localStorageWritable,
      localStorageError: report.localStorageError,
      sessionStorageWritable: report.sessionStorageWritable,
      sessionStorageError: report.sessionStorageError,
      estimate: report.estimate,
    });
    return report;
  };

  window.__playlistedStorageBuckets = async () => {
    const report = await collectStorageBuckets();
    console.info("[Playlisted] origin storage buckets", report);
    return report;
  };

  window.__playlistedClearOptionalStorage = () => {
    const keys = clearOptionalLocalStorage();
    console.info(`[Playlisted] cleared ${keys.length} optional localStorage key(s).`, keys);
    return keys;
  };

  try {
    const report = collectLocalStorageReport();
    if (report.totalBytes >= WARNING_BYTES) {
      console.warn(
        `[Playlisted] localStorage is using ${Math.round(report.totalBytes / 1024)} KB. Run __playlistedStorageReport() to inspect the largest keys.`,
      );
    }
  } catch {
    // Storage diagnostics should never affect the app.
  }
}
