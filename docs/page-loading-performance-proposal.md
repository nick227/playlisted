# Page Loading Performance Proposal

Date: 2026-06-06

## Scope

This inspection covers the Playlisted web client (`apps/web`), the Express static/API server (`src/app.ts`, `src/lib/serveWeb.ts`), the highest-impact data routes, and production build output. It is focused on perceived page loading performance: first visit, route transitions, media-heavy pages, API latency, and repeat visits.

## Current Snapshot

- Stack: Vite 6, React 19, React Router 7, TanStack Query 5, Tailwind 4, Express 4, Prisma 6, MySQL.
- Production web build command run: `npm --prefix apps/web run build`.
- Build output highlights:
  - Main JS: `dist/assets/index-Cyhfmw0I.js` at 738.4 kB minified, 198.6 kB gzip.
  - CSS: `dist/assets/index-BMifR3VU.css` at 104.4 kB minified, 16.9 kB gzip.
  - Lazy theatre controller chunk: `dist/assets/TheatreController-CRKiOdVa.js` at 26.0 kB minified, 8.3 kB gzip.
  - Theatre registry/seed chunk: `dist/assets/seed-VfhF3HI6.js` at 327.7 kB minified, 98.7 kB gzip.
  - Favicon: `dist/assets/favicon--nxyaUFm.png` at 239.5 kB.
  - Vite warning: at least one chunk is larger than 500 kB after minification.

## Pass 1 Completed

Implementation began with the public page speed bundle and this report was rescanned before closeout. Current build-budget results after route splitting, favicon cleanup, image defaults, homepage deferral, static asset caching, compression, payload caps, and lightweight search suggestions:

- Initial public JS: 114.3 kB gzip, under the 250 kB target.
- CSS: 16.5 kB gzip, under the 25 kB target.
- Loaded favicon assets: 0.6 kB, under the 20 kB target.
- Homepage route chunk: 11.2 kB gzip.
- Old large favicon PNG is no longer emitted by the web build.
- Full test suite: 25 files passed, 143 tests passed.
- Production web build plus budget check: passed.

## Pass 2 Started

The next priority objective is protecting page speed with short public caches and cheaper public query shapes. This pass adds:

- Short serialized JSON cache for public homepage data.
- Short public caches for library genre, playlist genre, artist, random playlist, and chart endpoints.
- Homepage admin cache invalidation on feature create, update, and delete.
- Random playlist selection changed away from `ORDER BY RAND()` to a bounded random offset.
- Valid upload `Cache-Control` max-age seconds derived from `UPLOADS_CACHE_MAX_AGE`.
- Focused regression tests for public cache hits and random playlist query behavior.

Current verification:

- Full test suite: 26 files passed, 146 tests passed.
- Production web build plus budget check: passed.
- Initial public JS remains 114.3 kB gzip, under the 250 kB target.

## Pass 3 Started

The next priority objective is making the public caches trustworthy while reducing Node memory pressure on catalog browse routes. This pass adds:

- Shared public catalog cache invalidation across homepage, library, random playlist, and chart namespaces.
- Cache invalidation after admin song updates, song tag changes, song deletes, playlist updates, playlist tag changes, tag creates, tag updates, tag bulk imports, and tag deletes.
- `/library/artists` now uses SQL aggregation for artist counts and year ranges instead of loading all browsable recordings into Node memory.
- `/library/artists` fetches distinct genre rows separately and maps them back to artists, avoiding nested recording payload retention.
- Focused regression coverage that confirms `/library/artists` does not call `recording.findMany`.

Current verification:

- Targeted performance tests: 2 files passed, 10 tests passed.
- Full test suite: 26 files passed, 147 tests passed.
- Production web build plus budget check: passed.
- Initial public JS remains 114.3 kB gzip, under the 250 kB target.

## Pass 4 Started

The next priority objective is automated page-load benchmarking and route timing without introducing dashboards or paid tooling. This pass adds:

