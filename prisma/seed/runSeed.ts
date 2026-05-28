import { PrismaClient, PublishStatus, UserStatus } from "@prisma/client";

import { hashPassword } from "../../src/lib/auth.js";
import { loadSeedData } from "./loadSeedData.js";
import { importMediaFile, resetUploadsDir } from "./media.js";
import type { SeedCollection, SeedData, SeedRecording } from "./types.js";

const prisma = new PrismaClient();

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

    const created = await prisma.recording.create({
      data: {
        uploaderId: ownerId,
        publishedPlaylistId: playlist.id,
        title: recording.title,
        description: recording.description ?? null,
        audioUrl: audio.url,
        audioMimeType: audio.mimeType,
        audioBytes: audio.bytes,
        durationSeconds: null,
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

export async function runSeed(seedDataPath?: string) {
  const data = loadSeedData(seedDataPath);
  const { mediaRoots, mediaBaseUrl, defaultPassword } = data.meta;

  await clearDatabase();
  await resetUploadsDir();

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

  const tagIds = new Map<string, string>();
  for (const tag of data.tags ?? []) {
    const created = await prisma.tag.create({
      data: { name: tag.name, slug: tag.slug, kind: tag.kind },
    });
    tagIds.set(tag.key, created.id);
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

  const editorialIds = new Map<string, string>();
  for (const post of data.editorial ?? []) {
    const authorId = userIds.get(post.authorKey);
    if (!authorId) {
      throw new Error(`Editorial ${post.key} references unknown author: ${post.authorKey}`);
    }

    const created = await prisma.editorialPost.create({
      data: {
        authorId,
        kind: post.kind,
        title: post.title,
        slug: post.slug,
        summary: post.summary ?? null,
        body: post.body,
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

  const admin = data.users.find((user) => user.role === "ADMIN");

  console.log("Seed complete.");
  console.log({
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
