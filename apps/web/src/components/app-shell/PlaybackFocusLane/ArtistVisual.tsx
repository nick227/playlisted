import { Loader2, Minimize2, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FocusRecording } from "@/lib/playbackFocus/types";
import { PLAYBACK_FOCUS_INTERACTIVE_ATTR, stopPlaybackFocusBubble } from "@/lib/playbackFocus/interactiveTarget";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { useAudioAnalyser } from "@/features/playback-indicators/useAudioAnalyser";
import { useArtistTracks } from "@/hooks/useArtistTracks";
import { useLibraryArtists } from "@/hooks/useLibrary";
import { useUser } from "@/hooks/useUser";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { usePlaybackVolume } from "@/providers/PlaybackVolumeProvider";
import { getProfileLinkPlatform } from "@/components/profile/profileLinks";

import {
  FocusLaneGenreLink,
  FocusLaneLink,
  resolveArtistVisualLinks,
  type GenreLink,
} from "./artistVisualLinks";
import { PlaybackFocusReactionBar } from "./PlaybackFocusReactionBar";

type ArtistVisualProps = {
  artistName?: string;
  imageUrl?: string;
  artistBio?: string | null;
  recording?: FocusRecording | null;
  currentTimeSec?: number;
  isPlaying?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const AVATAR_RELOAD_MS = 2000;
const SONG_FLASH_MS = 520;

function ArtistHeroImage({
  imageUrl,
  artistName,
  reloading,
}: {
  imageUrl?: string;
  artistName?: string;
  reloading: boolean;
}) {
  return (
    <>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={artistName ?? ""}
          className="focus-lane__artist-image absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="focus-lane__artist-image focus-lane__artist-image--fallback absolute inset-0 h-full w-full"
          aria-hidden
        />
      )}
      <div className="focus-lane__artist-hero-scrim absolute inset-0" aria-hidden />
      {reloading ? (
        <div className="focus-lane__artist-avatar-loading absolute inset-0 z-10" aria-busy="true" aria-label="Loading track">
          <Loader2 className="focus-lane__artist-avatar-spinner" aria-hidden />
        </div>
      ) : null}
    </>
  );
}