- Playwright-based page-load benchmark script for key public routes.
- Runtime discovery for one public playlist detail route and one public artist detail route when fixture data exists.
- Per-route capture of total load time, DOMContentLoaded, first contentful paint, largest contentful paint, JS/CSS/image transfer, API request count, slowest API request, and failed requests.
- Readable stdout table plus JSON artifact at `reports/performance/page-load-latest.json`.
- `perf:pages` and `perf:pages:strict` scripts.
- Forgiving initial thresholds: non-strict fails on failed requests or navigation failure. Massive transfer is reported as a warning so oversized images remain visible without blocking small-site iteration; strict mode also checks homepage total load under 2.5 seconds and treats massive transfer as a failure.
- `Server-Timing` and `X-Playlisted-Route-Time` headers for public API timing paths:
  - `/api/v1/homepage`
  - `/api/v1/search/suggestions`
  - `/api/v1/search/unified`
  - `/api/v1/library/songs`
  - `/api/v1/library/artists`
  - `/api/v1/charts/*`
  - `/api/v1/playlists/random`

Current verification:

- TypeScript build: passed.
- Public API timing header test: 1 file passed, 2 tests passed.
- Full test suite: 27 files passed, 149 tests passed.
- Page benchmark script syntax and help path: passed.
- Strict asset budget: passed.
- Local Playwright execution is blocked until this WSL/Linux image has Chromium system dependencies installed; current missing library is `libnspr4.so`. Run `npx playwright install-deps chromium` before collecting local page-load numbers here.

## Pass 5 Started

The page-load artifact showed public pages were no longer primarily JS/API-bound; the remaining problem was oversized original upload images. This pass keeps the one-file upload model and avoids derivative image management.

Changes:

- Added upload-time image optimization using `sharp`.
- Image uploads are rewritten in place to max 1920px on the longest side.
- Optimized images over 5 MB are rejected.
- Invalid image files with allowed extensions are rejected cleanly.
- Added `uploads:images:scan` and `uploads:images:optimize` maintenance scripts.
- Existing `uploads/images` files were optimized in place with backups.

Results:

- `uploads/images` reduced to 18 MB.
- Largest public upload images reduced from about 69 MB each to about 2.6 MB each.
- Dry-run after optimization reports 0 meaningful remaining rewrites and 0 B potential savings.
- Original image backups were written to `reports/image-optimization-backups/2026-06-06T10-22-06-976Z` and that backup path is git-ignored.

Follow-up benchmark:

- Homepage image transfer dropped from about 155 MB to 11.9 MB.
- Library image transfer dropped to 791 kB.
- Artists image transfer dropped to 3.4 MB.
- Search image transfer is 0 B on initial route load.
- Remaining warnings are now render-level, not original-upload-size level:
  - homepage still loads about 12.1 MB total, led by `machine-and-soul-cover.png`, `pulse-drift-avatar.png`, and `essential-midnight-releases-cover.png`.
  - artist detail still loads about 5.4 MB total, led by `pulse-drift-avatar.png`.
- Response:
  - homepage heavy rows now mount through viewport-aware deferred sections.
  - chart/random/fallback hooks moved inside deferred sections so those API calls do not fire from the homepage parent before the rows are eligible to render.
  - the featured artist banner image is no longer marked `eager` or `fetchPriority="high"`; only a true primary hero image should receive that treatment.

Post-rebuild benchmark:

- Homepage total load improved from about 4.36 seconds to 1.58 seconds.
- Homepage DOMContentLoaded improved from about 2.8 seconds to 80 ms.
- Homepage FCP and LCP are both about 440 ms.
- Homepage image transfer is still about 9.8 MB because visible/catalog sections include several large optimized PNG uploads.
- Remaining massive-transfer warnings are now content-format warnings:
  - `machine-and-soul-cover.png` and `pulse-drift-avatar.png` are about 2.6 MB each after max-dimension resizing.
  - `leave-it-up-to-you-art.png` is about 1.1 MB.
  - artist/library routes still pay for `pulse-drift-avatar.png` when that artist is visible near the top.

## Performance Goals

