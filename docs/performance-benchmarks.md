# Performance Benchmarks

Date: 2026-06-06

These checks are the first automated performance guardrails for Playlisted. They are intentionally small and repeatable: one build-output gate for first-load cost, and one live HTTP benchmark for page/API timing.

## Benchmarks

### Asset Budget

Command:

```bash
npm run perf:assets
```

This reads `apps/web/dist` and checks the production build output:

- Initial public JS gzip: under 250 kB.
- CSS gzip: under 25 kB.
- Favicon assets: under 20 kB total loaded.

Use strict mode in CI:

```bash
npm run perf:assets -- --strict
```

### HTTP Timing

Command:

```bash
PERF_BASE_URL=http://127.0.0.1:4000 npm run perf:http
```

Default routes:

- `/`
- `/api/v1/health`
- `/api/v1/homepage`
- `/api/v1/search/suggestions?q=a&limit=5`

Default budgets:

- Public shell: p50 under 250 ms, p95 under 650 ms, body under 220 kB.
- Health API: p50 under 120 ms, p95 under 300 ms, body under 8 kB.
- Homepage API: p50 under 450 ms, p95 under 1,200 ms, body under 320 kB.
- Search suggestions API: p50 under 350 ms, p95 under 900 ms, body under 80 kB.

Write a JSON artifact:

```bash
PERF_BASE_URL=https://staging.example.com \
PERF_OUTPUT=performance-results/http-benchmark.json \
npm run perf:http
```

Run without failing on budget misses:

```bash
PERF_STRICT=0 npm run perf:http
```

## CI Recommendation

Use this as the cheap required gate:

```bash
npm run perf:ci
```

Run the HTTP benchmark as a deploy or staging check once a server is live:

```bash
PERF_BASE_URL=https://your-staging-url.example npm run perf:http
```

## Custom HTTP Benchmark Config

Set `PERF_BENCHMARKS` to a JSON file containing an array of benchmark objects:

```json
[
  {
    "name": "homepage api",
    "path": "/api/v1/homepage",
    "runs": 9,
    "warmup": 2,
    "expectedStatus": [200],
    "budgets": {
      "p50Ms": 450,
      "p95Ms": 1200,
      "bodyBytesMax": 320000
    }
  }
]
```

Keep budgets realistic: they should catch regressions without failing every time a laptop or staging database has a normal slow moment.

### Page Load Benchmark

Command:

```bash
PERF_BASE_URL=http://127.0.0.1:4000 npm run perf:pages
```

Strict command:

```bash
PERF_BASE_URL=http://127.0.0.1:4000 npm run perf:pages:strict
```

The runner uses Playwright Chromium and writes:

```text
reports/performance/page-load-latest.json
```

Default routes:

- `/`
- `/library`
- `/artists`
- `/search?q=rock`
- first public playlist detail route, when public playlist data exists
- first public artist detail route, when public artist data exists

Captured per route:

- total load time
- DOMContentLoaded
- first contentful paint, when available
- largest contentful paint, when available
- JS, CSS, and image transfer size
- API request count
- slowest API request
- failed requests

The first thresholds are intentionally forgiving. Non-strict mode fails on navigation failures or failed network requests. Massive transfer over 5 MB is reported as a warning so oversized images stay visible without blocking small-site iteration. Strict mode also fails when the homepage total load exceeds 2.5 seconds and treats massive transfer as a failure.

If Chromium is not installed:

```bash
npx playwright install chromium
```

On Linux or WSL, missing browser libraries can require:

```bash
npx playwright install-deps chromium
```
