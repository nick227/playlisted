import type { MuseumPools } from "./museumTypes";
import { MuseumArtistFeature } from "./MuseumArtistFeature";
import { MuseumListeningRoom } from "./MuseumListeningRoom";
import { MuseumLyricPlacard } from "./MuseumLyricPlacard";
import { MuseumQuietRoom } from "./MuseumQuietRoom";
import { MuseumShowcase } from "./MuseumShowcase";
import { MuseumTrackListSection } from "./MuseumTrackListSection";
import { MuseumTypedGrid } from "./MuseumTypedGrid";
import { MuseumExhibitDivider, MuseumExhibitShell } from "./museumUi";
import { useMuseumInfiniteFeed } from "./useMuseumInfiniteFeed";

interface MuseumFeedProps {
  pools: MuseumPools;
}

export function MuseumFeed({ pools }: MuseumFeedProps) {
  const { exhibits, sentinelRef } = useMuseumInfiniteFeed(pools);

  if (exhibits.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-[var(--color-text-subtle)]">
        Nothing in the library yet.
      </p>
    );
  }

  return (
    <div className="min-w-0 space-y-14 md:space-y-20">
      {exhibits.map((exhibit, index) => (
        <MuseumExhibitShell key={exhibit.id}>
          {index > 0 ? (
            <div className="pb-14 md:pb-20">
              <MuseumExhibitDivider />
            </div>
          ) : null}

          {exhibit.kind === "showcase" ? (
            <MuseumShowcase
              artist={exhibit.artist}
              songs={exhibit.songs}
              playlist={exhibit.playlist}
              lyricSong={exhibit.lyricSong}
              peers={exhibit.peers}
            />
          ) : null}
          {exhibit.kind === "artist-feature" ? (
            <MuseumArtistFeature artist={exhibit.artist} songs={exhibit.songs} />
          ) : null}
          {exhibit.kind === "lyric-placard" ? <MuseumLyricPlacard song={exhibit.song} /> : null}
          {exhibit.kind === "quiet-room" ? <MuseumQuietRoom phrase={exhibit.phrase} /> : null}
          {exhibit.kind === "song-tracklist" ? (
            <MuseumTrackListSection songs={exhibit.songs} label={exhibit.label} />
          ) : null}
          {exhibit.kind === "song-grid" ? <MuseumTypedGrid kind="songs" songs={exhibit.songs} /> : null}
          {exhibit.kind === "artist-grid" ? (
            <MuseumTypedGrid kind="artists" artists={exhibit.artists} />
          ) : null}
          {exhibit.kind === "playlist-grid" ? (
            <MuseumTypedGrid kind="playlists" playlists={exhibit.playlists} />
          ) : null}
          {exhibit.kind === "listening-room" ? <MuseumListeningRoom playlist={exhibit.playlist} /> : null}
        </MuseumExhibitShell>
      ))}

      <div ref={sentinelRef} className="h-10" aria-hidden />
    </div>
  );
}
