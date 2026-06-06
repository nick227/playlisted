import type { Request, Response } from "express";

type CacheOptions = {
  namespace: string;
  ttlSeconds: number;
  staleWhileRevalidateSeconds?: number;
  maxEntries?: number;
};

type CacheEntry = {
  expiresAt: number;
  body: string;
};

const cache = new Map<string, CacheEntry>();

function buildKey(req: Request, namespace: string): string {
  return `${namespace}:${req.originalUrl}`;
}

function setHeaders(res: Response, options: CacheOptions, cacheStatus: "HIT" | "MISS") {
  const stale = options.staleWhileRevalidateSeconds ?? options.ttlSeconds;
  res.setHeader("Cache-Control", `public, max-age=${options.ttlSeconds}, stale-while-revalidate=${stale}`);
  res.setHeader("X-Playlisted-Cache", cacheStatus);
}

function prune(maxEntries: number) {
  if (cache.size <= maxEntries) return;

  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }

  while (cache.size > maxEntries) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}

export async function sendCachedPublicJson<T>(
  req: Request,
  res: Response,
  options: CacheOptions,
  load: () => Promise<T>,
) {
  const key = buildKey(req, options.namespace);
  const now = Date.now();
  const hit = cache.get(key);

  if (hit && hit.expiresAt > now) {
    setHeaders(res, options, "HIT");
    res.type("application/json").send(hit.body);
    return;
  }

  const payload = await load();
  const body = JSON.stringify(payload);
  cache.set(key, {
    body,
    expiresAt: now + options.ttlSeconds * 1000,
  });
  prune(options.maxEntries ?? 250);

  setHeaders(res, options, "MISS");
  res.type("application/json").send(body);
}

export function clearPublicJsonCache(namespace?: string) {
  if (!namespace) {
    cache.clear();
    return;
  }

  const prefix = `${namespace}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
