import fs from "node:fs";
import path from "node:path";

import type { SeedData } from "./types.js";

const projectRoot = path.resolve(import.meta.dirname, "../..");

export function getProjectRoot() {
  return projectRoot;
}

export function resolveSeedDataPath(explicitPath?: string) {
  return path.resolve(
    projectRoot,
    explicitPath ?? process.env.SEED_DATA_PATH ?? "prisma/seed-data.json",
  );
}

export function loadSeedData(explicitPath?: string): SeedData {
  const filePath = resolveSeedDataPath(explicitPath);
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw) as SeedData;

  if (!data.meta?.mediaRoots?.audio || !data.meta?.mediaRoots?.images) {
    throw new Error("seed-data.json must define meta.mediaRoots.audio and meta.mediaRoots.images");
  }

  if (!data.meta.mediaBaseUrl) {
    throw new Error("seed-data.json must define meta.mediaBaseUrl");
  }

  if (!data.meta.defaultPassword) {
    throw new Error("seed-data.json must define meta.defaultPassword");
  }

  if (!Array.isArray(data.users) || data.users.length === 0) {
    throw new Error("seed-data.json must include at least one user");
  }

  if (!Array.isArray(data.collections)) {
    throw new Error("seed-data.json must include collections");
  }

  const recordingKeys = new Set<string>();
  for (const collection of data.collections) {
    for (const recording of collection.recordings) {
      if (recordingKeys.has(recording.key)) {
        throw new Error(`Duplicate recording key: ${recording.key}`);
      }
      recordingKeys.add(recording.key);
    }
  }

  for (const playlist of data.playlists ?? []) {
    for (const recordingKey of playlist.recordingKeys) {
      if (!recordingKeys.has(recordingKey)) {
        throw new Error(`Playlist ${playlist.key} references unknown recording: ${recordingKey}`);
      }
    }
  }

  return data;
}
