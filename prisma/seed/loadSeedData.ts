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

  const mediaRoots = data.meta.mediaRoots;
  const userKeys = new Set(data.users.map((user) => user.key));
  const creatorKeys = new Set(data.users.filter((user) => user.role === "CREATOR").map((user) => user.key));
  const tagKeys = new Set((data.tags ?? []).map((tag) => tag.key));
  const collectionKeys = new Set(data.collections.map((collection) => collection.key));
  const playlistKeys = new Set((data.playlists ?? []).map((playlist) => playlist.key));
  const editorialKeys = new Set((data.editorial ?? []).map((post) => post.key));
  const recordingKeys = new Set<string>();

  function assertUnique(value: string, seen: Set<string>, label: string) {
    if (seen.has(value)) {
      throw new Error(`Duplicate ${label}: ${value}`);
    }
    seen.add(value);
  }

  function assertKnown(value: string | undefined, known: Set<string>, label: string) {
    if (!value || !known.has(value)) {
      throw new Error(`${label}: ${value ?? "(missing)"}`);
    }
  }

  function assertMediaFile(mediaRoot: string, relativeFile: string | undefined, label: string) {
    if (!relativeFile) return;

    const sourcePath = path.join(projectRoot, mediaRoot, relativeFile);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Media file not found for ${label}: ${sourcePath}`);
    }
  }

  const seenUsers = new Set<string>();
  for (const user of data.users) {
    assertUnique(user.key, seenUsers, "user key");
    assertMediaFile(mediaRoots.images, user.avatarFile, `user ${user.key} avatar`);
    assertMediaFile(mediaRoots.images, user.heroImageFile, `user ${user.key} hero image`);

    if (user.isFeaturedArtist && !user.avatarFile && !user.heroImageFile) {
      throw new Error(`Featured artist ${user.key} must define avatarFile or heroImageFile`);
    }
  }

  const seenTags = new Set<string>();
  for (const tag of data.tags ?? []) {
    assertUnique(tag.key, seenTags, "tag key");
  }

  const seenCollections = new Set<string>();
  for (const collection of data.collections) {
    assertUnique(collection.key, seenCollections, "collection key");
    assertKnown(collection.ownerKey, userKeys, `Collection ${collection.key} references unknown owner`);
    assertKnown(collection.ownerKey, creatorKeys, `Collection ${collection.key} must be owned by an artist`);
    assertMediaFile(mediaRoots.images, collection.coverArtFile, `collection ${collection.key} cover art`);

    if (!Array.isArray(collection.recordings) || collection.recordings.length === 0) {
      throw new Error(`Collection ${collection.key} must include at least one recording`);
    }

    for (const tagKey of collection.tagKeys ?? []) {
      assertKnown(tagKey, tagKeys, `Collection ${collection.key} references unknown tag`);
    }

    for (const recording of collection.recordings) {
      assertUnique(recording.key, recordingKeys, "recording key");
      if (!recording.audioFile) {
        throw new Error(`Recording ${recording.key} must define audioFile`);
      }
      assertMediaFile(mediaRoots.audio, recording.audioFile, `recording ${recording.key} audio`);
      assertMediaFile(mediaRoots.images, recording.artworkFile, `recording ${recording.key} artwork`);

      for (const tagKey of recording.tagKeys ?? []) {
        assertKnown(tagKey, tagKeys, `Recording ${recording.key} references unknown tag`);
      }
    }
  }

  const seenPlaylists = new Set<string>();
  for (const playlist of data.playlists ?? []) {
    assertUnique(playlist.key, seenPlaylists, "playlist key");
    assertKnown(playlist.ownerKey, userKeys, `Playlist ${playlist.key} references unknown owner`);
    assertKnown(playlist.ownerKey, creatorKeys, `Playlist ${playlist.key} must be owned by an artist`);
    assertMediaFile(mediaRoots.images, playlist.coverArtFile, `playlist ${playlist.key} cover art`);

    if (!Array.isArray(playlist.recordingKeys) || playlist.recordingKeys.length === 0) {
      throw new Error(`Playlist ${playlist.key} must include at least one recording`);
    }

    for (const tagKey of playlist.tagKeys ?? []) {
      assertKnown(tagKey, tagKeys, `Playlist ${playlist.key} references unknown tag`);
    }

    for (const recordingKey of playlist.recordingKeys) {
      if (!recordingKeys.has(recordingKey)) {
        throw new Error(`Playlist ${playlist.key} references unknown recording: ${recordingKey}`);
      }
    }
  }

  for (const save of data.saves ?? []) {
    assertKnown(save.userKey, userKeys, "Save references unknown user");
    if (save.playlistKey) {
      const knownPlaylist = playlistKeys.has(save.playlistKey) || collectionKeys.has(save.playlistKey);
      if (!knownPlaylist) {
        throw new Error(`Save references unknown playlist: ${save.playlistKey}`);
      }
    }
    if (save.recordingKey) {
      assertKnown(save.recordingKey, recordingKeys, "Save references unknown recording");
    }
  }

  for (const event of data.userPlaybackEvents ?? []) {
    assertKnown(event.userKey, userKeys, "Playback event references unknown user");
    assertKnown(event.recordingKey, recordingKeys, "Playback event references unknown recording");
    if (event.playlistKey) {
      const knownPlaylist = playlistKeys.has(event.playlistKey) || collectionKeys.has(event.playlistKey);
      if (!knownPlaylist) {
        throw new Error(`Playback event references unknown playlist: ${event.playlistKey}`);
      }
    }
  }

  const seenEditorial = new Set<string>();
  for (const post of data.editorial ?? []) {
    assertUnique(post.key, seenEditorial, "editorial key");
    assertKnown(post.authorKey, userKeys, `Editorial ${post.key} references unknown author`);
    assertMediaFile(mediaRoots.images, post.coverImageFile, `editorial ${post.key} cover image`);
  }

  for (const feature of data.homepageFeatures ?? []) {
    const targetCount = [feature.playlistKey, feature.userKey, feature.editorialKey].filter(Boolean).length;
    if (targetCount !== 1) {
      throw new Error(
        `Homepage feature ${feature.section} position ${feature.position} must target exactly one playlist, user, or editorial post`,
      );
    }

    if (feature.playlistKey) {
      const knownPlaylist = playlistKeys.has(feature.playlistKey) || collectionKeys.has(feature.playlistKey);
      if (!knownPlaylist) {
        throw new Error(`Homepage feature references unknown playlist: ${feature.playlistKey}`);
      }
    }
    if (feature.userKey) {
      assertKnown(feature.userKey, userKeys, "Homepage feature references unknown user");
    }
    if (feature.editorialKey) {
      assertKnown(feature.editorialKey, editorialKeys, "Homepage feature references unknown editorial post");
    }
    if (feature.createdByKey) {
      assertKnown(feature.createdByKey, userKeys, "Homepage feature references unknown creator");
    }
  }

  return data;
}
