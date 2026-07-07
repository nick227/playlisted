import type { PlaylistSummary } from "@playlisted/client-sdk";
import { Link } from "react-router-dom";

import { profilePath, playlistPath } from "@/lib/routes";

import { MuseumPlaylistCard } from "./MuseumPlaylistCard";
import {
  MUSEUM_COL_LEFT,
  MUSEUM_COL_RIGHT,
  MUSEUM_EXHIBIT_RADIUS,
  MUSEUM_GRID,
  MuseumArtBackdrop,
  MuseumExhibitFrame,
  MuseumPanel,
  MuseumSectionHeader,
} from "./museumUi";

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
    <section className={`relative min-w-0 overflow-hidden ${MUSEUM_EXHIBIT_RADIUS}`}>
      <MuseumArtBackdrop imageUrl={playlist.coverArtUrl} title={playlist.title} intensity="soft" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--color-canvas)] via-[var(--color-canvas)]/90 to-[var(--color-canvas)]/96" />

      <MuseumExhibitFrame className="relative">
        <div className={MUSEUM_GRID}>
          <div className={`${MUSEUM_COL_LEFT} hidden md:block`}>
            <MuseumSectionHeader label="Playlist" href={href} hrefLabel="Open" />
          </div>
          <div className={`${MUSEUM_COL_RIGHT} hidden md:block`}>
            <MuseumSectionHeader label="Details" />
          </div>

          <div className={MUSEUM_COL_LEFT}>
            <MuseumPlaylistCard playlist={playlist} className="w-full" elevated />
          </div>

          <div className={MUSEUM_COL_RIGHT}>
            <MuseumPanel padding="roomy" className="h-full bg-black/15">
              <h3 className="text-[clamp(1.5rem,2.8vw,2.25rem)] font-extralight leading-tight tracking-tight text-white">
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
        </div>
      </MuseumExhibitFrame>
    </section>
  );
}
