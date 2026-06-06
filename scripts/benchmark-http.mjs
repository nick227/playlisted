import fs from "node:fs";
import { performance } from "node:perf_hooks";

const baseUrl = (process.env.PERF_BASE_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");
const timeoutMs = Number(process.env.PERF_TIMEOUT_MS ?? 10_000);
const outputPath = process.env.PERF_OUTPUT ?? "";
const strict = process.env.PERF_STRICT !== "0";

const defaultBenchmarks = [
  {
    name: "public shell",
    path: "/",
    runs: 7,
    warmup: 2,
    expectedStatus: [200],
    budgets: { p50Ms: 250, p95Ms: 650, bodyBytesMax: 220_000 },
  },
  {
    name: "health api",
    path: "/api/v1/health",
    runs: 7,
    warmup: 2,
    expectedStatus: [200],
    budgets: { p50Ms: 120, p95Ms: 300, bodyBytesMax: 8_000 },
  },
  {
    name: "homepage api",
    path: "/api/v1/homepage",
    runs: 7,
    warmup: 2,
    expectedStatus: [200],
    budgets: { p50Ms: 450, p95Ms: 1_200, bodyBytesMax: 320_000 },
  },
  {
    name: "search suggestions api",
    path: "/api/v1/search/suggestions?q=a&limit=5",
    runs: 7,
    warmup: 2,
    expectedStatus: [200],
    budgets: { p50Ms: 350, p95Ms: 900, bodyBytesMax: 80_000 },
  },
];

function loadBenchmarks() {
  const configPath = process.env.PERF_BENCHMARKS;
  if (!configPath) return defaultBenchmarks;

  const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected ${configPath} to contain a JSON array.`);
  }
  return parsed;
}

function percentile(values, percentileValue) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return sorted[index];
}

function formatMs(value) {
  return `${value.toFixed(1)}ms`;
}

function formatBytes(value) {
  if (value < 1024) return `${value} B`;
  return `${(value / 1024).toFixed(1)} kB`;
}

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

async function requestOnce(benchmark) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();

  try {
    const response = await fetch(buildUrl(benchmark.path), {
      method: benchmark.method ?? "GET",
      headers: benchmark.headers ?? undefined,
      body: benchmark.body ? JSON.stringify(benchmark.body) : undefined,
      signal: controller.signal,
    });
    const bytes = Buffer.byteLength(await response.text());
    return {
      ms: performance.now() - started,
      status: response.status,
      bytes,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function assertStatus(benchmark, sample) {
  const expected = benchmark.expectedStatus ?? [200];
  return expected.includes(sample.status);
}

function evaluateBudget(label, actual, max, formatter) {
  if (max == null) return { ok: true, text: "" };
  const ok = actual <= max;
  const mark = ok ? "ok" : "fail";
  return {
    ok,
    text: `${mark}: ${label} ${formatter(actual)} / ${formatter(max)}`,
  };
}

async function runBenchmark(benchmark) {
  const warmup = benchmark.warmup ?? 1;
  const runs = benchmark.runs ?? 5;

  for (let index = 0; index < warmup; index += 1) {
    await requestOnce(benchmark);
  }

  const samples = [];
  let statusPassed = true;
  for (let index = 0; index < runs; index += 1) {
    const sample = await requestOnce(benchmark);
    if (!assertStatus(benchmark, sample)) {
      statusPassed = false;
    }
    samples.push(sample);
  }

  const times = samples.map((sample) => sample.ms);
  const bodyBytesMax = Math.max(...samples.map((sample) => sample.bytes));
  const statuses = [...new Set(samples.map((sample) => sample.status))];
  const result = {
    name: benchmark.name,
    path: benchmark.path,
    runs,
    statuses,
    p50Ms: percentile(times, 50),
    p95Ms: percentile(times, 95),
    minMs: Math.min(...times),
    maxMs: Math.max(...times),
    bodyBytesMax,
    budgets: benchmark.budgets ?? {},
  };

  const checks = [
    {
      ok: statusPassed,
      text: `${statusPassed ? "ok" : "fail"}: status ${statuses.join(", ")} / ${(benchmark.expectedStatus ?? [200]).join(", ")}`,
    },
    evaluateBudget("p50", result.p50Ms, result.budgets.p50Ms, formatMs),
    evaluateBudget("p95", result.p95Ms, result.budgets.p95Ms, formatMs),
    evaluateBudget("body", result.bodyBytesMax, result.budgets.bodyBytesMax, formatBytes),
  ];

  return {
    ...result,
    passed: checks.every((check) => check.ok),
    checks: checks.map((check) => check.text).filter(Boolean),
  };
}

const startedAt = new Date().toISOString();
const benchmarks = loadBenchmarks();
const results = [];
let passed = true;

console.log(`Benchmarking ${baseUrl}`);

for (const benchmark of benchmarks) {
  const result = await runBenchmark(benchmark);
  results.push(result);
  passed = result.passed && passed;

  console.log(`\n${result.passed ? "ok" : "fail"}: ${result.name}`);
  console.log(`  ${benchmark.method ?? "GET"} ${result.path} -> ${result.statuses.join(", ")}`);
  console.log(`  p50 ${formatMs(result.p50Ms)}, p95 ${formatMs(result.p95Ms)}, body max ${formatBytes(result.bodyBytesMax)}`);
  for (const check of result.checks) {
    console.log(`  ${check}`);
  }
}

if (outputPath) {
  const outputDir = outputPath.split(/[\\/]/).slice(0, -1).join("/");
  if (outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify({ baseUrl, startedAt, passed, results }, null, 2)}\n`,
  );
}

if (!passed && strict) {
  process.exit(1);
}
