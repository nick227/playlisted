import fs from "node:fs";
import { chromium } from "playwright";

const baseUrl = (process.env.PERF_BASE_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");
const outputPath = process.env.PERF_PAGE_OUTPUT ?? "reports/performance/page-load-latest.json";
const strict = process.env.PERF_STRICT !== "0" && process.argv.includes("--strict");
const navTimeoutMs = Number(process.env.PERF_PAGE_TIMEOUT_MS ?? 30_000);
const idleTimeoutMs = Number(process.env.PERF_NETWORK_IDLE_TIMEOUT_MS ?? 7_500);

const massiveTransferBytes = Number(process.env.PERF_MASSIVE_TRANSFER_BYTES ?? 5 * 1024 * 1024);
const homepageUsableBudgetMs = Number(process.env.PERF_HOMEPAGE_USABLE_MS ?? 2_500);

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
Usage:
  PERF_BASE_URL=http://127.0.0.1:4000 npm run perf:pages
  PERF_BASE_URL=https://staging.example.com npm run perf:pages:strict

Environment:
  PERF_BASE_URL                  Base app URL. Default: http://127.0.0.1:4000
  PERF_PAGE_OUTPUT               JSON artifact path. Default: reports/performance/page-load-latest.json
  PERF_PAGE_TIMEOUT_MS           Navigation timeout. Default: 30000
  PERF_NETWORK_IDLE_TIMEOUT_MS   Network-idle wait timeout. Default: 7500
  PERF_HOMEPAGE_USABLE_MS        Strict homepage budget. Default: 2500
  PERF_MASSIVE_TRANSFER_BYTES    Massive transfer failure threshold. Default: 5242880
`);
  process.exit(0);
}

function formatMs(value) {
  if (value == null) return "-";
  return `${Math.round(value)}ms`;
}

function formatKb(value) {
  if (value == null) return "-";
  return `${(value / 1024).toFixed(1)}k`;
}

function routeUrl(path) {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function isApiUrl(url) {
  try {
    return new URL(url).pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

async function fetchJson(path) {
  try {
    const response = await fetch(routeUrl(path));
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function discoverRoutes() {
  const routes = [
    { name: "home", path: "/", required: true },
    { name: "library", path: "/library", required: true },
    { name: "artists", path: "/artists", required: true },
    { name: "search rock", path: "/search?q=rock", required: true },
  ];

  const playlists = await fetchJson("/api/v1/playlists?pageSize=1");
  const playlist = Array.isArray(playlists?.data) ? playlists.data[0] : null;
  if (playlist?.href || playlist?.id) {
    routes.push({
      name: "playlist detail",
      path: playlist.href ?? `/playlists/${encodeURIComponent(playlist.id)}`,
      required: false,
    });
  }

  const artists = await fetchJson("/api/v1/library/artists");
  const artist = Array.isArray(artists?.data) ? artists.data[0] : null;
  if (artist?.username) {
    routes.push({
      name: "artist detail",
      path: `/@/${encodeURIComponent(artist.username)}`,
      required: false,
    });
  }

  return routes;
}

async function installPerfObservers(page) {
  await page.addInitScript(() => {
    window.__pageLoadBenchmark = { fcp: null, lcp: null };

    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === "first-contentful-paint") {
            window.__pageLoadBenchmark.fcp = entry.startTime;
          }
        }
      });
      paintObserver.observe({ type: "paint", buffered: true });
    } catch {
      // PerformanceObserver support varies in older browsers.
    }

    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const latest = entries[entries.length - 1];
        if (latest) {
          window.__pageLoadBenchmark.lcp = latest.startTime;
        }
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      // LCP is Chromium-only and may be unavailable in some modes.
    }
  });
}

async function collectBrowserMetrics(page) {
  return await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource");
    const paint = performance.getEntriesByType("paint");
    const fcpPaint = paint.find((entry) => entry.name === "first-contentful-paint");
    const benchmark = window.__pageLoadBenchmark ?? {};

    const totals = {
      jsTransferBytes: 0,
      cssTransferBytes: 0,
      imageTransferBytes: 0,
      totalTransferBytes: 0,
    };
    const resourcesByUrl = new Map();

    for (const entry of resources) {
      const transferSize = entry.transferSize ?? 0;
      totals.totalTransferBytes += transferSize;
      const url = entry.name;
      const previous = resourcesByUrl.get(url) ?? {
        url,
        initiatorType: entry.initiatorType,
        transferBytes: 0,
        durationMs: 0,
      };
      previous.transferBytes += transferSize;
      previous.durationMs = Math.max(previous.durationMs, entry.duration ?? 0);
      resourcesByUrl.set(url, previous);
      if (entry.initiatorType === "script" || /\.js(?:$|\?)/.test(entry.name)) {
        totals.jsTransferBytes += transferSize;
      } else if (entry.initiatorType === "css" || /\.css(?:$|\?)/.test(entry.name)) {
        totals.cssTransferBytes += transferSize;
      } else if (entry.initiatorType === "img" || /\.(?:png|jpe?g|webp|gif|svg)(?:$|\?)/.test(entry.name)) {
        totals.imageTransferBytes += transferSize;
      }
    }

    return {
      domContentLoadedMs: nav ? nav.domContentLoadedEventEnd - nav.startTime : null,
      loadEventMs: nav && nav.loadEventEnd > 0 ? nav.loadEventEnd - nav.startTime : null,
      firstContentfulPaintMs: benchmark.fcp ?? fcpPaint?.startTime ?? null,
      largestContentfulPaintMs: benchmark.lcp ?? null,
      topResources: [...resourcesByUrl.values()]
        .sort((a, b) => b.transferBytes - a.transferBytes)
        .slice(0, 10),
      topImageResources: [...resourcesByUrl.values()]
        .filter((entry) =>
          entry.initiatorType === "img" ||
          /\.(?:png|jpe?g|webp|gif|svg)(?:$|\?)/.test(entry.url)
        )
        .sort((a, b) => b.transferBytes - a.transferBytes)
        .slice(0, 10),
      ...totals,
    };
  });
}

async function benchmarkRoute(browser, route) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await installPerfObservers(page);

  const apiRequests = new Map();
  const failedRequests = [];
  const responseFailures = [];

  page.on("request", (request) => {
    if (!isApiUrl(request.url())) return;
    apiRequests.set(request, {
      url: request.url(),
      method: request.method(),
      startedAt: Date.now(),
      durationMs: null,
      status: null,
      serverTiming: null,
    });
  });

  page.on("response", (response) => {
    const request = response.request();
    const sample = apiRequests.get(request);
    if (!sample) return;
    sample.durationMs = Date.now() - sample.startedAt;
    sample.status = response.status();
    sample.serverTiming = response.headers()["server-timing"] ?? null;
    if (response.status() >= 400) {
      responseFailures.push({
        url: response.url(),
        status: response.status(),
      });
    }
  });

  page.on("requestfailed", (request) => {
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText ?? "request failed",
    });
  });

  const startedAt = Date.now();
  let navigationError = null;
  let networkIdleReached = true;

  try {
    await page.goto(routeUrl(route.path), {
      waitUntil: "domcontentloaded",
      timeout: navTimeoutMs,
    });
    try {
      await page.waitForLoadState("networkidle", { timeout: idleTimeoutMs });
    } catch {
      networkIdleReached = false;
    }
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error);
  }

  await page.waitForTimeout(250);
  const totalLoadMs = Date.now() - startedAt;
  const browserMetrics = await collectBrowserMetrics(page).catch(() => ({
    domContentLoadedMs: null,
    loadEventMs: null,
    firstContentfulPaintMs: null,
    largestContentfulPaintMs: null,
    topResources: [],
    topImageResources: [],
    jsTransferBytes: 0,
    cssTransferBytes: 0,
    imageTransferBytes: 0,
    totalTransferBytes: 0,
  }));

  const apiSamples = [...apiRequests.values()]
    .filter((sample) => sample.durationMs != null)
    .map((sample) => ({
      url: sample.url,
      path: new URL(sample.url).pathname,
      method: sample.method,
      status: sample.status,
      durationMs: sample.durationMs,
      serverTiming: sample.serverTiming,
    }));
  const slowestApiRequest = apiSamples
    .sort((a, b) => b.durationMs - a.durationMs)[0] ?? null;

  await context.close();

  const failed = [
    ...failedRequests,
    ...responseFailures.map((failure) => ({
      url: failure.url,
      method: "GET",
      failure: `HTTP ${failure.status}`,
    })),
  ];

  return {
    name: route.name,
    path: route.path,
    url: routeUrl(route.path),
    required: route.required,
    totalLoadMs,
    networkIdleReached,
    navigationError,
    ...browserMetrics,
    apiRequestCount: apiSamples.length,
    slowestApiRequest,
    failedRequests: failed,
  };
}

function evaluate(results) {
  const failures = [];
  const warnings = [];
  for (const result of results) {
    if (result.navigationError) {
      failures.push(`${result.name}: navigation failed (${result.navigationError})`);
    }
    if (result.failedRequests.length > 0) {
      failures.push(`${result.name}: ${result.failedRequests.length} failed request(s)`);
    }
    if (result.totalTransferBytes > massiveTransferBytes) {
      const largest = result.topResources[0];
      const suffix = largest ? `; largest ${formatKb(largest.transferBytes)} ${largest.url}` : "";
      const message = `${result.name}: massive transfer ${formatKb(result.totalTransferBytes)}${suffix}`;
      if (strict) {
        failures.push(message);
      } else {
        warnings.push(message);
      }
    }
    if (strict && result.path === "/" && result.totalLoadMs > homepageUsableBudgetMs) {
      failures.push(`home: usable load ${formatMs(result.totalLoadMs)} over ${formatMs(homepageUsableBudgetMs)}`);
    }
  }
  return { failures, warnings };
}

function printTable(results, failures, warnings, skipped) {
  const rows = results.map((result) => ({
    route: `${result.name} ${result.networkIdleReached ? "" : "(no idle)"}`.trim(),
    path: result.path,
    total: formatMs(result.totalLoadMs),
    dcl: formatMs(result.domContentLoadedMs),
    fcp: formatMs(result.firstContentfulPaintMs),
    lcp: formatMs(result.largestContentfulPaintMs),
    js: formatKb(result.jsTransferBytes),
    css: formatKb(result.cssTransferBytes),
    img: formatKb(result.imageTransferBytes),
    api: result.apiRequestCount,
    slowestApi: result.slowestApiRequest
      ? `${new URL(result.slowestApiRequest.url).pathname} ${formatMs(result.slowestApiRequest.durationMs)}`
      : "-",
    failed: result.failedRequests.length,
  }));

  console.table(rows);

  if (skipped.length > 0) {
    console.log(`Skipped optional routes: ${skipped.map((route) => route.name).join(", ")}`);
  }

  if (failures.length > 0) {
    console.log("\nFailures:");
    for (const failure of failures) {
      console.log(`- ${failure}`);
    }
  }

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  const routesWithLargeImages = results.filter((result) => result.topImageResources.length > 0);
  if (routesWithLargeImages.length > 0) {
    console.log("\nLargest image resources:");
    for (const result of routesWithLargeImages) {
      const images = result.topImageResources
        .slice(0, 3)
        .map((entry) => `${formatKb(entry.transferBytes)} ${new URL(entry.url).pathname}`)
        .join("; ");
      console.log(`- ${result.name}: ${images}`);
    }
  }
}

let browser;
const startedAt = new Date().toISOString();

try {
  browser = await chromium.launch({ headless: true });
} catch (error) {
  console.error("Unable to launch Playwright Chromium.");
  console.error("Run: npx playwright install chromium");
  console.error("On Linux/WSL, also run: npx playwright install-deps chromium");
  throw error;
}

const routes = await discoverRoutes();
const requiredNames = new Set(["home", "library", "artists", "search rock"]);
const skipped = [];
if (!routes.some((route) => route.name === "playlist detail")) {
  skipped.push({ name: "playlist detail", reason: "No public playlist fixture discovered." });
}
if (!routes.some((route) => route.name === "artist detail")) {
  skipped.push({ name: "artist detail", reason: "No public artist fixture discovered." });
}

const results = [];
try {
  for (const route of routes) {
    if (!route.required && requiredNames.has(route.name)) continue;
    results.push(await benchmarkRoute(browser, route));
  }
} finally {
  await browser.close();
}

const { failures, warnings } = evaluate(results);
const artifact = {
  baseUrl,
  startedAt,
  strict,
  thresholds: {
    homepageUsableBudgetMs,
    massiveTransferBytes,
  },
  skipped,
  failures,
  warnings,
  results,
};

const outputDir = outputPath.split(/[\\/]/).slice(0, -1).join("/");
if (outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
}
fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);

printTable(results, failures, warnings, skipped);
console.log(`\nWrote ${outputPath}`);

if (failures.length > 0 && (strict || failures.some((failure) =>
  failure.includes("failed request") ||
  failure.includes("navigation failed")
))) {
  process.exit(1);
}
