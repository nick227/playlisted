import { getPlaylistHref } from "./playlistHref.js";
import { normalizeUploadUrl, resolveRecordingArtworkUrl } from "./mediaUrls.js";

export function mapPlaylistSummary(playlist: {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  description: string | null;
  coverArtUrl: string | null;
  type: string;
  visibility: string;
  status: string;
  featured: boolean;
  isPinnedOnProfile: boolean;
  itemCount: number;
  totalDurationSeconds: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  owner: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    heroImageUrl: string | null;
    role: string;
  };
  tags: { tag: { id: string; name: string; slug: string; kind: string } }[];
}) {
  return {
    id: playlist.id,
    href: getPlaylistHref(playlist),
    ownerId: playlist.ownerId,
    title: playlist.title,
    slug: playlist.slug,
    description: playlist.description,
    coverArtUrl: normalizeUploadUrl(playlist.coverArtUrl),
    type: playlist.type,
    visibility: playlist.visibility,
    status: playlist.status,
    featured: playlist.featured,
    isPinnedOnProfile: playlist.isPinnedOnProfile,
    itemCount: playlist.itemCount,
    totalDurationSeconds: playlist.totalDurationSeconds,
    publishedAt: playlist.publishedAt?.toISOString() ?? null,
    createdAt: playlist.createdAt.toISOString(),
    updatedAt: playlist.updatedAt.toISOString(),
    owner: {
      id: playlist.owner.id,
      username: playlist.owner.username,
      displayName: playlist.owner.displayName,
      avatarUrl: normalizeUploadUrl(playlist.owner.avatarUrl),
      heroImageUrl: normalizeUploadUrl(playlist.owner.heroImageUrl),
      role: playlist.owner.role,
    },
    tags: playlist.tags.map(({ tag }) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      kind: tag.kind,
    })),
  };
}

export function mapRecordingInPlaylist(recording: {
  id: string;
  uploaderId: string;
  publishedPlaylistId: string;
  title: string;
  description: string | null;
  audioUrl: string;
  audioMimeType: string | null;
  audioBytes: bigint | null;
  durationSeconds: number | null;
  artworkUrl: string | null;
  trackNumber: number | null;
  episodeNumber: number | null;
  recordingType: string;
  visibility: string;
  status: string;
  explicit: boolean;
  releaseDate: Date | null;
  playCount: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  uploader?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    role: string;
  };
  tags?: { tag: { id: string; name: string; slug: string; kind: string } }[];
}, fallbackArtworkUrl?: string | null) {
  return {
    id: recording.id,
    uploaderId: recording.uploaderId,
    publishedPlaylistId: recording.publishedPlaylistId,
    title: recording.title,
    description: recording.description,
    audioUrl: normalizeUploadUrl(recording.audioUrl) ?? recording.audioUrl,
    audioMimeType: recording.audioMimeType,
    audioBytes: recording.audioBytes ? Number(recording.audioBytes) : null,
    artworkUrl: resolveRecordingArtworkUrl(recording, { coverArtUrl: fallbackArtworkUrl }),
    durationSeconds: recording.durationSeconds,
    trackNumber: recording.trackNumber,
    episodeNumber: recording.episodeNumber,
    recordingType: recording.recordingType,
    visibility: recording.visibility,
    status: recording.status,
    explicit: recording.explicit,
    releaseDate: recording.releaseDate?.toISOString() ?? null,
    playCount: recording.playCount,
    publishedAt: recording.publishedAt?.toISOString() ?? null,
    createdAt: recording.createdAt.toISOString(),
    updatedAt: recording.updatedAt.toISOString(),
    uploader: recording.uploader
      ? {
          id: recording.uploader.id,
          username: recording.uploader.username,
          displayName: recording.uploader.displayName,
          avatarUrl: recording.uploader.avatarUrl,
          role: recording.uploader.role,
        }
      : undefined,
    tags: recording.tags?.map(({ tag }) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      kind: tag.kind,
    })),
  };
}

export function mapPlaylistDetail(playlist: Parameters<typeof mapPlaylistSummary>[0] & {
  items: { recording: Parameters<typeof mapRecordingInPlaylist>[0] }[];
}) {
  return {
    ...mapPlaylistSummary(playlist),
    recordings: playlist.items.map(({ recording }) => mapRecordingInPlaylist(recording, playlist.coverArtUrl)),
  };
}

export const playlistDetailInclude = {
  owner: true,
  tags: { include: { tag: true } },
  items: {
    include: {
      recording: {
        include: {
          uploader: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, role: true },
          },
          tags: { include: { tag: true } },
        },
      },
    },
    orderBy: { position: "asc" as const },
  },
};