- Priority 1: page speed. First-load JavaScript, image contention, request waterfalls, and cache behavior are the realest user-facing problems.
- Priority 2: server resources. CPU, memory, database load, and traffic buffers matter next because they protect page speed as usage grows.
- First contentful page shell should render quickly on mid-range mobile and cold desktop visits.
- Public pages should not download admin, studio, upload, and theatre code until needed.
- Homepage should avoid request waterfalls and large above-the-fold image cost.
- Repeat visits should benefit from long-lived immutable asset caching.
- Media/uploads should be cacheable, size-bounded, and served without blocking API work.
- Backend list/search/chart endpoints should remain predictable as catalog and traffic data grow.

## Pass 1: Make Public Pages Feel Instant

The v1 rule is simple: do not make first-time public visitors download, render, query, animate, or image-load anything they cannot see yet.

Ship this as one focused bundle:

- Lazy-load route pages from `App.tsx`.
- Keep the public shell small.
- Split Studio, admin, auth, and theatre into lazy chunks.
- Add image defaults to shared image/card components.
- Mark only the homepage hero image as eager with high fetch priority.
- Lazy-load below-the-fold rows.
- Defer decorative canvas work until after first content.
- Replace oversized favicon assets.
- Add Express static caching and compression.
- Add a tiny build budget check.

Practical v1 targets:

- Initial public JS: under 250 kB gzip.
- CSS: under 25 kB gzip.
- Favicon: under 20 kB total loaded.
- Homepage first API: one critical endpoint before useful content.
- Below-fold API calls: delayed or non-blocking.
- Card images: lazy and async by default.
- Hero image: eager and high priority only when truly above fold.

Recommended v1 order:

1. Static/server cheap wins: immutable `/assets/*`, no-cache `index.html`, appropriate `/uploads/*` TTL, compression, and small favicon assets.
2. Route splitting: homepage visitors should download app shell plus homepage only; Studio/admin/auth/search/profile/theatre should load when visited or requested.
3. Image policy: shared cover/avatar/card primitives default to `loading="lazy"` and `decoding="async"`, with explicit eager/high-priority overrides for true heroes.
4. Homepage request triage: render critical homepage hero/editorial rows first; defer top songs, top artists, top playlists, random playlists, and secondary discovery rows.
5. Obvious payload bloat: start library songs at 50 instead of 200, split lightweight search suggestions from full search, and avoid huge nested playlist/profile detail objects until needed.

Do not build a giant homepage aggregate endpoint in Pass 1. It may be useful later, but the safer first move is critical content first and non-critical content deferred.

## Memory and Resource Scan

This second pass looked for client memory pressure, long-lived loops/listeners, upload handling, in-memory server buffers, and broad database reads. Page speed remains the first priority; these items are the moat/gap layer that keeps speed from degrading under heavier use.

### Existing Moats

- Uploads use `multer.diskStorage`, not memory storage, so audio/image upload bodies are not buffered wholesale in Node memory.
- Upload size limits are centralized through `UPLOAD_MAX_BYTES`, and bulk register has `BULK_REGISTER_MAX_FILES`.
- Traffic instrumentation has a bounded in-memory buffer with `TRAFFIC_BUFFER_MAX`, `TRAFFIC_FLUSH_BATCH_SIZE`, and dropped-event accounting.
- The site audio element uses `preload="metadata"`, avoiding full audio downloads before playback.
- Several animation/canvas surfaces clean up RAF loops and listeners on unmount, including `FakeAiChat`, `PersistentVisualizerLayer`, `CanvasAnimation`, and theatre overlay cleanup paths.
- The visualizer has a slow-frame protection path that disables itself after repeated expensive frames.
- Theatre mode is behind a lazy controller facade, so the heaviest visual system is not eagerly initialized for ordinary visitors.
- Audio metadata probing uses `URL.createObjectURL()` and correctly calls `URL.revokeObjectURL()` in a `finally` block.
- The generated OpenAPI schema runtime file is effectively empty (`export {}`), so schema types are not secretly adding large runtime JavaScript to the client bundle.
- `express.json()` is present without a custom larger limit, so the app currently keeps Express's default JSON body limit as an implicit request-size moat.

### Gaps to Address

