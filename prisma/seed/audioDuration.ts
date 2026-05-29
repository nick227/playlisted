import fs from "node:fs/promises";
import path from "node:path";

import { parseFile } from "music-metadata";

import { getUploadsDir } from "./media.js";

const UPLOADS_PATH_RE = /\/uploads\/(.+)$/i;

export async function readAudioDurationSeconds(filePath: string): Promise<number | null> {
  try {
    const { format } = await parseFile(filePath);
    const duration = format.duration;
    if (duration == null || !Number.isFinite(duration) || duration <= 0) return null;
    return Math.round(duration);
  } catch {
    return null;
  }
}

export function audioUrlToUploadPath(audioUrl: string): string | null {
  const match = audioUrl.match(UPLOADS_PATH_RE);
  if (!match?.[1]) return null;
  return path.join(getUploadsDir(), ...match[1].split("/"));
}

export async function backfillRecordingDurations(
  recordings: { id: string; audioUrl: string }[],
  update: (id: string, durationSeconds: number) => Promise<void>,
): Promise<number> {
  let updated = 0;
  for (const recording of recordings) {
    const filePath = audioUrlToUploadPath(recording.audioUrl);
    if (!filePath) continue;
    const durationSeconds = await readAudioDurationSeconds(filePath);
    if (durationSeconds == null) continue;
    await update(recording.id, durationSeconds);
    updated += 1;
  }
  return updated;
}

export async function durationFromImportedAudio(relativePath: string): Promise<number | null> {
  const filePath = path.join(getUploadsDir(), relativePath);
  try {
    await fs.access(filePath);
  } catch {
    return null;
  }
  return readAudioDurationSeconds(filePath);
}
