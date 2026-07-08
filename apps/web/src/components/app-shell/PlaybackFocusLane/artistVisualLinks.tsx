import type { ReactNode } from "react";

import { AppLink } from "@/components/navigation/AppLink";
import { genrePath } from "@/lib/browsePaths";
import type { FocusRecording } from "@/lib/playbackFocus/types";
import { playlistRecordingPath, profilePath } from "@/lib/routes";
import { stopPlaybackFocusBubble } from "@/lib/playbackFocus/interactiveTarget";

export type GenreLink = {
  name: string;
  slug: string;
};

export type ArtistVisualLinks = {
  artistHref: string | null;
  songHref: string | null;
  recordingGenres: GenreLink[];
};

type ResolveArtistVisualLinksInput = {
  recording: FocusRecording | null | undefined;
  artistUsername?: string | null;
  libraryTrackGenres?: GenreLink[];
};

function slugifyGenreLabel(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueGenres(items: GenreLink[]): GenreLink[] {
  const seen = new Set<string>();
  const result: GenreLink[] = [];
  for (const item of items) {
    const slug = item.slug.trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    result.push(item);
  }
  return result;
}

export function resolveArtistVisualLinks({
  recording,
  artistUsername,
  libraryTrackGenres = [],
}: ResolveArtistVisualLinksInput): ArtistVisualLinks {
  const username = artistUsername ?? recording?.ownerUsername ?? null;
  const artistHref = username ? profilePath(username) : null;

  const songHref =
    recording?.playlistId && recording.title
      ? playlistRecordingPath(
          {
            id: recording.playlistId,
            username: username ?? undefined,
            slug: recording.playlistSlug ?? undefined,
          },
          { title: recording.title },
        )
      : null;

  const recordingGenres = uniqueGenres([
    ...(recording?.genres ?? []),
    ...libraryTrackGenres,
    ...(recording?.genreLabel
      ? [{ name: recording.genreLabel, slug: slugifyGenreLabel(recording.genreLabel) }]
      : []),
  ]);

  return {
    artistHref,
    songHref,
    recordingGenres,
  };
}

type FocusLaneLinkProps = {
  to: string;
  className?: string;
  title?: string;
  children: ReactNode;
};

export function FocusLaneLink({ to, className = "", title, children }: FocusLaneLinkProps) {
  return (
    <AppLink
      to={to}
      title={title}
      className={className}
      onPointerDown={stopPlaybackFocusBubble}
    >
      {children}
    </AppLink>
  );
}

export function FocusLaneGenreLink({
  genre,
  className = "focus-lane__overlay-genre",
}: {
  genre: GenreLink;
  className?: string;
}) {
  return (
    <FocusLaneLink
      to={genrePath(genre.slug)}
      title={`Browse ${genre.name}`}
      className={className}
    >
      {genre.name}
    </FocusLaneLink>
  );
}
