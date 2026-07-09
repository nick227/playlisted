import type { LibrarySong, PlaylistSummary } from "@playlisted/client-sdk";
import { Link } from "react-router-dom";

import { LibraryTrackList } from "@/components/library/LibraryTrackList";
import { usePlaylist } from "@/hooks/usePlaylist";
import { profilePath, playlistPath } from "@/lib/routes";

import { MuseumPlaylistCard } from "./MuseumPlaylistCard";
import {
  MuseumBankSection,
  MuseumGenrePills,
  MuseumPanel,
  MuseumTrackPanel,
} from "./museumUi";

interface MuseumListeningRoomProps {
  playlist: PlaylistSummary;
  songs: LibrarySong[];
}

export function MuseumListeningRoom({
  playlist,
  songs,
}: MuseumListeningRoomProps) {
  const { data: playlistDetail } = usePlaylist(playlist.id);
  const href = playlistPath({
    id: playlist.id,
    username: playlist.owner.username,
    slug: playlist.slug,
  });
  const trackLabel =
    playlist.itemCount === 1 ? "1 track" : `${playlist.itemCount} tracks`;
  const genreLabels = (playlist.tags ?? [])
    .filter((tag) => tag.kind === "GENRE")
    .map((tag) => tag.name)
    .slice(0, 4);
  const playlistSongs: LibrarySong[] =
    playlistDetail?.recordings.slice(0, 6).map((recording) => ({
      ...recording,
      favoriteCount: 0,
      uploader: recording.uploader ?? playlist.owner,
      playlist: {
        id: playlist.id,
        slug: playlist.slug,
        title: playlist.title,
      },
      genres: (recording.tags ?? playlist.tags ?? [])
        .filter((tag) => tag.kind === "GENRE")
        .map((tag) => ({
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
        })),
    })) ?? songs;

  return (
    <MuseumBankSection
      label="Featured collection"
      href={href}
      hrefLabel="Open"
      type="cinematicRow"
    >
      <MuseumPanel padding="roomy">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(17rem,24rem)_minmax(0,1fr)] lg:items-start">
          <MuseumPlaylistCard
            playlist={playlist}
            className="min-w-0 w-full"
            aspect="cinematic"
            elevated
          />

          <div className="min-w-0">
            <Link
              to={href}
              className="block text-[clamp(1.5rem,3vw,2.15rem)] font-semibold leading-tight text-white transition hover:text-white/80"
            >
              {playlist.title}
            </Link>
            <p className="mt-2 text-sm text-white/48">
              <Link
                to={profilePath(playlist.owner.username)}
                className="transition hover:text-white/80"
              >
                {playlist.owner.displayName}
              </Link>
              <span className="mx-2 text-white/20">·</span>
              <span className="text-white/38">{trackLabel}</span>
            </p>
            {playlist.description ? (
              <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-white/42">
                {playlist.description}
              </p>
            ) : null}
            <MuseumGenrePills labels={genreLabels} />
          </div>

          {playlistSongs.length > 0 ? (
            <div className="min-w-0 lg:col-span-2">
              <MuseumTrackPanel>
                <LibraryTrackList songs={playlistSongs} />
              </MuseumTrackPanel>
            </div>
          ) : null}
        </div>
      </MuseumPanel>
    </MuseumBankSection>
  );
}
