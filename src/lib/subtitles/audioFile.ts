import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { getBackendRoot } from "../projectRoot.js";

const ABSOLUTE_URL_RE = /^https?:\/\//i;

function localUploadPath(audioUrl: string) {
  if (ABSOLUTE_URL_RE.test(audioUrl)) {
    const parsed = new URL(audioUrl);
    audioUrl = parsed.pathname;
  }

  const pathname = audioUrl.startsWith("/") ? audioUrl : `/${audioUrl}`;
  if (!pathname.startsWith("/uploads/")) {
    throw new Error("Only local uploaded audio files can be transcribed by this worker.");
  }

  const uploadsDir = path.resolve(getBackendRoot(), process.env.UPLOADS_DIR ?? "uploads");
  const relative = fileURLToPath(`file://${pathname}`).replace(/^\/uploads\//, "");
  const resolved = path.resolve(uploadsDir, relative);

  if (!resolved.startsWith(uploadsDir + path.sep)) {
    throw new Error("Resolved audio path escapes the uploads directory.");
  }

  return resolved;
}

function extensionFromUrl(audioUrl: string) {
  try {
    const parsed = new URL(audioUrl, "http://local.invalid");
    const ext = path.extname(parsed.pathname).toLowerCase();
    return ext || ".audio";
  } catch {
    return ".audio";
  }
}

async function downloadRemoteAudio(audioUrl: string) {
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Remote audio download failed (${response.status}): ${response.statusText}`);
  }

  const contentLength = response.headers.get("content-length");
  const bytes = contentLength == null ? null : Number(contentLength);
  if (bytes != null && (!Number.isFinite(bytes) || bytes <= 0)) {
    throw new Error("Remote audio response reported an invalid content length.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new Error("Remote audio download returned an empty file.");
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "playlisted-subtitles-"));
  const audioPath = path.join(tempDir, `audio${extensionFromUrl(audioUrl)}`);
  await fs.writeFile(audioPath, buffer);

  return {
    path: audioPath,
    cleanup: async () => {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    },
    downloadedBytes: buffer.length,
  };
}

export async function prepareSubtitleAudioFile(audioUrl: string) {
  if (ABSOLUTE_URL_RE.test(audioUrl)) {
    const prepared = await downloadRemoteAudio(audioUrl);
    return {
      audioPath: prepared.path,
      cleanup: prepared.cleanup,
      source: "remote" as const,
      downloadedBytes: prepared.downloadedBytes,
    };
  }

  return {
    audioPath: localUploadPath(audioUrl),
    cleanup: async () => undefined,
    source: "local" as const,
    downloadedBytes: null,
  };
}
