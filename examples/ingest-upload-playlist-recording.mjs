/**
 * Playlisted Ingest API — full happy-path example
 *
 * Prerequisites:
 *   1. Create an API key in Studio → API Keys
 *   2. Set environment variables:
 *        PLT_API_KEY=plt_your_key_here
 *        PLT_BASE_URL=http://localhost:4000   (or your production URL)
 *
 * Usage:
 *   node examples/ingest-upload-playlist-recording.mjs
 *
 * To use real files, replace DEMO_AUDIO_BYTES / DEMO_IMAGE_BYTES with:
 *   import { readFileSync } from "node:fs";
 *   const audioBytes = readFileSync("/path/to/track.mp3");
 *   const imageBytes = readFileSync("/path/to/cover.jpg");
 */

import { readFileSync, existsSync } from "node:fs";

// ── config ────────────────────────────────────────────────────────────────────

const API_KEY  = process.env.PLT_API_KEY;
const BASE_URL = (process.env.PLT_BASE_URL ?? "http://localhost:4000").replace(/\/$/, "");

if (!API_KEY) {
  console.error("❌  PLT_API_KEY is not set. Create a key in Studio → API Keys.");
  process.exit(1);
}

// ── demo content (swap these for real files) ──────────────────────────────────
// Minimal valid-ish MP3 and PNG headers — enough to pass the server's
// MIME/extension checks. Replace with real file buffers for production use.

const AUDIO_FILE_PATH = process.env.PLT_AUDIO_FILE;
const IMAGE_FILE_PATH = process.env.PLT_IMAGE_FILE;

function loadOrFallback(filePath, fallbackBuffer, label) {
  if (filePath && existsSync(filePath)) {
    console.log(`  Using real file: ${filePath}`);
    return readFileSync(filePath);
  }
  console.log(`  No ${label} file path set — using demo bytes (set PLT_${label.toUpperCase()}_FILE for real content)`);
  return fallbackBuffer;
}

// ID3v2 header bytes — accepted as audio/mpeg
const DEMO_AUDIO_BYTES = Buffer.from([
  0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);
// Minimal PNG header
const DEMO_IMAGE_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

// ── helpers ───────────────────────────────────────────────────────────────────

function authHeaders() {
  return { Authorization: `Bearer ${API_KEY}` };
}

async function checkResponse(res, label) {
  if (res.ok) return;
  const body = await res.json().catch(() => ({}));
  console.error(`❌  ${label} failed (${res.status}):`, body.message ?? body.error ?? body);
  process.exit(1);
}

async function uploadFile(fileBytes, filename, mimeType, kind) {
  const form = new FormData();
  form.append("file", new Blob([fileBytes], { type: mimeType }), filename);

  const res = await fetch(`${BASE_URL}/api/v1/ingest/uploads?kind=${kind}`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });

  await checkResponse(res, `Upload ${kind}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await checkResponse(res, `POST ${path}`);
  const data = await res.json();
  return { status: res.status, data };
}

async function get(path, query = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(query).filter(([, v]) => v != null))
  ).toString();
  const url = qs ? `${BASE_URL}${path}?${qs}` : `${BASE_URL}${path}`;
  const res = await fetch(url, { headers: authHeaders() });
  await checkResponse(res, `GET ${path}`);
  return res.json();
}

// ── step 1: upload cover image ────────────────────────────────────────────────

console.log("\n─── Step 1: Upload cover image ───");
const imageBytes = loadOrFallback(IMAGE_FILE_PATH, DEMO_IMAGE_BYTES, "image");
const imageUpload = await uploadFile(imageBytes, "cover.png", "image/png", "image");
console.log(`  ✓ uploadId: ${imageUpload.uploadId}  (${imageUpload.bytes} bytes)`);

// ── step 2: upload audio file ─────────────────────────────────────────────────

console.log("\n─── Step 2: Upload audio file ───");
const audioBytes = loadOrFallback(AUDIO_FILE_PATH, DEMO_AUDIO_BYTES, "audio");
const audioUpload = await uploadFile(audioBytes, "neon-window.mp3", "audio/mpeg", "audio");
console.log(`  ✓ uploadId: ${audioUpload.uploadId}  (${audioUpload.bytes} bytes)`);

// ── step 3: upsert playlist ───────────────────────────────────────────────────

console.log("\n─── Step 3: Upsert playlist ───");
const { status: playlistStatus, data: playlistResult } = await post("/api/v1/ingest/playlists", {
  externalSource: "desktop-sync",
  externalId:     "album-night-signals",
  title:          "Night Signals",
  description:    "Late-night electronic demos.",
  visibility:     "PRIVATE",
  type:           "PLAYLIST",
  coverUploadId:  imageUpload.uploadId,
});
console.log(`  ✓ ${playlistStatus === 201 ? "Created" : "Updated"} playlist`);
console.log(`    id:   ${playlistResult.playlist.id}`);
console.log(`    slug: ${playlistResult.playlist.slug}`);

// ── step 4: upsert recording ──────────────────────────────────────────────────

console.log("\n─── Step 4: Upsert recording ───");
const { status: recStatus, data: recResult } = await post("/api/v1/ingest/recordings", {
  externalSource:     "desktop-sync",
  externalId:         "track-01-neon-window",
  playlistExternalId: "album-night-signals",
  title:              "Neon Window",
  audioUploadId:      audioUpload.uploadId,
  coverUploadId:      imageUpload.uploadId,
  trackNumber:        1,
  durationSeconds:    214,
});
console.log(`  ✓ ${recStatus === 201 ? "Created" : "Updated"} recording`);
console.log(`    id:    ${recResult.recording.id}`);
console.log(`    title: ${recResult.recording.title}`);

// ── step 5: run it again — should update, not duplicate ───────────────────────

console.log("\n─── Step 5: Re-upsert (idempotency check) ───");
const { status: idempotentStatus, data: idempotentResult } = await post("/api/v1/ingest/recordings", {
  externalSource:     "desktop-sync",
  externalId:         "track-01-neon-window",
  playlistExternalId: "album-night-signals",
  title:              "Neon Window (remaster)",
  audioUploadId:      audioUpload.uploadId,
  trackNumber:        1,
});
console.log(
  `  ✓ ${idempotentStatus === 200 && !idempotentResult.created ? "Updated (not duplicated) ✓" : "Unexpected result — check output"}`
);

// ── step 6: list remote recordings for reconciliation ────────────────────────

console.log("\n─── Step 6: List remote recordings for externalSource=desktop-sync ───");
const list = await get("/api/v1/ingest/recordings", {
  externalSource: "desktop-sync",
  pageSize: 10,
});
console.log(`  ✓ Found ${list.meta.total} recording(s) in remote inventory:`);
for (const rec of list.data) {
  console.log(`    · [${rec.externalId}] ${rec.title}`);
}

// ── step 7: single-item reconciliation ───────────────────────────────────────

console.log("\n─── Step 7: Single-item reconciliation (externalId lookup) ───");
const singleCheck = await get("/api/v1/ingest/recordings", {
  externalSource: "desktop-sync",
  externalId:     "track-01-neon-window",
});
const remoteRecord = singleCheck.data[0] ?? null;
if (remoteRecord) {
  console.log(`  ✓ Remote record exists — id: ${remoteRecord.id}, title: ${remoteRecord.title}`);
} else {
  console.log("  · No remote record found — would create on next sync");
}

console.log("\n✓ All steps complete.\n");
