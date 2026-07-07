import { prisma } from "../lib/prisma.js";
import { canViewerAccessPlaylist } from "../lib/publicPlaylistFilter.js";
import {
  canViewerAccessRecording,
  isRecordingLinkAccessible,
} from "../lib/publicRecordingFilter.js";
import { canViewerAccessUserProfile } from "../lib/publicUserFilter.js";
import { resolveRecordingArtworkUrl } from "../lib/mediaUrls.js";
import { slugify } from "../utils/slug.js";
import { PUBLIC_ORIGIN, SITE_NAME } from "./constants.js";
import { defaultShareImage, pickShareImage } from "./shareImages.js";
import {
  buildShareMeta,
  defaultShareMeta,
  homeShareMeta,
  staticPageShareMetaByPath,
} from "./shareMetaData.js";
import type { ShareOrigins } from "./shareRequest.js";
import type { ShareMeta } from "./types.js";

const ANONYMOUS_VIEWER = { userId: null as string | null, role: null as string | null };

function profilePath(username: string): string {
  return `/@/${encodeURIComponent(username)}`;
}

function playlistPath(username: string, slug: string): string {
  return `/@/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
}

function playlistIdPath(playlistId: string): string {
  return `/playlists/${encodeURIComponent(playlistId)}`;
}

function songPath(recordingId: string): string {
  return `/songs/${encodeURIComponent(recordingId)}`;
}

export async function resolveArtistShareMeta(
  usernameInput: string,
  origins: ShareOrigins,
): Promise<ShareMeta> {
  const username = slugify(decodeURIComponent(usernameInput));
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      heroImageUrl: true,
      status: true,
      updatedAt: true,
    },
  });

  if (!user || !canViewerAccessUserProfile(user, ANONYMOUS_VIEWER)) {
    return defaultShareMeta(profilePath(username), origins);
  }

  const title = `${user.displayName} (@${user.username}) — ${SITE_NAME}`;
  const description =
    user.bio?.trim()
    || `Listen to ${user.displayName}'s playlists, songs, and artist profile on Playlisted.`;
  const image = pickShareImage(
    origins.assetOrigin,
    user.avatarUrl,
    user.heroImageUrl,
    defaultShareImage(origins.assetOrigin, "artist"),
  );
  const canonicalPath = profilePath(user.username);
  const canonicalUrl = `${origins.canonicalOrigin}${canonicalPath}`;

  return buildShareMeta({
    title,
    description,
    image,
    canonicalPath,
    canonicalOrigin: origins.canonicalOrigin,
    type: "profile",
    imageAlt: `${user.displayName} on Playlisted`,
    modifiedTime: user.updatedAt.toISOString(),
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "MusicGroup",
      name: user.displayName,
      alternateName: `@${user.username}`,
      url: canonicalUrl,
      image,
      description,
    },
  });
}

