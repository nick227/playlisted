import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const distDir = path.resolve(process.cwd(), "apps/web/dist");
const assetsDir = path.join(distDir, "assets");
const strict = process.env.WEB_BUDGET_STRICT === "1" || process.argv.includes("--strict");

const budgets = {
  initialJsGzip: 250 * 1024,
  cssGzip: 25 * 1024,
  faviconBytes: 20 * 1024,
};

function gzipSize(filePath) {
  return zlib.gzipSync(fs.readFileSync(filePath)).length;
}

function format(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

function findAsset(pattern) {
  if (!fs.existsSync(assetsDir)) return null;
  return fs.readdirSync(assetsDir).find((name) => pattern.test(name)) ?? null;
}

function check(label, actual, budget) {
  const ok = actual <= budget;
  const mark = ok ? "ok" : strict ? "fail" : "warn";
  console.log(`${mark}: ${label} ${format(actual)} / ${format(budget)}`);
  return ok;
}

if (!fs.existsSync(distDir)) {
  console.error("apps/web/dist does not exist. Run the web build first.");
  process.exit(1);
}

const mainJs = findAsset(/^index-.*\.js$/);
const mainCss = findAsset(/^index-.*\.css$/);
const faviconFiles = ["favicon.svg", "apple-touch-icon.svg"]
  .map((name) => path.join(distDir, name))
  .filter((filePath) => fs.existsSync(filePath));

let passed = true;

if (mainJs) {
  passed = check("initial public JS gzip", gzipSize(path.join(assetsDir, mainJs)), budgets.initialJsGzip) && passed;
} else {
  console.warn("warn: no index JS asset found");
}

if (mainCss) {
  passed = check("CSS gzip", gzipSize(path.join(assetsDir, mainCss)), budgets.cssGzip) && passed;
} else {
  console.warn("warn: no index CSS asset found");
}

if (faviconFiles.length > 0) {
  const faviconBytes = faviconFiles.reduce((sum, filePath) => sum + fs.statSync(filePath).size, 0);
  passed = check("favicon assets", faviconBytes, budgets.faviconBytes) && passed;
} else {
  console.warn("warn: no favicon assets found");
}

if (!passed && strict) {
  process.exit(1);
}