export function ArtistVisual({
  artistName,
  imageUrl,
  artistBio,
  recording,
  currentTimeSec = 0,
  isPlaying = false,
  onMinimize,
  onClose,
}: ArtistVisualProps) {
  const { audioRef } = useAudioPlayer();
  const { isMuted, toggleMute } = usePlaybackVolume();
  const [songTransitioning, setSongTransitioning] = useState(false);
  const [avatarReloading, setAvatarReloading] = useState(false);
  const [frozenHeight, setFrozenHeight] = useState<number | null>(null);
  const lastRecordingIdRef = useRef<string | null>(null);
  const reloadGenerationRef = useRef(0);

  const handleToggleMute = (e: React.MouseEvent) => {
    stopPlaybackFocusBubble(e);
    toggleMute();
  };
  const { analyser, frequencyData, connected } = useAudioAnalyser(audioRef);
  const containerRef = useRef<HTMLDivElement>(null);
  const artistId = recording?.ownerId ?? undefined;
  const recordingId = recording?.id ?? null;
  const artistQuery = useUser(artistId);
  const libraryArtistsQuery = useLibraryArtists();
  const { tracks: artistTracks } = useArtistTracks(artistId);

  const libraryArtist = (libraryArtistsQuery.data?.data ?? []).find((artist) => artist.id === artistId);
  const libraryTrack = artistTracks.find((track) => track.id === recording?.id);

  const artistMeta = useMemo(() => {
    const user = artistQuery.data;
    const genres: GenreLink[] = (
      libraryArtist?.genres.length
        ? libraryArtist.genres.map((genre) => ({ name: genre.name, slug: genre.slug }))
        : Array.from(
            new Map(
              artistTracks
                .flatMap((track) => track.genres)
                .map((genre) => [genre.slug, { name: genre.name, slug: genre.slug }] as const),
            ).values(),
          )
    ).slice(0, 3);
    const profileLinks = (user?.profileLinks ?? []).filter((link) => link.url).slice(0, 4);

    return { genres, profileLinks };
  }, [artistQuery.data, artistTracks, libraryArtist]);

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
        artistUsername: artistQuery.data?.username ?? recording?.ownerUsername,
        libraryTrackGenres: libraryTrack?.genres ?? [],
        libraryArtistGenres: libraryArtist?.genres ?? [],
      }),
    [artistQuery.data?.username, libraryArtist?.genres, libraryTrack, recording],
  );

  const displayGenres = useMemo(() => {
    const seen = new Set<string>();
    const result: GenreLink[] = [];
    for (const genre of [...artistMeta.genres, ...links.recordingGenres]) {
      if (seen.has(genre.slug)) continue;
      seen.add(genre.slug);
      result.push(genre);
    }
    return result.slice(0, 4);
  }, [artistMeta.genres, links.recordingGenres]);

  useEffect(() => {
    if (!recordingId) return;

    const previousRecordingId = lastRecordingIdRef.current;
    if (previousRecordingId === recordingId) return;

    const isTrackChange = previousRecordingId !== null;
    if (!isTrackChange) {
      lastRecordingIdRef.current = recordingId;
      return;
    }

    const generation = ++reloadGenerationRef.current;

    if (containerRef.current) {
      setFrozenHeight(containerRef.current.offsetHeight);
    }
    setSongTransitioning(true);
    setAvatarReloading(true);

    const flashTimeout = window.setTimeout(() => {
      if (reloadGenerationRef.current !== generation) return;
      setSongTransitioning(false);
      setFrozenHeight(null);
    }, SONG_FLASH_MS);

    const avatarTimeout = window.setTimeout(() => {
      if (reloadGenerationRef.current !== generation) return;
      setAvatarReloading(false);
      lastRecordingIdRef.current = recordingId;
    }, AVATAR_RELOAD_MS);

    return () => {
      window.clearTimeout(flashTimeout);
      window.clearTimeout(avatarTimeout);
    };
  }, [recordingId]);

  useEffect(() => {
    let cancelled = false;
    let timeAccumulator = 0;
    let lastTime = performance.now();

    const getEnergy = (start: number, end: number, data: Uint8Array<ArrayBuffer>) => {
      let sum = 0;
      for (let i = start; i < end; i++) {
        sum += data[i];
      }
      return sum / (end - start) / 255;
    };

    const loop = (now: DOMHighResTimeStamp) => {
      if (cancelled) return;

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      let bass = 0;
      let mids = 0;
      let highs = 0;

      if (connected && analyser && isPlaying) {
        analyser.getByteFrequencyData(frequencyData);
        bass = getEnergy(0, 10, frequencyData);
        mids = getEnergy(10, 60, frequencyData);
        highs = getEnergy(60, 200, frequencyData);
      }

      const totalEnergy = (bass + mids + highs) / 3;
      const energyBoost = Math.pow(totalEnergy, 1.3);

      timeAccumulator += dt * (15 + energyBoost * 80);

      if (containerRef.current) {
        const hue = timeAccumulator % 360;

        containerRef.current.style.borderColor = `hsla(${hue}, 80%, ${60 + energyBoost * 25}%, ${0.5 + energyBoost * 0.5})`;

        const isMobile = window.matchMedia("(max-width: 639px)").matches;
        const spreadScale = isMobile ? 0.45 : 1;
        const spread1 = (2 + energyBoost * 15) * spreadScale;
        const spread2 = (spread1 + 4 + energyBoost * 25) * spreadScale;

        containerRef.current.style.boxShadow = [
          `0 0 0 ${spread1.toFixed(1)}px hsla(${hue}, 80%, 65%, ${0.3 + energyBoost * 0.7})`,
          `0 0 0 ${spread2.toFixed(1)}px hsla(${(hue + 60) % 360}, 80%, 60%, ${0.1 + energyBoost * 0.4})`,
          `0 10px 40px rgba(0,0,0,0.5)`,
        ].join(", ");
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.style.borderColor = "";
        containerRef.current.style.boxShadow = "";
      }
    };
  }, [analyser, frequencyData, connected, isPlaying]);

  const durationStr = recording?.durationSeconds
    ? formatDuration(recording.durationSeconds)
    : "--:--";
  const currentStr = formatDuration(currentTimeSec);

  const heroInner = (
    <div className="focus-lane__artist-hero relative aspect-[5/3] w-full overflow-hidden rounded-xl sm:aspect-[2/1] sm:rounded-2xl">
      <ArtistHeroImage imageUrl={imageUrl} artistName={artistName} reloading={avatarReloading} />
      <div className="focus-lane__artist-hero-header absolute inset-x-0 top-0 z-20 p-3 sm:p-4">
        <div className="min-w-0 max-w-[78%]">
          <div className="focus-lane__artist-name-slot">
            {artistName ? (
              links.artistHref ? (
                <FocusLaneLink
                  to={links.artistHref}
                  title={`View ${artistName}`}
                  className="focus-lane__artist-name-link block truncate text-xl font-extrabold leading-tight tracking-tight text-white drop-shadow-md transition hover:text-[var(--color-brand)] sm:text-3xl"
                >
                  {artistName}
                </FocusLaneLink>
              ) : (
                <p className="truncate text-xl font-extrabold leading-tight tracking-tight text-white drop-shadow-md sm:text-3xl">
                  {artistName}
                </p>
              )
            ) : (
              <span className="block h-7 sm:h-9" aria-hidden />
            )}
          </div>
          {artistBio ? (
            <p className="focus-lane__artist-bio mt-1 line-clamp-2 text-xs leading-snug text-white/75 drop-shadow sm:text-sm">
              {artistBio}
            </p>
          ) : null}
          {displayGenres.length > 0 ? (
            <div className="focus-lane__artist-genre-slot mt-1.5 flex flex-wrap items-center gap-1.5">
              {displayGenres.map((genre) => (
                <FocusLaneGenreLink
                  key={genre.slug}
                  genre={genre}
                  className="focus-lane__artist-genre-badge shrink-0 rounded bg-black/35 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm transition hover:bg-black/50 hover:text-white"
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="focus-lane__artist-hero-footer absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-2 p-3 sm:gap-3 sm:p-4">
        <div
          className="focus-lane__artist-actions shrink-0"
          onPointerDown={stopPlaybackFocusBubble}
          onClick={stopPlaybackFocusBubble}
        >
          <PlaybackFocusReactionBar recordingId={recording?.id} artistId={artistId} />
        </div>
        {artistMeta.profileLinks.length > 0 ? (
          <nav
            aria-label={artistName ? `${artistName} social links` : "Artist social links"}
            className="focus-lane__artist-socials flex min-w-0 flex-1 flex-wrap items-end justify-end gap-1.5"
          >
            {artistMeta.profileLinks.map((link) => {
              const platform = getProfileLinkPlatform(link.platform);
              const Icon = platform.icon;
              const label = link.label || platform.label;
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  title={label}
                  className="focus-lane__artist-social inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-2.5 text-[10px] font-semibold text-white/80 backdrop-blur-sm transition hover:border-white/30 hover:bg-black/60 hover:text-white sm:h-8 sm:gap-2 sm:px-3 sm:text-xs"
                  onPointerDown={stopPlaybackFocusBubble}
                  onClick={stopPlaybackFocusBubble}
                >
                  <Icon size={12} aria-hidden className="shrink-0" />
                  <span className="min-w-0 truncate">{label}</span>
                </a>
              );
            })}
          </nav>
        ) : null}
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      {...{ [PLAYBACK_FOCUS_INTERACTIVE_ATTR]: "" }}
      style={{ minHeight: frozenHeight ? `${frozenHeight}px` : undefined }}
      className="focus-lane__artist focus-lane__interactive relative mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-2.5 rounded-2xl border border-white/10 bg-black/40 p-3 shadow-2xl backdrop-blur-xl sm:gap-3 sm:rounded-3xl sm:p-4"
    >
      {songTransitioning ? <div className="focus-lane__artist-flash" aria-hidden /> : null}
      <div
        className={`focus-lane__artist-content flex min-w-0 flex-col gap-2.5 sm:gap-3${
          songTransitioning ? " is-song-transitioning" : ""
        }`}
      >
        {(onMinimize || onClose) ? (
          <div className="focus-lane__artist-controls">
            {onMinimize ? (
              <button
                type="button"
                className="focus-lane__artist-control"
                title="Minimize player"
                aria-label="Minimize player"
                onPointerDown={stopPlaybackFocusBubble}
                onClick={(event) => {
                  stopPlaybackFocusBubble(event);
                  onMinimize();
                }}
              >
                <Minimize2 size={15} aria-hidden />
              </button>
            ) : null}
            {onClose ? (
              <button
                type="button"
                className="focus-lane__artist-control"
                title="Return to page"
                aria-label="Return to page"
                onPointerDown={stopPlaybackFocusBubble}
                onClick={(event) => {
                  stopPlaybackFocusBubble(event);
                  onClose();
                }}
              >
                <X size={15} aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}

        {heroInner}

        <div className="flex h-[3.25rem] min-w-0 items-center rounded-xl border border-white/5 bg-black/30 px-3 sm:h-14 sm:px-4">
          {recording ? (
            <>
              <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden sm:gap-4">
                {links.songHref ? (
                  <FocusLaneLink
                    to={links.songHref}
                    title={`Open ${recording.title}`}
                    className="focus-lane__song-art-link shrink-0"
                  >
                    {recording.artworkUrl ? (
                      <img
                        src={recording.artworkUrl}
                        alt={recording.title}
                        className="h-9 w-9 rounded-md object-cover shadow-md sm:h-10 sm:w-10"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-md bg-white/10 shadow-md sm:h-10 sm:w-10" />
                    )}
                  </FocusLaneLink>
                ) : recording.artworkUrl ? (
                  <img
                    src={recording.artworkUrl}
                    alt={recording.title}
                    className="h-9 w-9 shrink-0 rounded-md object-cover shadow-md sm:h-10 sm:w-10"
                  />
                ) : (
                  <div className="h-9 w-9 shrink-0 rounded-md bg-white/10 shadow-md sm:h-10 sm:w-10" />
                )}
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                  {links.songHref ? (
                    <FocusLaneLink
                      to={links.songHref}
                      title={`Open ${recording.title}`}
                      className="focus-lane__song-title-link truncate text-sm font-semibold text-white/90 transition hover:text-[var(--color-brand)]"
                    >
                      {recording.title}
                    </FocusLaneLink>
                  ) : (
                    <span className="truncate text-sm font-semibold text-white/90">
                      {recording.title}
                    </span>
                  )}
                  <div className="mt-0.5 flex min-w-0 items-center gap-1.5 sm:gap-2">
                    <PlaybackBars
                      active
                      playing={isPlaying}
                      className="origin-left shrink-0 scale-[0.65] sm:scale-75"
                    />
                    <span className="hidden shrink-0 text-[10px] font-medium tracking-wider text-white/50 sm:inline sm:text-xs">
                      NOW PLAYING
                    </span>
                    <span className="hidden shrink-0 px-0.5 text-xs font-medium text-white/50 sm:inline">
                      •
                    </span>
                    <span className="min-w-0 truncate text-[10px] font-medium tabular-nums text-white/50 sm:text-xs">
                      {currentStr} / {durationStr}
                    </span>
                  </div>
                </div>
              </div>

              <div className="ml-3 flex shrink-0 items-center gap-1.5 sm:ml-4 sm:gap-2">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  onPointerDown={stopPlaybackFocusBubble}
                  className="focus-lane__reaction"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>
            </>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4" aria-hidden>
              <div className="h-9 w-9 shrink-0 rounded-md bg-white/10 sm:h-10 sm:w-10" />
              <div className="h-4 flex-1 rounded bg-white/5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