async function resolvePlaylistRecord(
  lookup: { ownerId: string; slug: string } | { id: string },
  origins: ShareOrigins,
  canonicalPath: string,
): Promise<ShareMeta | null> {
  const playlist = "id" in lookup
    ? await prisma.playlist.findUnique({
      where: { id: lookup.id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    })
    : await prisma.playlist.findFirst({
      where: lookup,
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

  if (!playlist || !canViewerAccessPlaylist(playlist, ANONYMOUS_VIEWER, playlist.ownerId)) {
    return null;
  }

  const ownerName = playlist.owner.displayName;
  const title = `${playlist.title} by ${ownerName} — ${SITE_NAME}`;
  const description =
    playlist.description?.trim()
    || `Listen to ${playlist.title}, a playlist by ${ownerName} on Playlisted.`;
  const image = pickShareImage(
    origins.assetOrigin,
    playlist.coverArtUrl,
    playlist.owner.avatarUrl,
    defaultShareImage(origins.assetOrigin, "playlist"),
  );
  const canonicalUrl = `${origins.canonicalOrigin}${canonicalPath}`;

  return buildShareMeta({
    title,
    description,
    image,
    canonicalPath,
    canonicalOrigin: origins.canonicalOrigin,
    type: "music.playlist",
    imageAlt: `${playlist.title} by ${ownerName}`,
    authorName: ownerName,
    publishedTime: playlist.publishedAt?.toISOString(),
    modifiedTime: playlist.updatedAt.toISOString(),
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "MusicPlaylist",
      name: playlist.title,
      description,
      url: canonicalUrl,
      image,
      creator: {
        "@type": "Person",
        name: ownerName,
      },
    },
  });
}

export async function resolvePlaylistShareMeta(
  usernameInput: string,
  slugInput: string,
  origins: ShareOrigins,
): Promise<ShareMeta> {
  const username = slugify(decodeURIComponent(usernameInput));
  const slug = slugify(decodeURIComponent(slugInput));

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (!user) {
    return defaultShareMeta(playlistPath(username, slug), origins);
  }

  const meta = await resolvePlaylistRecord(
    { ownerId: user.id, slug },
    origins,
    playlistPath(username, slug),
  );

  return meta ?? defaultShareMeta(playlistPath(username, slug), origins);
}

export async function resolvePlaylistIdShareMeta(
  playlistId: string,
  origins: ShareOrigins,
): Promise<ShareMeta> {
  const meta = await resolvePlaylistRecord(
    { id: playlistId },
    origins,
    playlistIdPath(playlistId),
  );

  if (meta) return meta;
  return defaultShareMeta(playlistIdPath(playlistId), origins);
}

export async function resolveSongShareMeta(
  recordingId: string,
  origins: ShareOrigins,
): Promise<ShareMeta> {
  const recording = await prisma.recording.findUnique({
    where: { id: recordingId },
    include: {
      uploader: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
        },
      },
      publishedPlaylist: {
        select: {
          coverArtUrl: true,
          ownerId: true,
          visibility: true,
          status: true,
        },
      },
    },
  });

  if (
    !recording
    || !canViewerAccessRecording(recording, ANONYMOUS_VIEWER, recording.uploaderId)
    || !isRecordingLinkAccessible(recording)
  ) {
    return defaultShareMeta(songPath(recordingId), origins);
  }

  const artistName = recording.uploader.displayName;
  const title = `${recording.title} by ${artistName} — ${SITE_NAME}`;
  const description = `Listen to ${recording.title} by ${artistName} on Playlisted.`;
  const artworkUrl = resolveRecordingArtworkUrl(recording, recording.publishedPlaylist);
  const image = pickShareImage(
    origins.assetOrigin,
    artworkUrl,
    recording.uploader.avatarUrl,
    defaultShareImage(origins.assetOrigin, "song"),
  );
  const canonicalPath = songPath(recording.id);
  const canonicalUrl = `${origins.canonicalOrigin}${canonicalPath}`;

  return buildShareMeta({
    title,
    description,
    image,
    canonicalPath,
    canonicalOrigin: origins.canonicalOrigin,
    type: "music.song",
    imageAlt: `${recording.title} by ${artistName}`,
    authorName: artistName,
    modifiedTime: recording.updatedAt.toISOString(),
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "MusicRecording",
      name: recording.title,
      url: canonicalUrl,
      image,
      byArtist: {
        "@type": "MusicGroup",
        name: artistName,
      },
    },
  });
}

export async function resolveShareMeta(pathname: string, origins: ShareOrigins): Promise<ShareMeta> {
  const path = pathname.split("?")[0]?.split("#")[0] ?? "/";

  if (path === "/") {
    return homeShareMeta(origins);
  }

  const staticMeta = staticPageShareMetaByPath(path, origins);
  if (staticMeta) {
    return staticMeta;
  }

  const artistMatch = path.match(/^\/@\/([^/]+)$/);
  if (artistMatch?.[1]) {
    return resolveArtistShareMeta(artistMatch[1], origins);
  }

  const playlistMatch = path.match(/^\/@\/([^/]+)\/([^/]+)$/);
  if (playlistMatch?.[1] && playlistMatch[2]) {
    return resolvePlaylistShareMeta(playlistMatch[1], playlistMatch[2], origins);
  }

  const playlistIdMatch = path.match(/^\/playlists\/([^/]+)$/);
  if (playlistIdMatch?.[1]) {
    return resolvePlaylistIdShareMeta(playlistIdMatch[1], origins);
  }

  const songMatch = path.match(/^\/songs\/([^/]+)$/);
  if (songMatch?.[1]) {
    return resolveSongShareMeta(songMatch[1], origins);
  }

  return defaultShareMeta(path, origins);
}

export async function resolveShareMetaFromUrl(
  urlValue: string,
  fallbackOrigins: ShareOrigins,
): Promise<ShareMeta> {
  try {
    const parsed = new URL(urlValue, fallbackOrigins.assetOrigin);
    const assetOrigin = `${parsed.protocol}//${parsed.host}`;
    const canonicalOrigin = process.env.PUBLIC_SITE_URL ? PUBLIC_ORIGIN : assetOrigin;
    return resolveShareMeta(parsed.pathname, { assetOrigin, canonicalOrigin });
  } catch {
    return defaultShareMeta("/", fallbackOrigins);
  }
}

export function shareOriginsFromOrigin(origin: string): ShareOrigins {
  return {
    assetOrigin: origin,
    canonicalOrigin: process.env.PUBLIC_SITE_URL ? PUBLIC_ORIGIN : origin,
  };
}
