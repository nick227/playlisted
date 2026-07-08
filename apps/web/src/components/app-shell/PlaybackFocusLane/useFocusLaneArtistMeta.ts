import { useMemo } from "react";

import { useArtistTracks } from "@/hooks/useArtistTracks";
import { useLibraryArtists } from "@/hooks/useLibrary";
import { useUser } from "@/hooks/useUser";
import type { FocusRecording } from "@/lib/playbackFocus/types";

import { resolveArtistVisualLinks, type ArtistVisualLinks, type GenreLink } from "./artistVisualLinks";

/** Shared artist/track lookups used by the artist and title-intro overlays for genres, profile links, and hrefs. */
export function useFocusLaneArtistMeta(artistId: string | undefined, recording: FocusRecording | null | undefined) {
  const artistQuery = useUser(artistId);
  const libraryArtistsQuery = useLibraryArtists();
  const { tracks: artistTracks } = useArtistTracks(artistId);

  const libraryArtist = (libraryArtistsQuery.data?.data ?? []).find((artist) => artist.id === artistId);
  const libraryTrack = artistTracks.find((track) => track.id === recording?.id);

  const profileLinks = useMemo(
    () => (artistQuery.data?.profileLinks ?? []).filter((link) => link.url).slice(0, 4),
    [artistQuery.data?.profileLinks],
  );

  const genres: GenreLink[] = useMemo(
    () =>
      (libraryArtist?.genres.length
        ? libraryArtist.genres.map((genre) => ({ name: genre.name, slug: genre.slug }))
        : Array.from(
            new Map(
              artistTracks
                .flatMap((track) => track.genres)
                .map((genre) => [genre.slug, { name: genre.name, slug: genre.slug }] as const),
            ).values(),
          )
      ).slice(0, 3),
    [artistTracks, libraryArtist],
  );

  const links: ArtistVisualLinks = useMemo(
    () =>
      resolveArtistVisualLinks({
        recording: recording
          ? {
              ...recording,
              genreLabel: recording.genreLabel ?? libraryTrack?.genres[0]?.name ?? null,
              genres: libraryTrack?.genres.map((genre) => ({ name: genre.name, slug: genre.slug })),
            }
          : null,
        artistUsername: artistQuery.data?.username ?? recording?.ownerUsername,
        libraryTrackGenres: libraryTrack?.genres ?? [],
        libraryArtistGenres: libraryArtist?.genres ?? [],
      }),
    [artistQuery.data?.username, libraryArtist?.genres, libraryTrack, recording],
  );

  const displayGenres = useMemo(() => {
    const seen = new Set<string>();
    const result: GenreLink[] = [];
    for (const genre of [...genres, ...links.recordingGenres]) {
      if (seen.has(genre.slug)) continue;
      seen.add(genre.slug);
      result.push(genre);
    }
    return result.slice(0, 4);
  }, [genres, links.recordingGenres]);

  return {
    artist: artistQuery.data,
    libraryTrack,
    links,
    displayGenres,
    profileLinks,
  };
}
