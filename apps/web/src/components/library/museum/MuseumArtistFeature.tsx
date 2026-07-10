import type { LibraryArtist, LibrarySong } from "@playlisted/client-sdk";
import { Link } from "react-router-dom";

import { LibraryTrackList } from "@/components/library/LibraryTrackList";
import { SmartArtistCard } from "@/components/cards/SmartArtistCard";
import { artistPath } from "@/lib/browsePaths";

import {
  MuseumBankSection,
  MuseumGenrePills,
  MuseumPanel,
  MuseumScrollRow,
  MuseumTrackPanel,
} from "./museumUi";

const MIN_PORTRAIT_ITEMS = 5;

interface MuseumArtistFeatureProps {
  artist: LibraryArtist;
  artists: LibraryArtist[];
  songs: LibrarySong[];
}

export function MuseumArtistFeature({
  artist,
  artists,
  songs,
}: MuseumArtistFeatureProps) {
  const portraitArtists =
    artists.length > 0
      ? artists
      : Array.from({ length: MIN_PORTRAIT_ITEMS }, () => artist);

  return (
    <MuseumBankSection
      label="Featured"
      type="songSpotlight"
    >
      <MuseumPanel padding="roomy">
        <div className="grid min-w-0 gap-8">
          <MuseumScrollRow variant="portrait">
            {portraitArtists.map((portraitArtist, index) => (
              <div key={`${portraitArtist.id}-${index}`} className="min-w-0">
                <SmartArtistCard
                  id={portraitArtist.id}
                  username={portraitArtist.username}
                  displayName={portraitArtist.displayName}
                  avatarUrl={portraitArtist.avatarUrl}
                  shape="rounded-sm"
                  className="w-full"
                  playbackOrigin={`library:artist:${portraitArtist.id}`}
                  hideDetails
                />
                <Link
                  to={artistPath(portraitArtist.username)}
                  className="mt-4 block text-xl font-semibold leading-tight text-white transition hover:text-white/80"
                >
                  {portraitArtist.displayName}
                </Link>
                <MuseumGenrePills
                  labels={portraitArtist.genres.map((genre) => genre.name).slice(0, 2)}
                />
              </div>
            ))}
          </MuseumScrollRow>

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