- Large client-side query payloads can remain in TanStack Query cache, especially library songs, playlist detail, search results, and profile/playlist pages. Add explicit `gcTime` policies for high-cardinality or large-detail queries.
- The audio player queue stores complete track objects for the current queue. Large playlists can increase client heap and context re-render cost; cap or normalize queue data where possible.
- The audio analyser uses a `WeakMap` per media element and does not close the `AudioContext`; because the site audio element is persistent this is acceptable, but visualizer/theatre analyser ownership should stay single-source and documented.
- `PersistentVisualizerLayer` keeps its canvas mounted while hidden. This avoids remount churn, but it keeps canvas backing memory alive; validate this against mobile heap and consider unmounting on low-memory/performance-disabled states.
- `FakeAiChat` runs a decorative homepage RAF loop above the fold. It cleans up correctly, but it still consumes CPU during the most important loading window; defer it or reduce work until after first content.
- `SmartPlaylistCard` can create one interval per hovered card to cycle artwork. Cleanup exists, but hover grids should keep this behavior bounded and never start intervals for offscreen cards.
- Admin traffic and analytics routes fetch arrays for distinct counts or percentiles (`take: 5000` latency rows, distinct visitor rows, session rows). These are admin-only, but they can become memory/CPU spikes.
- `/library/artists` loads all browsable recordings and aggregates in JS. This is both a memory gap and a server CPU gap as the catalog grows.
- `/search/unified` returns rich result objects for autocomplete and full results. Suggestion use cases should not carry full song/playlist/profile payloads.
- `/playlists/random` uses `ORDER BY RAND()`, which is a database CPU moat gap rather than a memory issue.
- Several list routes parse `pageSize` directly without a maximum cap, including public users/playlists/recordings and multiple `/me` endpoints. Other routes already cap at 50 or 100, so this should be standardized.
- `express.json()` has an implicit default body limit, but it is not documented as intentional. Treat it as a policy and pin the limit explicitly.

## Inspection Findings

1. **Route code is eagerly imported**
   - `apps/web/src/App.tsx` imports public, auth, studio, and admin pages at startup.
   - Impact: public visitors download code for routes they may never open.
   - Recommendation: convert route elements to `React.lazy` chunks grouped by public, studio, admin, and theatre-heavy surfaces.

2. **Main bundle is oversized**
   - Current main JS is 738.4 kB minified and 198.6 kB gzip.
   - Impact: slower parse/compile on mobile even when network is acceptable.
   - Recommendation: add route-level code splitting first, then inspect remaining shared chunk composition.

3. **Theatre code has a lazy facade, but it needs guardrails**
   - `lazyController.ts` defers the real controller until theatre entry, which is good.
   - The emitted theatre `seed` chunk is still large at 327.7 kB.
   - Recommendation: preserve the lazy boundary, avoid preloading theatre chunks on ordinary playback, and consider splitting the liminalDoom raster head catalog from the full theatre registry.

4. **Favicon is too large**
   - `apps/web/src/images/favicon.png` is 239.5 kB and used for both favicon and Apple touch icon.
   - Impact: wasteful transfer for a tiny browser UI asset.
   - Recommendation: create a small favicon set (`32x32`, `180x180`) and keep large brand artwork out of `index.html`.

5. **Static web assets lack explicit cache policy**
   - `installWebApp()` uses `express.static(WEB_DIST, { index: false })`.
   - Impact: hashed assets are not guaranteed to receive long-lived immutable browser caching.
   - Recommendation: serve `/assets/*` with `Cache-Control: public, max-age=31536000, immutable`; serve `index.html` with `no-cache`.

6. **Uploads lack explicit cache policy**
   - `/uploads` is served with default `express.static`.
   - Impact: artwork/audio repeat visits may revalidate more often than needed.
   - Recommendation: use differentiated headers: immutable for content-addressed or never-mutated uploaded files, shorter TTL for mutable profile/cover URLs if filenames can be reused.

7. **No HTTP compression middleware is configured**
   - Express does not install `compression`.
   - Impact: API JSON, `index.html`, and non-precompressed assets rely on upstream platform behavior.
   - Recommendation: add compression or confirm Railway/proxy compression, then document it as an operational requirement.

