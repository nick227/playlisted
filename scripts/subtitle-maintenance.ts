import "dotenv/config";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { Prisma, PrismaClient } from "@prisma/client";

import { r2PublicUrlForKey, uploadFileToR2 } from "../src/lib/storage/r2Storage.js";

const requiredConfirm = "SUBTITLE_MAINTENANCE";
const legacyOrigin = (process.env.LEGACY_UPLOADS_PUBLIC_ORIGIN ?? process.env.PROD_PUBLIC_ORIGIN ?? "").replace(/\/$/, "");
const r2BaseUrl = (process.env.R2_PUBLIC_BASE_URL ?? process.env.UPLOADS_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
const maxBytes = Number(process.env.SUBTITLE_MAINTENANCE_MAX_BYTES ?? 100_000_000);
let prisma: PrismaClient;

type Command = "list" | "migrate" | "queue" | "status" | "inspect" | "delete-legacy" | "help";

type Args = {
  command: Command;
  id?: string;
  limit: number;
  apply: boolean;
  deleteLegacy: boolean;
  legacyOnly: boolean;
  includeReady: boolean;
};

const args = parseArgs();

function parseArgs(): Args {
  const args: Args = {
    command: "help",
    limit: 20,
    apply: false,
    deleteLegacy: false,
    legacyOnly: false,
    includeReady: false,
  };

  const [command, ...rest] = process.argv.slice(2);
  if (
    command === "list" ||
    command === "migrate" ||
    command === "queue" ||
    command === "status" ||
    command === "inspect" ||
    command === "delete-legacy" ||
    command === "help"
  ) {
    args.command = command;
  } else if (command) {
    throw new Error(`Unknown command: ${command}`);
  }

  for (const arg of rest) {
    if (arg === "--apply") args.apply = true;
    else if (arg === "--delete-legacy") args.deleteLegacy = true;
    else if (arg === "--legacy-only") args.legacyOnly = true;
    else if (arg === "--include-ready") args.includeReady = true;
    else if (arg.startsWith("--id=")) args.id = arg.slice("--id=".length);
    else if (arg.startsWith("--limit=")) args.limit = Math.max(1, Math.min(25, Number(arg.slice("--limit=".length)) || 20));
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function validateDatabaseTarget() {
  const mysqlPublicUrl = process.env.MYSQL_PUBLIC_URL;
  if (!mysqlPublicUrl && process.env.SUBTITLE_MAINTENANCE_ALLOW_DATABASE_URL !== "true") {
    throw new Error("MYSQL_PUBLIC_URL is required for subtitle maintenance. Refusing to fall back to DATABASE_URL.");
  }

  if (!mysqlPublicUrl) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required when SUBTITLE_MAINTENANCE_ALLOW_DATABASE_URL=true.");
    }
    validateMysqlUrl(databaseUrl, "DATABASE_URL", { allowInternalHost: true });
    validateMaxBytes();
    return;
  }

  validateMysqlUrl(mysqlPublicUrl, "MYSQL_PUBLIC_URL", { allowInternalHost: false });
  validateMaxBytes();
  process.env.DATABASE_URL = mysqlPublicUrl;
}

function validateMysqlUrl(value: string, name: string, options: { allowInternalHost: boolean }) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} is not a valid URL.`);
  }

  if (parsed.protocol !== "mysql:") {
    throw new Error(`${name} must use the mysql:// protocol.`);
  }
  if (
    !options.allowInternalHost &&
    (!parsed.hostname || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
  ) {
    throw new Error(`${name} must point at the Railway public MySQL host, not localhost.`);
  }
  if (!parsed.pathname || parsed.pathname === "/") {
    throw new Error(`${name} must include the database name in the path.`);
  }
}

function validateMaxBytes() {
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) {
    throw new Error("SUBTITLE_MAINTENANCE_MAX_BYTES must be a positive number.");
  }
}

function requireApplyConfirmation(apply: boolean) {
  if (!apply) return;
  if (process.env.SUBTITLE_MAINTENANCE_CONFIRM !== requiredConfirm) {
    throw new Error(
      `Refusing to mutate prod data. Set SUBTITLE_MAINTENANCE_CONFIRM=${requiredConfirm} and pass --apply.`,
    );
  }
}

