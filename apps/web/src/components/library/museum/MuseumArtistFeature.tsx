import type { LibraryArtist, LibrarySong } from "@playlisted/client-sdk";
import { Link } from "react-router-dom";

import { LibraryTrackList } from "@/components/library/LibraryTrackList";
import { SmartArtistCard } from "@/components/cards/SmartArtistCard";
import { artistPath } from "@/lib/browsePaths";

import {
  MuseumBankSection,
  MuseumGenrePills,
  MuseumPanel,
  MuseumTrackPanel,
} from "./museumUi";

interface MuseumArtistFeatureProps {
  artist: LibraryArtist;
  songs: LibrarySong[];
}

export function MuseumArtistFeature({
  artist,
  songs,
}: MuseumArtistFeatureProps) {
  const genreLabels = artist.genres.map((genre) => genre.name).slice(0, 2);

  return (
    <MuseumBankSection
      label="Spotlight"
      href={artistPath(artist.username)}
      hrefLabel="Profile"
      type="songSpotlight"
    >
      <MuseumPanel padding="roomy">
        <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] md:items-start">
          <div className="min-w-0">
            <div className="w-32 md:w-full">
              <SmartArtistCard
                id={artist.id}
                username={artist.username}
                displayName={artist.displayName}
                avatarUrl={artist.avatarUrl}
                shape="circle"
                className="w-full"
                playbackOrigin={`library:artist:${artist.id}`}
              />
            </div>
            <Link
              to={artistPath(artist.username)}
              className="mt-3 block text-2xl font-semibold leading-tight text-white transition hover:text-white/80"
            >
              {artist.displayName}
            </Link>
            <MuseumGenrePills labels={genreLabels} />
          </div>

          {songs.length > 0 ? (
            <MuseumTrackPanel>
              <LibraryTrackList songs={songs} />
            </MuseumTrackPanel>
          ) : (
            <div className="flex min-h-28 items-center rounded-xl border border-white/[0.07] bg-black/15 px-4 py-3">
              <p className="text-sm text-white/40">
                New work from this artist will appear here.
              </p>
            </div>
          )}
        </div>
      </MuseumPanel>
    </MuseumBankSection>
  );
}