8. **Homepage performs multiple independent data requests**
   - `HomePage` uses `/homepage`, top artists, top playlists, random playlists, and chart sections.
   - Impact: rich page, but multiple concurrent requests can extend final content readiness and increase database load.
   - Recommendation: add a purpose-built homepage aggregate endpoint or split critical vs below-the-fold sections with `enabled`/viewport-triggered queries.

9. **Homepage chart queries are not given longer stale times**
   - `useTopSongs`, `useTopPlaylists`, and `useTopArtists` use default 30 second stale time.
   - Impact: repeat navigation can refetch data that only needs minute-level freshness.
   - Recommendation: set chart/homepage stale times to 2-5 minutes; use explicit invalidation where editorial/admin changes require freshness.

10. **Homepage query is uncached on the server**
    - `/api/v1/homepage` rebuilds feature and newest release data per request.
    - Impact: unnecessary database work for mostly shared public content.
    - Recommendation: add short server cache headers or an in-process cache of 30-60 seconds, then invalidate on homepage admin writes.

11. **Above-the-fold images need priority rules**
    - Many `img` tags omit `loading`, `decoding`, `fetchPriority`, width/height, and `sizes`.
    - Impact: browser has less guidance for hero vs below-the-fold media.
    - Recommendation: make shared image components support `loading`, `decoding`, `fetchPriority`, and dimensions; mark only the primary hero image as eager/high.

12. **Generic card images are not lazy-loaded by default**
    - `MediaCover`, `SmartPlaylistCard`, `ArtistCard`, chart rows, and library rows often render raw images.
    - Impact: grids can start downloading many covers/avatars immediately.
    - Recommendation: default non-hero card images to `loading="lazy"` and `decoding="async"`; allow explicit override for first-row visible items.

13. **Search autocomplete duplicates the unified search work**
    - The top bar calls `/search/unified` for suggestions, and the full search page calls it again after navigation.
    - Impact: duplicate backend work and repeated transfer for the same query.
    - Recommendation: share query keys or seed the full search query from autocomplete results when navigating to `/search?q=...`.

14. **Unified search is broad and relationship-heavy**
    - `/search/unified` searches songs, playlists, artists, and genres with multiple `contains` filters and related includes.
    - Impact: acceptable at small scale, but likely to degrade as catalog grows.
    - Recommendation: add minimum query length for suggestions, separate lightweight suggestions from full results, and evaluate MySQL fulltext use for song/playlist/editorial text.

15. **Library songs default to 200 items**
    - `useLibrarySongs()` requests `pageSize: 200`.
    - Impact: large JSON payload and render cost on library or genre pages.
    - Recommendation: introduce pagination or virtualization; use smaller initial page sizes with "load more" for lower-risk rollout.

16. **Library artists endpoint scans all browsable recordings**
    - `/library/artists` loads matching recordings and aggregates in application memory.
    - Impact: grows with recording count and can slow the artists page.
    - Recommendation: replace with grouped SQL or materialized artist stats.

17. **Random playlists use `ORDER BY RAND()`**
    - `/playlists/random` selects random public playlists with `ORDER BY RAND()`.
    - Impact: expensive on larger playlist tables.
    - Recommendation: replace with a random offset/keyset strategy, precomputed random rank, or daily shuffled cache.

18. **Chart endpoints calculate from playback events on demand**
    - Top song/playlist/artist routes group playback events at request time.
    - Impact: indexes help, but high traffic/event volume can still become expensive.
    - Recommendation: add short cache headers first; later add rollup tables for daily/hourly chart counts.

19. **Auth bootstrap blocks final authenticated state**
    - `AuthProvider` loads local session immediately, then calls `/auth/me`.
    - Impact: good correctness, but authenticated users always incur a startup request.
    - Recommendation: render from cached session immediately as "stale authenticated", refresh in the background, and make protected routes handle refresh failure gracefully.

