import type { PlaylistSummary } from "@playlisted/client-sdk";
import { Link } from "react-router-dom";

import { profilePath, playlistPath } from "@/lib/routes";

import { MuseumPlaylistCard } from "./MuseumPlaylistCard";
import { MuseumArtBackdrop, MuseumPanel, MuseumSectionHeader } from "./museumUi";

interface MuseumListeningRoomProps {
  playlist: PlaylistSummary;
}

export function MuseumListeningRoom({ playlist }: MuseumListeningRoomProps) {
  const href = playlistPath({
    id: playlist.id,
    username: playlist.owner.username,
    slug: playlist.slug,
  });
  const trackLabel = playlist.itemCount === 1 ? "1 track" : `${playlist.itemCount} tracks`;

  return (
    <section className="relative overflow-hidden rounded-[1.25rem]">
      <MuseumArtBackdrop imageUrl={playlist.coverArtUrl} title={playlist.title} intensity="soft" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--color-canvas)] via-[var(--color-canvas)]/90 to-[var(--color-canvas)]/96" />

      <div className="relative grid gap-6 p-5 md:grid-cols-[minmax(0,14rem)_1fr] md:items-center md:gap-8 md:p-7">
        <MuseumPlaylistCard playlist={playlist} className="w-full max-w-[14rem]" elevated />

        <MuseumPanel padding="roomy" className="bg-black/15">
          <MuseumSectionHeader label="Playlist" href={href} hrefLabel="Open" />
          <h3 className="text-[clamp(1.6rem,3vw,2.4rem)] font-extralight leading-tight tracking-tight text-white">
            {playlist.title}
          </h3>
          <p className="mt-3 text-sm text-white/45">
            <Link to={profilePath(playlist.owner.username)} className="transition hover:text-white/80">
              {playlist.owner.displayName}
            </Link>
            <span className="mx-2 text-white/20">·</span>
            <span className="text-white/35">{trackLabel}</span>
          </p>
          {playlist.description ? (
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/38">{playlist.description}</p>
          ) : null}
        </MuseumPanel>
      </div>
    </section>
  );
}
