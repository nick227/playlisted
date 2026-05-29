import { PrismaClient, PublishStatus, UserStatus } from "@prisma/client";

import { hashPassword } from "../../src/lib/auth.js";
import { genresDictionary } from "../../src/utils/genresDictionary.js";
import { loadSeedData } from "./loadSeedData.js";
import { backfillRecordingDurations, durationFromImportedAudio } from "./audioDuration.js";
import { importMediaFile, resetUploadsDir } from "./media.js";
import type { SeedCollection, SeedData, SeedRecording } from "./types.js";

const prisma = new PrismaClient();

export type SeedOnlyMode = "users";
export type SeedRunOptions = {
  only?: SeedOnlyMode;
};

async function clearSessions() {
  try {
    await prisma.session.deleteMany();
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "P2021")) {
      throw error;
    }
  }
}

async function clearDatabase() {
  await clearSessions();

  await prisma.$transaction([
    prisma.homepageFeature.deleteMany(),
    prisma.editorialPost.deleteMany(),
    prisma.playbackEvent.deleteMany(),
    prisma.recordingSave.deleteMany(),
    prisma.playlistSave.deleteMany(),
    prisma.recordingTag.deleteMany(),
    prisma.playlistTag.deleteMany(),
    prisma.playlistItem.deleteMany(),
    prisma.recording.deleteMany(),
    prisma.playlist.deleteMany(),
    prisma.userFollow.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function importRecordingMedia(
  data: SeedData,
  recording: SeedRecording,
  mediaRoots: SeedData["meta"]["mediaRoots"],
  mediaBaseUrl: string,
) {
  const audio = await importMediaFile({
    mediaRoot: mediaRoots.audio,
    relativeFile: recording.audioFile,
    assetKey: recording.key,
    kind: "audio",
    mediaBaseUrl,
  });

  let artworkUrl: string | null = null;
  if (recording.artworkFile) {
    const artwork = await importMediaFile({
      mediaRoot: mediaRoots.images,
      relativeFile: recording.artworkFile,
      assetKey: `${recording.key}-art`,
      kind: "images",
      mediaBaseUrl,
    });
    artworkUrl = artwork.url;
  }

  return { audio, artworkUrl };
}

async function seedCollection(
  data: SeedData,
  collection: SeedCollection,
  userIds: Map<string, string>,
  tagIds: Map<string, string>,
  recordingIds: Map<string, string>,
) {
  const ownerId = userIds.get(collection.ownerKey);
  if (!ownerId) {
    throw new Error(`Collection ${collection.key} references unknown owner: ${collection.ownerKey}`);
  }

  const { mediaRoots, mediaBaseUrl } = data.meta;
  let coverArtUrl: string | null = null;

  if (collection.coverArtFile) {
    const cover = await importMediaFile({
      mediaRoot: mediaRoots.images,
      relativeFile: collection.coverArtFile,
      assetKey: `${collection.key}-cover`,
      kind: "images",
      mediaBaseUrl,
    });
    coverArtUrl = cover.url;
  }

  const playlist = await prisma.playlist.create({
    data: {
      ownerId,
      title: collection.title,
      slug: collection.slug,
      description: collection.description ?? null,
      coverArtUrl,
      type: collection.type,
      visibility: collection.visibility ?? "PUBLIC",
      status: collection.status ?? "PUBLISHED",
      featured: collection.featured ?? false,
      isPinnedOnProfile: collection.isPinnedOnProfile ?? false,
      publishedAt: collection.publishedAt ? new Date(collection.publishedAt) : null,
      tags: collection.tagKeys?.length
        ? { create: collection.tagKeys.map((tagKey) => ({ tagId: tagIds.get(tagKey)! })) }
        : undefined,
    },
  });

  let totalDurationSeconds = 0;

  for (const [index, recording] of collection.recordings.entries()) {
    const { audio, artworkUrl } = await importRecordingMedia(data, recording, mediaRoots, mediaBaseUrl);
    const durationSeconds = await durationFromImportedAudio(audio.relativePath);

    const created = await prisma.recording.create({
      data: {
        uploaderId: ownerId,
        publishedPlaylistId: playlist.id,
        title: recording.title,
        description: recording.description ?? null,
        audioUrl: audio.url,
        audioMimeType: audio.mimeType,
        audioBytes: audio.bytes,
        durationSeconds,
        artworkUrl,
        recordingType: recording.recordingType ?? "SONG",
        visibility: recording.visibility ?? "PUBLIC",
        status: recording.status ?? "PUBLISHED",
        trackNumber: recording.trackNumber ?? index + 1,
        episodeNumber: recording.episodeNumber ?? null,
        explicit: recording.explicit ?? false,
        releaseDate: recording.releaseDate ? new Date(recording.releaseDate) : null,
        publishedAt: recording.publishedAt ? new Date(recording.publishedAt) : null,
        tags: recording.tagKeys?.length
          ? { create: recording.tagKeys.map((tagKey) => ({ tagId: tagIds.get(tagKey)! })) }
          : undefined,
      },
    });

    recordingIds.set(recording.key, created.id);

    await prisma.playlistItem.create({
      data: {
        playlistId: playlist.id,
        recordingId: created.id,
        position: index + 1,
        addedById: ownerId,
      },
    });

    totalDurationSeconds += created.durationSeconds ?? 0;
  }

  await prisma.playlist.update({
    where: { id: playlist.id },
    data: {
      itemCount: collection.recordings.length,
      totalDurationSeconds,
    },
  });

  return playlist;
}

// ── Playback distribution: total plays + proportion that fall in the last 7d ──
const RECORDING_PLAYS: Record<string, { total: number; recentBias: number }> = {
  "wrong-about-me":      { total: 220, recentBias: 0.55 },
  "harbor-lights":       { total: 195, recentBias: 0.42 },
  "cloud-nine-collapse": { total: 178, recentBias: 0.62 },
  "satellite-hearts":    { total: 168, recentBias: 0.45 },
  "skin-deep":           { total: 158, recentBias: 0.58 },
  "leave-it-up-to-you":  { total: 148, recentBias: 0.40 },
  "zero-crossing":       { total: 138, recentBias: 0.64 },
  "half-life":           { total: 122, recentBias: 0.52 },
  "soft-static":         { total: 115, recentBias: 0.38 },
  "pressure-system":     { total: 108, recentBias: 0.48 },
  "neon-delay":          { total: 98,  recentBias: 0.35 },
  "midnight-circuit":    { total: 92,  recentBias: 0.44 },
  "tide-lines":          { total: 88,  recentBias: 0.32 },
  "witness":             { total: 85,  recentBias: 0.50 },
  "dead-channel":        { total: 82,  recentBias: 0.55 },
  "feedback-loop":       { total: 75,  recentBias: 0.46 },
  "undertow":            { total: 72,  recentBias: 0.38 },
  "night-signal-ep01":   { total: 58,  recentBias: 0.30 },
};

const PLAYLIST_PLAYS: Record<string, number> = {
  "afterglow-transit":   175,
  "late-night-commute":  158,
  "machine-and-soul":    148,
  "editors-desk-may":    135,
  "after-midnight":      122,
  "glass-harbor":        118,
  "frequency-check":     112,
  "dark-matter-vol1":    105,
  "indie-signal":        88,
  "nova-singles":        82,
  "mirror-hour-ep":      78,
  "machine-sleep-ep":    72,
  "low-signal-season":   65,
};

async function seedPlaybackEvents(
  client: PrismaClient,
  recordingIds: Map<string, string>,
  collectionIds: Map<string, string>,
  playlistIds: Map<string, string>,
) {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  type EventRow = {
    recordingId: string;
    playlistId: string | null;
    playedSeconds: number;
    completed: boolean;
    createdAt: Date;
  };

  const events: EventRow[] = [];

  // Recording play events (spread across last 30 days, biased toward recent)
  for (const [key, recordingId] of recordingIds) {
    const dist = RECORDING_PLAYS[key] ?? { total: 12, recentBias: 0.4 };
    const recentCount = Math.round(dist.total * dist.recentBias);
    const olderCount  = dist.total - recentCount;

    for (let i = 0; i < recentCount; i++) {
      events.push({
        recordingId,
        playlistId: null,
        playedSeconds: Math.floor(Math.random() * 95 + 25),
        completed: Math.random() > 0.32,
        createdAt: new Date(now - Math.random() * 7 * DAY),
      });
    }
    for (let i = 0; i < olderCount; i++) {
      events.push({
        recordingId,
        playlistId: null,
        playedSeconds: Math.floor(Math.random() * 95 + 25),
        completed: Math.random() > 0.32,
        createdAt: new Date(now - (7 + Math.random() * 23) * DAY),
      });
    }
  }

  // Playlist play events — attach random recordings from each playlist's context
  const allCollections = new Map([...collectionIds, ...playlistIds]);
  for (const [key, playlistId] of allCollections) {
    const count = PLAYLIST_PLAYS[key] ?? 15;
    // Use any recording as proxy (playlist-level aggregate only needs playlistId)
    const recordingEntries = [...recordingIds.values()];
    for (let i = 0; i < count; i++) {
      const recordingId = recordingEntries[Math.floor(Math.random() * recordingEntries.length)];
      const daysAgo = Math.pow(Math.random(), 0.6) * 30;
      events.push({
        recordingId,
        playlistId,
        playedSeconds: Math.floor(Math.random() * 95 + 25),
        completed: Math.random() > 0.35,
        createdAt: new Date(now - daysAgo * DAY),
      });
    }
  }

  // Insert in batches of 200
  for (let i = 0; i < events.length; i += 200) {
    await client.playbackEvent.createMany({ data: events.slice(i, i + 200) });
  }

  // Sync Recording.playCount for "all time" charts
  for (const [key, recordingId] of recordingIds) {
    const total = RECORDING_PLAYS[key]?.total ?? 0;
    if (total > 0) {
      await client.recording.update({
        where: { id: recordingId },
        data: { playCount: total },
      });
    }
  }
}

async function seedUserPlaybackEvents(
  client: PrismaClient,
  data: SeedData,
  userIds: Map<string, string>,
  recordingIds: Map<string, string>,
  collectionIds: Map<string, string>,
  playlistIds: Map<string, string>,
) {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const events: {
    userId: string;
    recordingId: string;
    playlistId: string | null;
    sourceContext: string;
    playedSeconds: number;
    completed: boolean;
    createdAt: Date;
  }[] = [];

  for (const seedEvent of data.userPlaybackEvents ?? []) {
    const userId = userIds.get(seedEvent.userKey);
    const recordingId = recordingIds.get(seedEvent.recordingKey);
    const playlistId = seedEvent.playlistKey
      ? (collectionIds.get(seedEvent.playlistKey) ?? playlistIds.get(seedEvent.playlistKey) ?? null)
      : null;

    if (!userId || !recordingId) {
      throw new Error(`Playback event references unknown user or recording: ${seedEvent.userKey}/${seedEvent.recordingKey}`);
    }
    if (seedEvent.playlistKey && !playlistId) {
      throw new Error(`Playback event references unknown playlist: ${seedEvent.playlistKey}`);
    }

    const count = Math.max(1, seedEvent.count ?? 1);
    const start = Math.max(0, seedEvent.daysAgoStart ?? 0);
    const end = Math.max(start, seedEvent.daysAgoEnd ?? start);

    for (let i = 0; i < count; i += 1) {
      const spread = count === 1 ? 0 : i / (count - 1);
      const daysAgo = start + (end - start) * spread;
      events.push({
        userId,
        recordingId,
        playlistId,
        sourceContext: seedEvent.sourceContext ?? "seed",
        playedSeconds: seedEvent.playedSeconds ?? Math.floor(55 + Math.random() * 130),
        completed: seedEvent.completed ?? true,
        createdAt: new Date(now - daysAgo * DAY),
      });
    }
  }

  if (events.length > 0) {
    await client.playbackEvent.createMany({ data: events });
  }
}

export async function runSeed(seedDataPath?: string, options?: SeedRunOptions) {
  const data = loadSeedData(seedDataPath);
  const { mediaRoots, mediaBaseUrl, defaultPassword } = data.meta;

  const only = options?.only;

  if (only === "users") {
    await clearDatabase();
  } else {
    await clearDatabase();
    await resetUploadsDir();
  }

  const userIds = new Map<string, string>();
  for (const user of data.users) {
    const password = user.password ?? defaultPassword;
    const passwordHash = await hashPassword(password);

    let avatarUrl: string | null = null;
    let heroImageUrl: string | null = null;

    if (user.avatarFile) {
      const avatar = await importMediaFile({
        mediaRoot: mediaRoots.images,
        relativeFile: user.avatarFile,
        assetKey: `${user.key}-avatar`,
        kind: "images",
        mediaBaseUrl,
      });
      avatarUrl = avatar.url;
    }

    if (user.heroImageFile) {
      const hero = await importMediaFile({
        mediaRoot: mediaRoots.images,
        relativeFile: user.heroImageFile,
        assetKey: `${user.key}-hero`,
        kind: "images",
        mediaBaseUrl,
      });
      heroImageUrl = hero.url;
    }

    const created = await prisma.user.create({
      data: {
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        passwordHash,
        bio: user.bio ?? null,
        avatarUrl,
        heroImageUrl,
        role: user.role,
        status: UserStatus.ACTIVE,
        isFeaturedArtist: user.isFeaturedArtist ?? false,
      },
    });

    userIds.set(user.key, created.id);
  }

  if (only === "users") {
    console.log("Seed complete (users only).");
    console.log({
      mode: "users",
      seedData: seedDataPath ?? process.env.SEED_DATA_PATH ?? "prisma/seed-data.json",
      uploadsDir: process.env.UPLOADS_DIR ?? "uploads",
      mediaBaseUrl,
      users: Object.fromEntries(data.users.map((user) => [user.key, userIds.get(user.key)])),
    });
    return;
  }

  const tagIds = new Map<string, string>();
  for (const tag of data.tags ?? []) {
    const created = await prisma.tag.create({
      data: { name: tag.name, slug: tag.slug, kind: tag.kind },
    });
    tagIds.set(tag.key, created.id);
  }

  // Seed all realistic SoundCloud genres, subgenres, and typical moods dynamically
  for (const category of genresDictionary) {
    for (const genre of category.genres) {
      const existing = await prisma.tag.findUnique({
        where: { slug: genre.slug },
      });
      if (!existing) {
        const created = await prisma.tag.create({
          data: { name: genre.name, slug: genre.slug, kind: "GENRE" },
        });
        tagIds.set(genre.slug, created.id);
      } else {
        tagIds.set(genre.slug, existing.id);
      }

      for (const subgenre of genre.subgenres) {
        const existingSub = await prisma.tag.findUnique({
          where: { slug: subgenre.slug },
        });
        if (!existingSub) {
          const created = await prisma.tag.create({
            data: { name: subgenre.name, slug: subgenre.slug, kind: "GENRE" },
          });
          tagIds.set(subgenre.slug, created.id);
        } else {
          tagIds.set(subgenre.slug, existingSub.id);
        }

        // Dynamically seed typical moods as mood tags
        for (const mood of subgenre.typicalMoods) {
          const moodSlug = mood.toLowerCase().replace(/\s+/g, "-");
          const existingMood = await prisma.tag.findUnique({
            where: { slug: moodSlug },
          });
          if (!existingMood) {
            const createdMood = await prisma.tag.create({
              data: {
                name: mood.charAt(0).toUpperCase() + mood.slice(1),
                slug: moodSlug,
                kind: "MOOD",
              },
            });
            tagIds.set(moodSlug, createdMood.id);
          } else {
            tagIds.set(moodSlug, existingMood.id);
          }
        }
      }
    }
  }

  const recordingIds = new Map<string, string>();
  const collectionIds = new Map<string, string>();

  for (const collection of data.collections) {
    const playlist = await seedCollection(data, collection, userIds, tagIds, recordingIds);
    collectionIds.set(collection.key, playlist.id);
  }

  const playlistIds = new Map<string, string>();

  for (const playlistSeed of data.playlists) {
    const ownerId = userIds.get(playlistSeed.ownerKey);
    if (!ownerId) {
      throw new Error(`Playlist ${playlistSeed.key} references unknown owner: ${playlistSeed.ownerKey}`);
    }

    let coverArtUrl: string | null = null;
    if (playlistSeed.coverArtFile) {
      const cover = await importMediaFile({
        mediaRoot: mediaRoots.images,
        relativeFile: playlistSeed.coverArtFile,
        assetKey: `${playlistSeed.key}-cover`,
        kind: "images",
        mediaBaseUrl,
      });
      coverArtUrl = cover.url;
    }

    const playlist = await prisma.playlist.create({
      data: {
        ownerId,
        title: playlistSeed.title,
        slug: playlistSeed.slug,
        description: playlistSeed.description ?? null,
        coverArtUrl,
        type: playlistSeed.type ?? "PLAYLIST",
        visibility: playlistSeed.visibility ?? "PUBLIC",
        status: playlistSeed.status ?? "PUBLISHED",
        featured: playlistSeed.featured ?? false,
        publishedAt: playlistSeed.publishedAt ? new Date(playlistSeed.publishedAt) : null,
        tags: playlistSeed.tagKeys?.length
          ? { create: playlistSeed.tagKeys.map((tagKey) => ({ tagId: tagIds.get(tagKey)! })) }
          : undefined,
      },
    });

    playlistIds.set(playlistSeed.key, playlist.id);

    let totalDurationSeconds = 0;

    for (const [index, recordingKey] of playlistSeed.recordingKeys.entries()) {
      const recordingId = recordingIds.get(recordingKey);
      if (!recordingId) {
        throw new Error(`Playlist ${playlistSeed.key} references unknown recording: ${recordingKey}`);
      }

      const recording = await prisma.recording.findUnique({
        where: { id: recordingId },
        select: { durationSeconds: true },
      });

      await prisma.playlistItem.create({
        data: {
          playlistId: playlist.id,
          recordingId,
          position: index + 1,
          addedById: ownerId,
        },
      });

      totalDurationSeconds += recording?.durationSeconds ?? 0;
    }

    await prisma.playlist.update({
      where: { id: playlist.id },
      data: {
        itemCount: playlistSeed.recordingKeys.length,
        totalDurationSeconds,
      },
    });
  }

  for (const save of data.saves ?? []) {
    const userId = userIds.get(save.userKey);
    if (!userId) {
      throw new Error(`Save references unknown user: ${save.userKey}`);
    }

    if (save.playlistKey) {
      const playlistId = playlistIds.get(save.playlistKey) ?? collectionIds.get(save.playlistKey);
      if (!playlistId) {
        throw new Error(`Save references unknown playlist: ${save.playlistKey}`);
      }

      await prisma.playlistSave.create({
        data: { userId, playlistId, kind: save.kind },
      });
    }

    if (save.recordingKey) {
      const recordingId = recordingIds.get(save.recordingKey);
      if (!recordingId) {
        throw new Error(`Save references unknown recording: ${save.recordingKey}`);
      }

      await prisma.recordingSave.create({
        data: { userId, recordingId, kind: save.kind },
      });
    }
  }

  await seedUserPlaybackEvents(prisma, data, userIds, recordingIds, collectionIds, playlistIds);

  const editorialIds = new Map<string, string>();
  for (const post of data.editorial ?? []) {
    const authorId = userIds.get(post.authorKey);
    if (!authorId) {
      throw new Error(`Editorial ${post.key} references unknown author: ${post.authorKey}`);
    }

    let coverImageUrl: string | null = null;
    if (post.coverImageFile) {
      const cover = await importMediaFile({
        mediaRoot: mediaRoots.images,
        relativeFile: post.coverImageFile,
        assetKey: `${post.key}-cover`,
        kind: "images",
        mediaBaseUrl,
      });
      coverImageUrl = cover.url;
    }

    const created = await prisma.editorialPost.create({
      data: {
        authorId,
        kind: post.kind,
        title: post.title,
        slug: post.slug,
        summary: post.summary ?? null,
        body: post.body,
        coverImageUrl,
        status: post.status ?? "PUBLISHED",
        publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
      },
    });

    editorialIds.set(post.key, created.id);
  }

  for (const feature of data.homepageFeatures ?? []) {
    await prisma.homepageFeature.create({
      data: {
        section: feature.section,
        position: feature.position,
        playlistId: feature.playlistKey
          ? (collectionIds.get(feature.playlistKey) ?? playlistIds.get(feature.playlistKey))
          : null,
        userId: feature.userKey ? userIds.get(feature.userKey) : null,
        editorialPostId: feature.editorialKey ? editorialIds.get(feature.editorialKey) : null,
        createdById: feature.createdByKey ? userIds.get(feature.createdByKey) : null,
        titleOverride: feature.titleOverride ?? null,
        subtitleOverride: feature.subtitleOverride ?? null,
        isActive: feature.isActive ?? true,
      },
    });
  }

  await seedPlaybackEvents(prisma, recordingIds, collectionIds, playlistIds);

  const missingDurations = await prisma.recording.findMany({
    where: { durationSeconds: null },
    select: { id: true, audioUrl: true },
  });
  if (missingDurations.length > 0) {
    const updated = await backfillRecordingDurations(missingDurations, async (id, durationSeconds) => {
      await prisma.recording.update({ where: { id }, data: { durationSeconds } });
    });
    console.log(`Backfilled duration for ${updated} recording(s).`);
  }

  const admin = data.users.find((user) => user.role === "ADMIN");

  console.log("Seed complete.");
  console.log({
    mode: "full",
    seedData: seedDataPath ?? process.env.SEED_DATA_PATH ?? "prisma/seed-data.json",
    uploadsDir: process.env.UPLOADS_DIR ?? "uploads",
    mediaBaseUrl,
    users: Object.fromEntries(data.users.map((user) => [user.key, userIds.get(user.key)])),
    collections: Object.fromEntries([...collectionIds.entries()]),
    playlists: Object.fromEntries([...playlistIds.entries()]),
    recordings: Object.fromEntries([...recordingIds.entries()]),
    loginHint: admin
      ? `${admin.email} / ${admin.password ?? defaultPassword}`
      : `${data.users[0]?.email} / ${defaultPassword}`,
  });
}

export async function disconnectSeed() {
  await prisma.$disconnect();
}