20. **No performance budget or repeatable measurement script exists**
    - Build output is visible, but there is no checked-in Lighthouse/WebPageTest/bundle-budget process.
    - Impact: regressions can slip in unnoticed.
    - Recommendation: add budgets for main JS, route chunks, CSS, image assets, and top API timings; run Lighthouse against production preview in CI or before releases.

21. **Large query payloads need cache lifetime policies**
    - TanStack Query uses a global `staleTime`, but large-detail queries do not define memory-oriented `gcTime`.
    - Impact: navigation across library/search/playlist/profile pages can keep large payloads resident longer than needed.
    - Recommendation: set shorter `gcTime` for high-cardinality pages and keep longer cache windows only for small shared metadata like tags/genres.

22. **Canvas and analyser systems need mobile heap budgets**
    - Visualizer and homepage canvas loops clean up, but canvas backing stores and analyser buffers can still be expensive on mobile.
    - Impact: page speed can suffer from CPU/heap pressure even after network is solved.
    - Recommendation: measure JS heap and frame time with visualizer on/off, cap DPR, and disable or defer decorative canvases during first load.

23. **Admin analytics can load rows into memory**
    - Admin traffic reads latency rows for percentile calculation and distinct visitor rows for counts.
    - Impact: admin-only, but still a server-resource gap when traffic tables grow.
    - Recommendation: calculate percentiles/distinct counts in SQL or rollup tables instead of loading arrays into Node.

24. **Traffic buffer is bounded but needs operational visibility**
    - The buffer drops oldest events once full and logs a warning.
    - Impact: this protects memory, but silent operational loss is possible if logs are missed.
    - Recommendation: expose dropped-event counts in health/admin metrics and alert when drops occur.

25. **Several list endpoints need page-size caps**
    - Public users/playlists/recordings and several `/me` routes use `Number(req.query.pageSize)` directly.
    - Impact: a large requested page size can create oversized database reads, JSON responses, and Node heap pressure.
    - Recommendation: add a shared `parsePageSize(raw, default, max)` helper and apply it consistently, likely maxing public/listener routes at 50 or 100.

26. **Request body limits should be explicit policy**
    - `express.json()` currently relies on Express defaults.
    - Impact: the default is protective, but implicit limits are easy to accidentally change or misunderstand.
    - Recommendation: set and document `express.json({ limit: "100kb" })` or the chosen API JSON limit.

27. **Object URL cleanup is currently healthy**
    - `getAudioDurationSeconds()` revokes object URLs in `finally`.
    - Impact: this avoids a common browser memory leak during upload metadata probing.
    - Recommendation: keep this pattern in any future image/audio preview code and add a small test or checklist item for preview cleanup.

## Proposed Implementation Plan

### Pass 1: Public Page Speed

Target: make first-time public visits feel instant by shrinking first-load work and delaying everything not visible yet.

- Add static/server cheap wins:
  - `/assets/*`: `public, max-age=31536000, immutable`.
  - `index.html` SPA fallback: `no-cache`.
  - `/uploads/*`: agreed TTL based on filename mutability.
- Enable or confirm gzip/Brotli compression for HTML, CSS, JS, and JSON.
- Replace the 239 kB favicon source with `32x32` favicon and `180x180` touch icon assets.
- Route-split from `App.tsx`:
  - public shell and homepage in the initial path.
  - Studio, admin, auth, profile/search/detail pages as lazy chunks.
  - theatre remains isolated behind user intent.
- Add image defaults to shared cover/avatar/card components:
  - `loading="lazy"` for cards and rows.
  - `decoding="async"` broadly.
  - `loading="eager"` and `fetchPriority="high"` only for true above-fold hero media.
- Lazy-load below-the-fold homepage rows and keep chart/discovery requests non-blocking.
- Defer homepage decorative canvas work until after first content.
- Add a small build budget check for initial JS, CSS, favicon size, and oversized chunks.
- Reduce obvious initial payloads:
  - library songs initial page from 200 to 50.
  - lightweight search suggestions separate from full search.
  - playlist/profile detail should avoid huge nested objects until needed.

Expected result: public visitors download app shell plus the route they can see, with card media and below-fold data delayed.

