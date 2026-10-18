import type { MuseumPools } from "./museumTypes";
import { MuseumArtistFeature } from "./MuseumArtistFeature";
import { MuseumListeningRoom } from "./MuseumListeningRoom";
import { MuseumLyricPlacard } from "./MuseumLyricPlacard";
import { MuseumQuietRoom } from "./MuseumQuietRoom";
import { MuseumShowcase } from "./MuseumShowcase";
import { MuseumTrackListSection } from "./MuseumTrackListSection";
import { MuseumTypedGrid } from "./MuseumTypedGrid";
import { MuseumExhibitShell } from "./museumUi";
import { useMuseumInfiniteFeed } from "./useMuseumInfiniteFeed";

interface MuseumFeedProps {
  pools: MuseumPools;
}

export function MuseumFeed({ pools }: MuseumFeedProps) {
  const { exhibits, sentinelRef, hasMore } = useMuseumInfiniteFeed(pools);

  if (exhibits.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-[var(--color-text-subtle)]">
        Nothing in the library yet.
      </p>
    );
  }

  return (
    <div className="museum-feed min-w-0">
      {exhibits.map((exhibit) => (
        <MuseumExhibitShell key={exhibit.id}>
          {exhibit.kind === "showcase" ? (
            <MuseumShowcase
              title={exhibit.title}
              artist={exhibit.artist}
              songs={exhibit.songs}
              playlist={exhibit.playlist}
              playlists={exhibit.playlists}
              lyricSong={exhibit.lyricSong}
              peers={exhibit.peers}
            />
          ) : null}
          {exhibit.kind === "artist-feature" ? (
            <MuseumArtistFeature
              title={exhibit.title}
              artist={exhibit.artist}
              artists={exhibit.artists}
              songs={exhibit.songs}
            />
          ) : null}
          {exhibit.kind === "lyric-placard" ? (
            <MuseumLyricPlacard title={exhibit.title} song={exhibit.song} />
          ) : null}
          {exhibit.kind === "quiet-room" ? (
            <MuseumQuietRoom phrase={exhibit.phrase} />
          ) : null}
          {exhibit.kind === "song-tracklist" ? (
            <MuseumTrackListSection
              songs={exhibit.songs}
              label={exhibit.title ?? exhibit.label}
            />
          ) : null}
          {exhibit.kind === "song-grid" ? (
            <MuseumTypedGrid title={exhibit.title} kind="songs" songs={exhibit.songs} />
          ) : null}
          {exhibit.kind === "square-grid" ? (
            <MuseumTypedGrid title={exhibit.title} kind="square-songs" songs={exhibit.songs} />
          ) : null}
          {exhibit.kind === "artist-grid" ? (
            <MuseumTypedGrid title={exhibit.title} kind="artists" artists={exhibit.artists} />
          ) : null}
          {exhibit.kind === "playlist-grid" ? (
            <MuseumTypedGrid title={exhibit.title} kind="playlists" playlists={exhibit.playlists} />
          ) : null}
          {exhibit.kind === "listening-room" ? (
            <MuseumListeningRoom
              title={exhibit.title}
              playlist={exhibit.playlist}
              songs={exhibit.songs}
            />
          ) : null}
        </MuseumExhibitShell>
      ))}

      {hasMore ? <div ref={sentinelRef} className="h-10" aria-hidden /> : null}
    </div>
  );
}