async function appendAudit(event: string, details: Record<string, unknown>) {
  const auditPath = process.env.SUBTITLE_MAINTENANCE_AUDIT_LOG ?? "logs/subtitle-maintenance.jsonl";
  const line = JSON.stringify({ event, ts: new Date().toISOString(), ...details });
  await fs.mkdir(path.dirname(auditPath), { recursive: true });
  await fs.appendFile(auditPath, `${line}\n`);
}

function requireLegacyOrigin() {
  if (!legacyOrigin) {
    throw new Error("LEGACY_UPLOADS_PUBLIC_ORIGIN or PROD_PUBLIC_ORIGIN is required for /uploads migration.");
  }
}

function requireR2PublicBase() {
  if (!r2BaseUrl) {
    throw new Error("R2_PUBLIC_BASE_URL or UPLOADS_PUBLIC_BASE_URL is required.");
  }
}

function requireR2UploadEnv() {
  requireR2PublicBase();
  for (const name of ["R2_BUCKET_NAME", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"]) {
    if (!process.env[name]) throw new Error(`${name} is required for R2 upload.`);
  }
  if (!process.env.R2_ENDPOINT && !process.env.R2_ACCOUNT_ID) {
    throw new Error("R2_ENDPOINT or R2_ACCOUNT_ID is required for R2 upload.");
  }
}

function usage() {
  console.log(`Subtitle maintenance

MYSQL_PUBLIC_URL is required locally and is copied into DATABASE_URL by this script.
For Railway-volume cleanup only, set SUBTITLE_MAINTENANCE_ALLOW_DATABASE_URL=true to use DATABASE_URL.
Use LEGACY_UPLOADS_PUBLIC_ORIGIN=https://your-prod-host for /uploads/... files.
Use R2_* env vars for R2 upload and public verification.
Set SUBTITLE_MAINTENANCE_MAX_BYTES to override the default 100000000-byte safety cap.

Commands:
  list [--limit=20] [--legacy-only]
  migrate --id=<recordingId> [--apply] [--delete-legacy]
  migrate --limit=5 [--apply] [--delete-legacy]
  queue --id=<recordingId> [--apply] [--include-ready]
  queue --limit=5 [--apply]
  status
  inspect --id=<recordingId>
  delete-legacy --id=<recordingId> [--apply]
  delete-legacy --limit=5 [--apply]

Apply guard:
  SUBTITLE_MAINTENANCE_CONFIRM=${requiredConfirm} npm run subtitles:maintenance -- migrate --id=... --apply

Legacy deletion:
  --delete-legacy also requires LEGACY_DELETE_UPLOADS_DIR and only deletes files from that mounted uploads root.
`);
}

function isLegacyUploadUrl(audioUrl: string) {
  return audioUrl.startsWith("/uploads/");
}

function isR2Url(audioUrl: string) {
  return Boolean(r2BaseUrl && audioUrl.startsWith(`${r2BaseUrl}/`));
}

function legacyDownloadUrl(audioUrl: string) {
  if (/^https?:\/\//i.test(audioUrl)) return audioUrl;
  if (!isLegacyUploadUrl(audioUrl)) {
    throw new Error(`Recording audioUrl is not a legacy /uploads path: ${audioUrl}`);
  }
  requireLegacyOrigin();
  return `${legacyOrigin}${audioUrl}`;
}

function extensionContentType(filename: string, existing: string | null) {
  if (existing) return existing;
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".m4a") return "audio/mp4";
  if (ext === ".aac") return "audio/aac";
  if (ext === ".ogg") return "audio/ogg";
  return "application/octet-stream";
}

function legacyR2Key(recordingId: string, audioUrl: string) {
  const pathname = /^https?:\/\//i.test(audioUrl) ? new URL(audioUrl).pathname : audioUrl;
  const filename = path.basename(pathname) || `${recordingId}.audio`;
  return `audio/legacy/${recordingId}/${filename}`;
}

function legacyRelativePath(audioUrl: string) {
  const pathname = /^https?:\/\//i.test(audioUrl) ? new URL(audioUrl).pathname : audioUrl;
  const match = /^\/uploads\/(audio|images)\/([^/?#]+)$/.exec(pathname);
  if (!match) {
    throw new Error(`Cannot derive legacy upload path from ${audioUrl}`);
  }
  return `${match[1]}/${decodeURIComponent(match[2])}`;
}

function inferLegacyRelativePath(recordingId: string, audioUrl: string) {
  if (isLegacyUploadUrl(audioUrl) || /^https?:\/\/[^/]+\/uploads\//i.test(audioUrl)) {
    return legacyRelativePath(audioUrl);
  }

  const pathname = /^https?:\/\//i.test(audioUrl) ? new URL(audioUrl).pathname : audioUrl;
  const legacyPrefix = `/audio/legacy/${recordingId}/`;
  if (pathname.startsWith(legacyPrefix)) {
    const filename = decodeURIComponent(pathname.slice(legacyPrefix.length));
    if (!filename || filename.includes("/")) {
      throw new Error(`Cannot infer legacy upload filename from ${audioUrl}`);
    }
    return `audio/${filename}`;
  }

  throw new Error(`Cannot infer legacy upload path from ${audioUrl}`);
}

async function deleteLegacyUpload(audioUrl: string) {
  const uploadsDir = process.env.LEGACY_DELETE_UPLOADS_DIR;
  if (!uploadsDir) {
    throw new Error("LEGACY_DELETE_UPLOADS_DIR is required with --delete-legacy.");
  }

  const root = path.resolve(uploadsDir);
  const relative = legacyRelativePath(audioUrl);
  const filePath = path.resolve(root, relative);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Resolved legacy delete path escapes LEGACY_DELETE_UPLOADS_DIR.");
  }

  const before = await fs.stat(filePath).catch(() => null);
  if (!before?.isFile()) {
    return {
      deleted: false,
      reason: "not_found",
      relative,
      filePath,
      bytes: null,
    };
  }

  await fs.unlink(filePath);
  return {
    deleted: true,
    reason: null,
    relative,
    filePath,
    bytes: before.size,
  };
}

async function deleteLegacyRelativePath(relative: string) {
  const uploadsDir = process.env.LEGACY_DELETE_UPLOADS_DIR;
  if (!uploadsDir) {
    throw new Error("LEGACY_DELETE_UPLOADS_DIR is required for legacy deletion.");
  }

  if (!/^(audio|images)\/[^/?#]+$/.test(relative)) {
    throw new Error(`Refusing unsafe legacy relative path: ${relative}`);
  }

  const root = path.resolve(uploadsDir);
  const filePath = path.resolve(root, relative);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Resolved legacy delete path escapes LEGACY_DELETE_UPLOADS_DIR.");
  }

  const before = await fs.stat(filePath).catch(() => null);
  if (!before?.isFile()) {
    return {
      deleted: false,
      reason: "not_found",
      relative,
      filePath,
      bytes: null,
    };
  }

  await fs.unlink(filePath);
  return {
    deleted: true,
    reason: null,
    relative,
    filePath,
    bytes: before.size,
  };
}

async function resolveLegacyDeleteCandidate(relative: string) {
  const uploadsDir = process.env.LEGACY_DELETE_UPLOADS_DIR;
  if (!uploadsDir) {
    throw new Error("LEGACY_DELETE_UPLOADS_DIR is required for legacy deletion.");
  }

  if (!/^(audio|images)\/[^/?#]+$/.test(relative)) {
    throw new Error(`Refusing unsafe legacy relative path: ${relative}`);
  }

  const root = path.resolve(uploadsDir);
  const filePath = path.resolve(root, relative);
  if (filePath !== root && !filePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Resolved legacy delete path escapes LEGACY_DELETE_UPLOADS_DIR.");
  }

  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat?.isFile()) {
    return {
      exists: false,
      relative,
      filePath,
      bytes: null,
      sha256: null,
    };
  }

  if (stat.size > maxBytes) {
    throw new Error(`Refusing to hash/delete ${stat.size} bytes; cap is ${maxBytes}.`);
  }

  const body = await fs.readFile(filePath);
  return {
    exists: true,
    relative,
    filePath,
    bytes: stat.size,
    sha256: crypto.createHash("sha256").update(body).digest("hex"),
  };
}

async function downloadToTemp(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Legacy download failed (${response.status}): ${response.statusText}`);
  }
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`Refusing to download ${contentLength} bytes; cap is ${maxBytes}.`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length === 0) throw new Error("Legacy download returned an empty file.");
  if (buffer.length > maxBytes) {
    throw new Error(`Refusing to process ${buffer.length} bytes; cap is ${maxBytes}.`);
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "playlisted-maintenance-"));
  const filePath = path.join(tempDir, "audio");
  await fs.writeFile(filePath, buffer);

  return {
    filePath,
    bytes: buffer.length,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    cleanup: async () => {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    },
  };
}

async function sha256FromPublicUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`R2 public hash verification failed (${response.status}): ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length > maxBytes) {
    throw new Error(`Refusing to hash ${buffer.length} bytes from R2; cap is ${maxBytes}.`);
  }
  return {
    bytes: buffer.length,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
  };
}

async function verifyPublicUrl(url: string, expectedBytes?: number | null) {
  const head = await fetch(url, { method: "HEAD" }).catch(() => null);
  if (head?.ok) {
    const length = Number(head.headers.get("content-length"));
    return {
      method: "HEAD",
      ok: expectedBytes == null || !Number.isFinite(length) || length === expectedBytes,
      status: head.status,
      bytes: Number.isFinite(length) ? length : null,
    };
  }

  const response = await fetch(url, { headers: { Range: "bytes=0-0" } });
  if (!response.ok && response.status !== 206) {
    return { method: "GET", ok: false, status: response.status, bytes: null };
  }
  const lengthHeader = response.headers.get("content-range") ?? response.headers.get("content-length");
  const match = /\/(\d+)$/.exec(lengthHeader ?? "");
  const bytes = match ? Number(match[1]) : Number(response.headers.get("content-length"));
  return {
    method: "GET",
    ok: expectedBytes == null || !Number.isFinite(bytes) || bytes === expectedBytes,
    status: response.status,
    bytes: Number.isFinite(bytes) ? bytes : null,
  };
}

async function findRecordingsForMigration(limit: number) {
  return prisma.recording.findMany({
    where: {
      recordingType: "SONG",
      audioUrl: { startsWith: "/uploads/" },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: { subtitle: true },
  });
}

async function list(args: Args) {
  const rows = await prisma.recording.findMany({
    where: {
      recordingType: "SONG",
      ...(args.legacyOnly ? { audioUrl: { startsWith: "/uploads/" } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: args.limit,
    include: { subtitle: true },
  });

  console.log(`Found ${rows.length} song(s):`);
  for (const row of rows) {
    const location = isLegacyUploadUrl(row.audioUrl) ? "legacy" : isR2Url(row.audioUrl) ? "r2" : "remote";
    const subtitle = row.subtitle?.status ?? "NOT_QUEUED";
    console.log(
      [
        row.id,
        `"${row.title}"`,
        `location=${location}`,
        `subtitle=${subtitle}`,
        `duration=${row.durationSeconds ?? "?"}s`,
        `bytes=${row.audioBytes?.toString() ?? "?"}`,
        row.audioUrl,
      ].join(" | "),
    );
  }
}

async function migrateOne(recordingId: string, apply: boolean, fullHashVerify: boolean, deleteLegacy: boolean) {
  const recording = await prisma.recording.findUnique({
    where: { id: recordingId },
    include: { subtitle: true },
  });
  if (!recording) throw new Error(`Recording not found: ${recordingId}`);
  if (!isLegacyUploadUrl(recording.audioUrl)) {
    console.log(`${recording.id} "${recording.title}" is not legacy-backed: ${recording.audioUrl}`);
    return;
  }

  const sourceUrl = legacyDownloadUrl(recording.audioUrl);
  const targetKey = legacyR2Key(recording.id, recording.audioUrl);
  const targetUrl = r2PublicUrlForKey(targetKey);
  const contentType = extensionContentType(recording.audioUrl, recording.audioMimeType);

  console.log(`\nRecording: ${recording.id} "${recording.title}"`);
  console.log(`Source: ${sourceUrl}`);
  console.log(`Target: ${targetUrl}`);
  console.log(`Mode: ${apply ? "apply" : "dry-run"}`);
  if (deleteLegacy) console.log("Delete legacy after verify: requested");

  const downloaded = await downloadToTemp(sourceUrl);
  try {
    console.log(`Downloaded: bytes=${downloaded.bytes} sha256=${downloaded.sha256}`);
    await appendAudit("legacy_downloaded", {
      recordingId: recording.id,
      title: recording.title,
      sourceUrl,
      targetKey,
      targetUrl,
      bytes: downloaded.bytes,
      sha256: downloaded.sha256,
      apply,
    });

    if (!apply) {
      console.log("Dry run complete. R2 was not written and DB was not updated.");
      return;
    }

    await uploadFileToR2({ key: targetKey, filePath: downloaded.filePath, contentType });
    console.log("Uploaded to R2.");
    await appendAudit("r2_uploaded", {
      recordingId: recording.id,
      sourceUrl,
      targetKey,
      targetUrl,
      bytes: downloaded.bytes,
      sha256: downloaded.sha256,
      contentType,
    });

    const verification = await verifyPublicUrl(targetUrl, downloaded.bytes);
    console.log(`Verified public URL: ok=${verification.ok} method=${verification.method} status=${verification.status} bytes=${verification.bytes ?? "?"}`);
    if (!verification.ok) {
      throw new Error("R2 public URL verification failed; DB was not updated.");
    }
    await appendAudit("r2_public_url_verified", {
      recordingId: recording.id,
      targetUrl,
      verification,
      expectedBytes: downloaded.bytes,
    });

    if (fullHashVerify) {
      const publicHash = await sha256FromPublicUrl(targetUrl);
      const hashMatches = publicHash.bytes === downloaded.bytes && publicHash.sha256 === downloaded.sha256;
      console.log(
        `Verified public hash: ok=${hashMatches} bytes=${publicHash.bytes} sha256=${publicHash.sha256}`,
      );
      if (!hashMatches) {
        throw new Error("R2 public hash verification failed; DB was not updated.");
      }
      await appendAudit("r2_public_hash_verified", {
        recordingId: recording.id,
        targetUrl,
        bytes: publicHash.bytes,
        sha256: publicHash.sha256,
        ok: hashMatches,
      });
    }

    const updated = await prisma.recording.updateMany({
      where: { id: recording.id, audioUrl: recording.audioUrl },
      data: {
        audioUrl: targetUrl,
        audioBytes: BigInt(downloaded.bytes),
        audioMimeType: contentType,
      },
    });
    if (updated.count !== 1) {
      throw new Error("DB update did not match exactly one recording; source may have changed.");
    }
    console.log(`Updated DB audioUrl. Legacy Railway file ${deleteLegacy ? "delete is next." : "was not deleted."}`);
    await appendAudit("db_audio_url_updated", {
      recordingId: recording.id,
      previousAudioUrl: recording.audioUrl,
      nextAudioUrl: targetUrl,
      bytes: downloaded.bytes,
      contentType,
    });

    if (deleteLegacy) {
      const deleted = await deleteLegacyUpload(recording.audioUrl);
      console.log(
        `Deleted legacy file: deleted=${deleted.deleted} reason=${deleted.reason ?? "none"} relative=${deleted.relative} bytes=${deleted.bytes ?? "?"}`,
      );
      await appendAudit("legacy_deleted", {
        recordingId: recording.id,
        previousAudioUrl: recording.audioUrl,
        ...deleted,
      });
    }
  } finally {
    await downloaded.cleanup();
  }
}

async function migrate(args: Args) {
  requireApplyConfirmation(args.apply);
  requireLegacyOrigin();
  if (args.deleteLegacy && !args.apply) {
    throw new Error("--delete-legacy requires --apply.");
  }
  if (args.deleteLegacy && !process.env.LEGACY_DELETE_UPLOADS_DIR) {
    throw new Error("LEGACY_DELETE_UPLOADS_DIR is required with --delete-legacy.");
  }
  if (args.apply) requireR2UploadEnv();
  else requireR2PublicBase();

  if (args.id) {
    await migrateOne(args.id, args.apply, true, args.deleteLegacy);
    return;
  }

  const rows = await findRecordingsForMigration(args.limit);
  if (rows.length === 0) {
    console.log("No legacy /uploads song recordings found.");
    return;
  }
  console.log(
    `Migrating ${rows.length} legacy audio file(s) serially with limit=${args.limit}. This migrates storage only; subtitle status is not used as a filter.`,
  );
  for (const row of rows) {
    await migrateOne(row.id, args.apply, false, args.deleteLegacy);
  }
}

async function queueOne(recordingId: string, apply: boolean, includeReady: boolean) {
  const recording = await prisma.recording.findUnique({
    where: { id: recordingId },
    include: { subtitle: true },
  });
  if (!recording) throw new Error(`Recording not found: ${recordingId}`);
  if (!isR2Url(recording.audioUrl) && !/^https?:\/\//i.test(recording.audioUrl)) {
    throw new Error(`Refusing to queue non-remote audioUrl for ${recording.id}: ${recording.audioUrl}`);
  }
  if (!isR2Url(recording.audioUrl)) {
    console.warn(`Warning: ${recording.id} is remote-backed but not on the configured R2 public base.`);
  }

  console.log(`\nQueue: ${recording.id} "${recording.title}" subtitle=${recording.subtitle?.status ?? "NOT_QUEUED"} audioUrl=${recording.audioUrl}`);
  if (!apply) {
    console.log("Dry run complete. Subtitle row was not changed.");
    return;
  }

  if (!recording.subtitle) {
    await prisma.recordingSubtitle.create({
      data: { recordingId: recording.id, status: "QUEUED" },
    });
    console.log("Created QUEUED subtitle row.");
    return;
  }

  if (recording.subtitle.status === "READY" && !includeReady) {
    console.log("Already READY; skipped. Use --include-ready to intentionally requeue.");
    return;
  }

  await prisma.recordingSubtitle.update({
    where: { id: recording.subtitle.id },
    data: {
      status: "QUEUED",
      language: null,
      segments: Prisma.JsonNull,
      vttText: null,
      errorMessage: null,
      generatedAt: null,
    },
  });
  console.log("Set subtitle row to QUEUED.");
}

async function queue(args: Args) {
  requireApplyConfirmation(args.apply);
  requireR2PublicBase();
  if (args.id) {
    await queueOne(args.id, args.apply, args.includeReady);
    return;
  }
  if (args.includeReady) {
    throw new Error("--include-ready is only allowed with queue --id. Batch queue intentionally excludes READY rows.");
  }

  const rows = await prisma.recording.findMany({
    where: {
      recordingType: "SONG",
      OR: [
        { subtitle: null },
        { subtitle: { status: "FAILED" as const } },
      ],
      audioUrl: { startsWith: `${r2BaseUrl}/` },
    },
    orderBy: { createdAt: "asc" },
    take: args.limit,
    include: { subtitle: true },
  });

  if (rows.length === 0) {
    console.log("No eligible remote-backed songs found to queue.");
    return;
  }
  console.log(`Queueing ${rows.length} song(s) serially with limit=${args.limit}.`);
  for (const row of rows) {
    await queueOne(row.id, args.apply, args.includeReady);
  }
}

async function status() {
  const [songs, legacySongs, subtitles, byStatus] = await Promise.all([
    prisma.recording.count({ where: { recordingType: "SONG" } }),
    prisma.recording.count({ where: { recordingType: "SONG", audioUrl: { startsWith: "/uploads/" } } }),
    prisma.recordingSubtitle.count(),
    prisma.recordingSubtitle.groupBy({ by: ["status"], _count: { status: true } }),
  ]);
  console.log(`Songs: ${songs}`);
  console.log(`Legacy /uploads songs: ${legacySongs}`);
  console.log(`Subtitle rows: ${subtitles}`);
  console.log("Subtitle statuses:");
  for (const row of byStatus) {
    console.log(`  ${row.status}: ${row._count.status}`);
  }
}

async function inspect(args: Args) {
  if (!args.id) {
    throw new Error("inspect requires --id=<recordingId>.");
  }

  const recording = await prisma.recording.findUnique({
    where: { id: args.id },
    include: {
      subtitle: {
        include: {
          attempts: {
            orderBy: { startedAt: "desc" },
            take: args.limit,
          },
        },
      },
    },
  });

  if (!recording) throw new Error(`Recording not found: ${args.id}`);

  const location = isLegacyUploadUrl(recording.audioUrl) ? "legacy" : isR2Url(recording.audioUrl) ? "r2" : "remote";
  console.log(`Recording: ${recording.id} "${recording.title}"`);
  console.log(`Audio: location=${location} bytes=${recording.audioBytes?.toString() ?? "?"} duration=${recording.durationSeconds ?? "?"}s`);
  console.log(`URL: ${recording.audioUrl}`);

  if (!recording.subtitle) {
    console.log("Subtitle: NOT_QUEUED");
    return;
  }

  console.log(
    `Subtitle: ${recording.subtitle.status} language=${recording.subtitle.language ?? "?"} generatedAt=${recording.subtitle.generatedAt?.toISOString() ?? "?"} error=${recording.subtitle.errorMessage ?? "none"}`,
  );
  console.log(`Segments: ${Array.isArray(recording.subtitle.segments) ? recording.subtitle.segments.length : "?"}`);

  if (recording.subtitle.attempts.length === 0) {
    console.log("Attempts: none");
    return;
  }

  console.log("Attempts:");
  for (const attempt of recording.subtitle.attempts) {
    const cost = attempt.costCents == null ? "" : ` cost=${attempt.costCents}c`;
    const duration = attempt.durationMs == null ? "" : ` durationMs=${attempt.durationMs}`;
    const inputDuration = attempt.inputDurationSeconds == null ? "" : ` inputDuration=${attempt.inputDurationSeconds}s`;
    const inputBytes = attempt.inputBytes == null ? "" : ` inputBytes=${attempt.inputBytes.toString()}`;
    const error = attempt.error ? ` error="${attempt.error}"` : "";
    console.log(
      `  ${attempt.status} provider=${attempt.provider} model=${attempt.modelName ?? "?"} language=${attempt.language ?? "?"}${inputDuration}${inputBytes}${duration}${cost} startedAt=${attempt.startedAt.toISOString()} endedAt=${attempt.endedAt?.toISOString() ?? "?"}${error}`,
    );
  }
}

async function deleteLegacyOne(recording: Prisma.RecordingGetPayload<{ include: { subtitle: true } }>, apply: boolean) {
  if (!isR2Url(recording.audioUrl)) {
    throw new Error(`Refusing to delete legacy file because DB audioUrl is not on configured R2 base: ${recording.audioUrl}`);
  }

  const relative = inferLegacyRelativePath(recording.id, recording.audioUrl);
  const expectedBytes = recording.audioBytes == null ? null : Number(recording.audioBytes);
  if (expectedBytes != null && (!Number.isFinite(expectedBytes) || expectedBytes <= 0)) {
    throw new Error(`Recording has invalid audioBytes: ${recording.audioBytes?.toString()}`);
  }

  console.log(`Delete legacy for: ${recording.id} "${recording.title}"`);
  console.log(`Current DB audioUrl: ${recording.audioUrl}`);
  console.log(`Inferred legacy relative path: ${relative}`);
  console.log(`Subtitle status: ${recording.subtitle?.status ?? "NOT_QUEUED"}`);
  console.log(`Mode: ${apply ? "apply" : "dry-run"}`);

  const r2Verification = await verifyPublicUrl(recording.audioUrl, expectedBytes);
  const r2Hash = await sha256FromPublicUrl(recording.audioUrl);
  const legacy = await resolveLegacyDeleteCandidate(relative);

  console.log(
    `R2 verify: ok=${r2Verification.ok} method=${r2Verification.method} status=${r2Verification.status} bytes=${r2Verification.bytes ?? "?"}`,
  );
  console.log(`R2 hash: bytes=${r2Hash.bytes} sha256=${r2Hash.sha256}`);
  console.log(
    `Legacy file: exists=${legacy.exists} path=${legacy.filePath} bytes=${legacy.bytes ?? "?"} sha256=${legacy.sha256 ?? "?"}`,
  );

  if (!legacy.exists) {
    console.log("Legacy file is already absent. Nothing to delete.");
    await appendAudit("legacy_delete_already_absent", {
      recordingId: recording.id,
      title: recording.title,
      currentAudioUrl: recording.audioUrl,
      subtitleStatus: recording.subtitle?.status ?? null,
      relative,
      legacy,
      r2Verification,
      r2Hash,
      apply,
    });
    return { status: "already_absent" as const, recordingId: recording.id };
  }

  const bytesMatch =
    r2Hash.bytes === legacy.bytes &&
    (expectedBytes == null || expectedBytes === legacy.bytes);
  const hashMatches = r2Hash.sha256 === legacy.sha256;
  if (!r2Verification.ok || !bytesMatch || !hashMatches) {
    throw new Error("Refusing to delete: R2 verification and mounted legacy file do not match.");
  }

  await appendAudit("legacy_delete_verified", {
    recordingId: recording.id,
    title: recording.title,
    currentAudioUrl: recording.audioUrl,
    subtitleStatus: recording.subtitle?.status ?? null,
    relative,
    legacy,
    r2Verification,
    r2Hash,
    apply,
  });

  if (!apply) {
    console.log("Dry run complete. Legacy file was not deleted.");
    return { status: "verified_dry_run" as const, recordingId: recording.id };
  }

  const deleted = await deleteLegacyRelativePath(relative);
  console.log(
    `Deleted legacy file: deleted=${deleted.deleted} reason=${deleted.reason ?? "none"} relative=${deleted.relative} bytes=${deleted.bytes ?? "?"}`,
  );
  await appendAudit("legacy_deleted", {
    recordingId: recording.id,
    title: recording.title,
    currentAudioUrl: recording.audioUrl,
    ...deleted,
  });
  return { status: deleted.deleted ? "deleted" as const : "already_absent" as const, recordingId: recording.id };
}

async function legacyFileExistsForRecording(recording: { id: string; audioUrl: string }) {
  try {
    if (!isR2Url(recording.audioUrl)) return false;
    const relative = inferLegacyRelativePath(recording.id, recording.audioUrl);
    const legacy = await resolveLegacyDeleteCandidate(relative);
    return legacy.exists;
  } catch {
    return false;
  }
}

async function deleteLegacy(args: Args) {
  requireApplyConfirmation(args.apply);
  if (!process.env.LEGACY_DELETE_UPLOADS_DIR) {
    throw new Error("LEGACY_DELETE_UPLOADS_DIR is required for delete-legacy.");
  }
  requireR2PublicBase();

  const recordings = args.id
    ? await prisma.recording.findMany({
        where: { id: args.id },
        include: { subtitle: true },
      })
    : [];

  if (!args.id) {
    const pageSize = Math.max(args.limit * 5, 25);
    let cursor: string | undefined;
    while (recordings.length < args.limit) {
      const candidates = await prisma.recording.findMany({
        where: {
          recordingType: "SONG",
          audioUrl: { startsWith: `${r2BaseUrl}/audio/legacy/` },
        },
        orderBy: { id: "asc" },
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        take: pageSize,
        include: { subtitle: true },
      });
      if (candidates.length === 0) break;
      cursor = candidates[candidates.length - 1]?.id;

      for (const candidate of candidates) {
        if (await legacyFileExistsForRecording(candidate)) {
          recordings.push(candidate);
          if (recordings.length >= args.limit) break;
        }
      }
    }
  }

  if (args.id && recordings.length === 0) throw new Error(`Recording not found: ${args.id}`);
  if (recordings.length === 0) {
    console.log("No R2 legacy-backed recordings with mounted legacy files found for delete-legacy.");
    return;
  }

  console.log(
    `Delete legacy ${args.id ? "single recording" : `batch limit=${args.limit}`} mode=${args.apply ? "apply" : "dry-run"}`,
  );
  const summary: Record<string, number> = {};
  for (const recording of recordings) {
    const result = await deleteLegacyOne(recording, args.apply);
    summary[result.status] = (summary[result.status] ?? 0) + 1;
  }

  console.log("Delete legacy summary:");
  for (const [status, count] of Object.entries(summary)) {
    console.log(`  ${status}: ${count}`);
  }
}

async function main() {
  if (args.command === "help") return usage();

  validateDatabaseTarget();
  prisma = new PrismaClient({ log: ["error"] });

  if (args.command === "list") return list(args);
  if (args.command === "migrate") return migrate(args);
  if (args.command === "queue") return queue(args);
  if (args.command === "status") return status();
  if (args.command === "inspect") return inspect(args);
  if (args.command === "delete-legacy") return deleteLegacy(args);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma?.$disconnect());
