import { useMemo } from "react";

import type { FocusRecording } from "@/lib/playbackFocus/types";
import { PLAYBACK_FOCUS_INTERACTIVE_ATTR } from "@/lib/playbackFocus/interactiveTarget";
import { formatDuration, formatPlayCount } from "@/lib/format";
import { useArtistTracks } from "@/hooks/useArtistTracks";

import {
  FocusLaneGenreLink,
  FocusLaneLink,
  resolveArtistVisualLinks,
} from "./artistVisualLinks";

type TitleIntroVisualProps = {
  title: string;
  artistName?: string | null;
  recording?: FocusRecording | null;
};

function formatRecordingType(recordingType: string | null | undefined): string | null {
  if (!recordingType) return null;
  return recordingType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function TitleIntroMetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center sm:items-start">
      <span className="truncate text-sm font-extrabold tabular-nums leading-none text-white sm:text-base">
        {value}
      </span>
      <span className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-wider text-white/45 sm:text-[10px]">
        {label}
      </span>
    </div>
  );
}

export function TitleIntroVisual({
  title,
  artistName,
  recording,
}: TitleIntroVisualProps) {
  const artistId = recording?.ownerId ?? undefined;
  const { tracks: artistTracks } = useArtistTracks(artistId);
  const libraryTrack = artistTracks.find((track) => track.id === recording?.id);

  const links = useMemo(
    () =>
      resolveArtistVisualLinks({
        recording: recording
          ? {
              ...recording,
              genreLabel: recording.genreLabel ?? libraryTrack?.genres[0]?.name ?? null,
              genres: libraryTrack?.genres.map((genre) => ({ name: genre.name, slug: genre.slug })),
            }
          : null,
        artistUsername: recording?.ownerUsername,
        libraryTrackGenres: libraryTrack?.genres ?? [],
      }),
    [libraryTrack, recording],
  );

  const imageUrl = recording?.artworkUrl;
  const recordingType = formatRecordingType(recording?.recordingType);
  const durationLabel =
    recording?.durationSeconds && recording.durationSeconds > 0
      ? formatDuration(recording.durationSeconds)
      : null;
  const playCount = recording?.playCount ?? libraryTrack?.playCount ?? 0;
  const playCountLabel = playCount > 0 ? formatPlayCount(playCount) : null;
  const primaryGenre = links.recordingGenres[0] ?? null;
  const eyebrow = [recordingType, primaryGenre?.name].filter(Boolean).join(" · ");

  const artwork = imageUrl ? (
    <img
      src={imageUrl}
      alt={title}
      className="focus-lane__title-intro-art aspect-square h-32 w-32 rounded-xl object-cover shadow-[0_12px_40px_rgba(0,0,0,0.55)] ring-1 ring-white/15 sm:h-40 sm:w-40 sm:rounded-2xl"
    />
  ) : (
    <div
      className="focus-lane__title-intro-art aspect-square h-32 w-32 rounded-xl bg-white/8 shadow-[0_12px_40px_rgba(0,0,0,0.55)] ring-1 ring-white/10 sm:h-40 sm:w-40 sm:rounded-2xl"
      aria-hidden
    />
  );

  return (
    <div
      {...{ [PLAYBACK_FOCUS_INTERACTIVE_ATTR]: "" }}
      className="focus-lane__title-intro focus-lane__interactive relative mx-auto overflow-hidden rounded-2xl border border-white/10 bg-black/45 shadow-2xl backdrop-blur-xl sm:rounded-3xl"
    >
      {imageUrl ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <img
            src={imageUrl}
            alt=""
            className="absolute -inset-[25%] h-[150%] w-[150%] object-cover opacity-35 blur-3xl saturate-125"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/55 via-black/78 to-black/92" />
        </div>
      ) : null}

      <div className="relative flex flex-col items-center gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-6 sm:p-6">
        <div className="shrink-0">
          {links.songHref ? (
            <FocusLaneLink
              to={links.songHref}
              title={`Open ${title}`}
              className="focus-lane__song-art-link block"
            >
              {artwork}
            </FocusLaneLink>
          ) : (
            artwork
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center sm:items-start sm:text-left">
          {eyebrow ? (
            <p className="max-w-full truncate text-[10px] font-bold uppercase tracking-[0.18em] text-white/50 sm:text-xs">
              {eyebrow}
            </p>
          ) : null}

          <h2 className="focus-lane__title-intro-heading mt-1 max-w-full text-balance text-2xl font-extrabold leading-[1.08] tracking-tight text-white drop-shadow-md sm:mt-1.5 sm:text-4xl">
            {title}
          </h2>

          {artistName ? (
            links.artistHref ? (
              <FocusLaneLink
                to={links.artistHref}
                title={`View ${artistName}`}
                className="focus-lane__title-intro-artist mt-2 max-w-full truncate text-base font-semibold text-white/72 transition hover:text-[var(--color-brand)] sm:text-lg"
              >
                {artistName}
              </FocusLaneLink>
            ) : (
              <p className="focus-lane__title-intro-artist mt-2 max-w-full truncate text-base font-semibold text-white/72 sm:text-lg">
                {artistName}
              </p>
            )
          ) : null}

          {(durationLabel || primaryGenre || playCountLabel) ? (
            <div className="focus-lane__title-intro-meta mt-4 flex w-full max-w-sm flex-wrap items-start justify-center gap-x-6 gap-y-3 border-t border-white/10 pt-4 sm:max-w-none sm:justify-start">
              {durationLabel ? (
                <TitleIntroMetaItem label="length" value={durationLabel} />
              ) : null}
              {primaryGenre ? (
                <div className="flex min-w-0 flex-col items-center sm:items-start">
                  <FocusLaneGenreLink
                    genre={primaryGenre}
                    className="truncate text-sm font-extrabold leading-none text-white transition hover:text-[var(--color-brand)] sm:text-base"
                  />
                  <span className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-wider text-white/45 sm:text-[10px]">
                    genre
                  </span>
                </div>
              ) : null}
              {playCountLabel ? (
                <TitleIntroMetaItem label="plays" value={playCountLabel} />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
