import type { LibraryArtist, LibrarySong } from "@playlisted/client-sdk";
import { Link } from "react-router-dom";

import { LibraryTrackList } from "@/components/library/LibraryTrackList";
import { SmartArtistCard } from "@/components/cards/SmartArtistCard";
import { artistPath } from "@/lib/browsePaths";

import { MuseumArtBackdrop, MuseumGenrePills, MuseumSectionHeader, MuseumTrackPanel } from "./museumUi";

interface MuseumArtistFeatureProps {
  artist: LibraryArtist;
  songs: LibrarySong[];
}

export function MuseumArtistFeature({ artist, songs }: MuseumArtistFeatureProps) {
  const genreLabels = artist.genres.map((genre) => genre.name).slice(0, 2);

  return (
    <article className="relative overflow-hidden rounded-[1.25rem]">
      <MuseumArtBackdrop imageUrl={artist.avatarUrl} title={artist.displayName} intensity="soft" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--color-canvas)] via-[var(--color-canvas)]/88 to-[var(--color-canvas)]/94" />

      <div className="relative grid gap-8 p-5 md:grid-cols-12 md:items-start md:p-7">
        <div className="md:col-span-4">
          <MuseumSectionHeader label="Artist" />
          <SmartArtistCard
            id={artist.id}
            username={artist.username}
            displayName={artist.displayName}
            avatarUrl={artist.avatarUrl}
            shape="circle"
            className="max-w-[13rem]"
            playbackOrigin={`library:artist:${artist.id}`}
          />
          <Link
            to={artistPath(artist.username)}
            className="mt-5 block text-2xl font-light tracking-tight text-white transition hover:text-[var(--color-brand)] md:text-[2rem]"
          >
            {artist.displayName}
          </Link>
          <MuseumGenrePills labels={genreLabels} />
        </div>

        <div className="md:col-span-8">
          <MuseumSectionHeader label="From this artist" href={artistPath(artist.username)} hrefLabel="Profile" />
          {songs.length > 0 ? (
            <MuseumTrackPanel>
              <LibraryTrackList songs={songs} />
            </MuseumTrackPanel>
          ) : (
            <div className="flex min-h-32 items-center rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5">
              <p className="text-sm text-white/35">New work from this artist will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
