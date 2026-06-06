import type { NextFunction, Request, Response } from "express";

type TimedRoute = {
  label: string;
  pattern: RegExp;
};

const TIMED_PUBLIC_API_ROUTES: TimedRoute[] = [
  { label: "homepage", pattern: /^\/api\/v1\/homepage(?:\/)?$/ },
  { label: "search_suggestions", pattern: /^\/api\/v1\/search\/suggestions(?:\/)?$/ },
  { label: "search_unified", pattern: /^\/api\/v1\/search\/unified(?:\/)?$/ },
  { label: "library_songs", pattern: /^\/api\/v1\/library\/songs(?:\/)?$/ },
  { label: "library_artists", pattern: /^\/api\/v1\/library\/artists(?:\/)?$/ },
  { label: "charts", pattern: /^\/api\/v1\/charts(?:\/|$)/ },
  { label: "playlists_random", pattern: /^\/api\/v1\/playlists\/random(?:\/)?$/ },
];

function timedRouteFor(pathname: string) {
  return TIMED_PUBLIC_API_ROUTES.find((route) => route.pattern.test(pathname));
}

function formatDurationMs(startedAt: bigint) {
  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  return Math.max(0, elapsedMs);
}

export function publicApiTiming(req: Request, res: Response, next: NextFunction) {
  const route = timedRouteFor(req.path);
  if (!route) {
    next();
    return;
  }

  const startedAt = process.hrtime.bigint();
  const originalWriteHead = res.writeHead.bind(res);

  res.writeHead = ((...args: Parameters<Response["writeHead"]>) => {
    const elapsedMs = formatDurationMs(startedAt);
    const duration = elapsedMs.toFixed(1);
    res.setHeader("Server-Timing", `${route.label};dur=${duration}`);
    res.setHeader("X-Playlisted-Route-Time", duration);
    return originalWriteHead(...args);
  }) as Response["writeHead"];

  next();
}