### Pass 2: Memory Guardrails

Target: keep page-speed wins from turning into client heap pressure.

- Add explicit `gcTime` for large or high-cardinality queries.
- Cap or normalize the audio player queue for large playlists.
- Measure visualizer/theatre/homepage canvas heap and frame cost on mobile.
- Pin JSON body limits explicitly.
- Add a shared server page-size parser and cap public/listener list endpoints before deeper database work.

Expected result: faster pages that do not retain more data or canvas memory than the user needs.

### Pass 3: Homepage and Search Request Shape

Target: keep rich surfaces responsive without making kitchen-sink payloads.

- Decide whether homepage should use:
  - one small critical endpoint for hero/editorial rows, and
  - deferred queries for below-the-fold charts/discovery sections.
- Cache `/homepage` and chart responses for short windows.
- Split search autocomplete from full search:
  - suggestions endpoint returns fewer fields and smaller images.
  - full search keeps richer result data.
- Reuse autocomplete query data on navigation when possible.

Expected result: homepage and search feel quicker while keeping editorial richness.

### Pass 4: Backend Scale Work

Target: keep page loads stable as catalog and traffic grow.

- Replace `/playlists/random` `ORDER BY RAND()` with a scalable selection strategy.
- Replace `/library/artists` in-memory aggregation with database grouping or denormalized artist stats.
- Add chart rollup tables once playback events become large enough that live grouping is visible in API timings.
- Review Prisma indexes against actual query plans for:
  - published public recordings sorted by title/published date.
  - playlist listing by visibility/status/published date.
  - playback event chart groupings.
  - search filters.
- Move admin traffic percentile/distinct visitor calculations into SQL or precomputed rollups.
- Add server-resource dashboards for Node memory, event loop delay, traffic buffer size/drops, DB query latency, and slow route counts.
- Document upload and JSON request-size policy alongside deployment env notes.

Expected result: fewer latency spikes on library, charts, random discovery, and search.

## Priority Order

1. Route splitting.
2. Image loading rules.
3. Static caching and compression.
4. Favicon cleanup.
5. Homepage and decorative work deferral.
6. Smaller initial API payloads.
7. Client memory stability: query `gcTime`, queue normalization/caps, and canvas/analyser budgets.
8. Server resources: response caching, query shape, random playlist strategy, library artist aggregation, chart rollups, and admin analytics rollups.
9. Operational visibility: slow route timing, bundle budgets, memory/event-loop metrics, and traffic buffer drop alerts.

## Measurement Plan

- Add a local measurement script:
  - `npm --prefix apps/web run build`
  - serve production app
  - run Lighthouse for `/`, `/search?q=rock`, `/library`, `/artists`, one playlist page, one artist page.
- Capture:
  - FCP, LCP, TBT, CLS, Speed Index.
  - total JS/CSS/image transfer.
  - number of API requests before first useful content.
  - slowest API timings from server logs.
- Add server timing instrumentation around high-impact routes:
  - `/api/v1/homepage`
  - `/api/v1/charts/top-songs`
  - `/api/v1/charts/top-playlists`
  - `/api/v1/charts/top-artists`
  - `/api/v1/search/unified`
  - `/api/v1/library/songs`
  - `/api/v1/library/artists`

## Risks and Tradeoffs

- Route splitting improves first load but can make route transitions feel slower if chunks are not prefetched intelligently.
- Longer client stale times improve perceived speed but can show older charts/editorial data briefly.
- Upload caching is only safe if media filenames are immutable or versioned.
- Homepage aggregation improves request count but can create a large endpoint if all below-the-fold sections are included.
- Fulltext/search improvements may require migrations and relevance tuning.

## Recommended Next Step

Start with Pass 1 as a single page-speed bundle. The highest-value work is route splitting, image policy, static caching/compression, favicon cleanup, homepage/decorative deferral, and smaller initial API payloads. Keep memory and server-resource fixes queued directly behind it, but do not let them displace the first-load budget work until public pages are under the target: initial public JS below 250 kB gzip, CSS below 25 kB gzip, and no non-visible route/media/data work on first visit.
