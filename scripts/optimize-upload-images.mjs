import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const rootDir = path.resolve(process.cwd(), process.env.UPLOAD_IMAGES_DIR ?? "uploads/images");
const maxDimension = Number(process.env.IMAGE_MAX_DIMENSION ?? 1920);
const minSavingsBytes = Number(process.env.MIN_IMAGE_OPTIMIZE_SAVINGS_BYTES ?? 8 * 1024);
const write = process.argv.includes("--write");
const noBackup = process.argv.includes("--no-backup");
const backup = write && !noBackup;
const backupRoot = path.resolve(
  process.cwd(),
  process.env.IMAGE_OPTIMIZE_BACKUP_DIR ?? `reports/image-optimization-backups/${new Date().toISOString().replace(/[:.]/g, "-")}`,
);

const supported = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function outputForExtension(ext, pipeline) {
  if (ext === ".jpg" || ext === ".jpeg") {
    return pipeline.jpeg({ quality: 82, mozjpeg: true });
  }
  if (ext === ".webp") {
    return pipeline.webp({ quality: 82 });
  }
  return pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
}

async function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listImages(filePath));
    } else if (entry.isFile() && supported.has(path.extname(entry.name).toLowerCase())) {
      files.push(filePath);
    }
  }
  return files;
}

async function optimizeCandidate(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const original = await fsp.stat(filePath);
  let metadata;
  try {
    metadata = await sharp(filePath).metadata();
  } catch (error) {
    return {
      file: path.relative(process.cwd(), filePath),
      originalBytes: original.size,
      optimizedBytes: original.size,
      savingsBytes: 0,
      originalSize: "?x?",
      optimizedSize: "-",
      action: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
  const shouldResize =
    (metadata.width != null && metadata.width > maxDimension) ||
    (metadata.height != null && metadata.height > maxDimension);

  let pipeline = sharp(filePath).rotate();
  if (shouldResize) {
    pipeline = pipeline.resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const tempPath = `${filePath}.optimize-${process.pid}-${Date.now()}`;
  try {
    await outputForExtension(ext, pipeline).toFile(tempPath);
    const optimized = await fsp.stat(tempPath);
    const nextMetadata = await sharp(tempPath).metadata();
    const savings = original.size - optimized.size;
    const shouldReplace = shouldResize || savings >= minSavingsBytes;

    if (write && shouldReplace) {
      if (backup) {
        const relative = path.relative(rootDir, filePath);
        const backupPath = path.join(backupRoot, relative);
        await fsp.mkdir(path.dirname(backupPath), { recursive: true });
        await fsp.copyFile(filePath, backupPath);
      }
      await fsp.rename(tempPath, filePath);
    } else {
      await fsp.unlink(tempPath).catch(() => undefined);
    }

    return {
      file: path.relative(process.cwd(), filePath),
      originalBytes: original.size,
      optimizedBytes: optimized.size,
      savingsBytes: savings,
      originalSize: `${metadata.width ?? "?"}x${metadata.height ?? "?"}`,
      optimizedSize: `${nextMetadata.width ?? "?"}x${nextMetadata.height ?? "?"}`,
      action: shouldReplace ? (write ? "optimized" : "would optimize") : "skip",
    };
  } catch (error) {
    await fsp.unlink(tempPath).catch(() => undefined);
    return {
      file: path.relative(process.cwd(), filePath),
      originalBytes: original.size,
      optimizedBytes: original.size,
      savingsBytes: 0,
      originalSize: `${metadata.width ?? "?"}x${metadata.height ?? "?"}`,
      optimizedSize: "-",
      action: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
Usage:
  npm run uploads:images:scan
  npm run uploads:images:optimize

Options:
  --write       Rewrite files in place.
  --no-backup   Do not copy originals to reports/image-optimization-backups before rewriting.

Environment:
  UPLOAD_IMAGES_DIR              Directory to scan. Default: uploads/images
  IMAGE_MAX_DIMENSION            Max width/height. Default: 1920
  MIN_IMAGE_OPTIMIZE_SAVINGS_BYTES Minimum byte savings to rewrite when dimensions are already OK. Default: 8192
  IMAGE_OPTIMIZE_BACKUP_DIR      Backup directory for --write runs.
`);
  process.exit(0);
}

const files = await listImages(rootDir);
const results = [];

for (const file of files) {
  results.push(await optimizeCandidate(file));
}

const actionable = results
  .filter((item) => item.action !== "skip")
  .sort((a, b) => b.savingsBytes - a.savingsBytes);
const errors = results.filter((item) => item.action === "error");

console.table(actionable.slice(0, 40).map((item) => ({
  file: item.file,
  from: item.originalSize,
  to: item.optimizedSize,
  before: formatBytes(item.originalBytes),
  after: formatBytes(item.optimizedBytes),
  saved: formatBytes(Math.max(0, item.savingsBytes)),
  action: item.action,
  error: item.error ?? "",
})));

const totalBefore = results.reduce((sum, item) => sum + item.originalBytes, 0);
const totalAfter = results.reduce((sum, item) => sum + (item.action === "skip" ? item.originalBytes : item.optimizedBytes), 0);
const totalSavings = totalBefore - totalAfter;

console.log(`Scanned ${results.length} image(s).`);
console.log(`${write ? "Optimized" : "Would optimize"} ${actionable.filter((item) => item.action !== "error").length} image(s).`);
console.log(`Potential savings: ${formatBytes(Math.max(0, totalSavings))}.`);
if (errors.length > 0) {
  console.log(`Skipped ${errors.length} undecodable image file(s):`);
  for (const item of errors.slice(0, 10)) {
    console.log(`- ${item.file}: ${item.error}`);
  }
}
if (backup) {
  console.log(`Backups: ${path.relative(process.cwd(), backupRoot)}`);
}
if (!write) {
  console.log("Dry run only. Run npm run uploads:images:optimize to rewrite files in place.");
}
