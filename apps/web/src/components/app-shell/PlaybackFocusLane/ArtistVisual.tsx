import { ExternalLink, Minimize2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FocusRecording } from "@/lib/playbackFocus/types";
import { PLAYBACK_FOCUS_INTERACTIVE_ATTR, stopPlaybackFocusBubble } from "@/lib/playbackFocus/interactiveTarget";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { useAudioAnalyser } from "@/features/playback-indicators/useAudioAnalyser";
import { useArtistTracks } from "@/hooks/useArtistTracks";
import { useLibraryArtists } from "@/hooks/useLibrary";
import { useUser } from "@/hooks/useUser";
import { formatPlayCount, formatProfileDate } from "@/lib/format";
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
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatCompactCount(count: number): string {
  return formatPlayCount(count) || "0";
}

export function ArtistVisual({
  artistName,
  imageUrl,
  artistBio,
  recording,
  currentTimeSec = 0,
  isPlaying = false,
  onMinimize,
}: ArtistVisualProps) {
  const { audioRef } = useAudioPlayer();
  const { isMuted, toggleMute } = usePlaybackVolume();
  const [songTransitioning, setSongTransitioning] = useState(false);
  const lastRecordingIdRef = useRef<string | null>(null);

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

  const libraryArtist = (libraryArtistsQuery.data?.data ?? []).find((artist: any) => artist.id === artistId);
  const libraryTrack = artistTracks.find((track: any) => track.id === recording?.id);

  const artistFacts = useMemo(() => {
    const user = artistQuery.data;
    const publicPlaylists = user?.publicPlaylists ?? [];
    const songCountFromCollections = publicPlaylists.reduce((sum: number, playlist: any) => sum + playlist.itemCount, 0);
    const songCount = libraryArtist?.songCount ?? Math.max(songCountFromCollections, artistTracks.length);
    const collectionCount = publicPlaylists.length;
    const listens = artistTracks.reduce((sum: number, track: any) => sum + (track.playCount ?? 0), 0);
    const likes = artistTracks.reduce((sum: number, track: any) => sum + (track.favoriteCount ?? 0), 0);
    const genres: GenreLink[] = (
      libraryArtist?.genres.length
        ? libraryArtist.genres.map((genre: any) => ({ name: genre.name, slug: genre.slug }))
        : Array.from(
            new Map(
              artistTracks
                .flatMap((track: any) => track.genres)
                .map((genre: any) => [genre.slug, { name: genre.name, slug: genre.slug }] as const),
            ).values(),
          )
    ).slice(0, 3);
    const profileLinks = (user?.profileLinks ?? []).filter((link: any) => link.url).slice(0, 4);

    return {
      stats: [
        songCount > 0 ? { label: "songs", value: formatCompactCount(songCount) } : null,
        collectionCount > 0 ? { label: "collections", value: formatCompactCount(collectionCount) } : null,
        listens > 0 ? { label: "listens", value: formatCompactCount(listens) } : null,
        likes > 0 ? { label: "likes", value: formatCompactCount(likes) } : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>,
      joined: user?.createdAt ? formatProfileDate(user.createdAt) : "",
      genres,
      profileLinks,
    };
  }, [artistQuery.data, artistTracks, libraryArtist]);

  const links = useMemo(
    () =>
      resolveArtistVisualLinks({
        recording: recording
          ? {
              ...recording,
              genreLabel: recording.genreLabel ?? libraryTrack?.genres[0]?.name ?? null,
              genres: libraryTrack?.genres.map((genre: any) => ({ name: genre.name, slug: genre.slug })),
            }
          : null,
        artistUsername: artistQuery.data?.username ?? recording?.ownerUsername,
        libraryTrackGenres: libraryTrack?.genres ?? [],
        libraryArtistGenres: libraryArtist?.genres ?? [],
      }),
    [artistQuery.data?.username, libraryArtist?.genres, libraryTrack, recording],
  );

  const badgeGenres = links.recordingGenres.filter(
    (genre) => !artistFacts.genres.some((item) => item.slug === genre.slug),
  );

  const artistImage = imageUrl ? (
    <img
      src={imageUrl}
      alt={artistName ?? ""}
      className="focus-lane__artist-image aspect-square w-28 rounded-sm border-2 border-white/10 object-cover shadow-[0_8px_30px_rgb(0,0,0,0.5)] sm:w-36"
    />
  ) : (
    <div
      className="focus-lane__artist-image focus-lane__artist-image--fallback aspect-square w-28 rounded-sm border-2 border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] sm:w-36"
      aria-hidden
    />
  );

  useEffect(() => {
    if (!recordingId) return;

    const previousRecordingId = lastRecordingIdRef.current;
    lastRecordingIdRef.current = recordingId;
    if (previousRecordingId === recordingId) return;

    setSongTransitioning(true);

    const timeout = window.setTimeout(() => {
      setSongTransitioning(false);
    }, 900);

    return () => window.clearTimeout(timeout);
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
      // Use slightly lower exponent to let energy peak higher, creating punchier visuals
      const energyBoost = Math.pow(totalEnergy, 1.3);
      
      timeAccumulator += dt * (15 + energyBoost * 80);
      
      if (containerRef.current) {
        const hue = timeAccumulator % 360;
        
        // Brighten and intensify border opacity
        containerRef.current.style.borderColor = `hsla(${hue}, 80%, ${60 + energyBoost * 25}%, ${0.5 + energyBoost * 0.5})`;
        
        const isMobile = window.matchMedia("(max-width: 639px)").matches;
        const spreadScale = isMobile ? 0.45 : 1;
        const spread1 = (2 + energyBoost * 15) * spreadScale;
        const spread2 = (spread1 + 4 + energyBoost * 25) * spreadScale;
        
        containerRef.current.style.boxShadow = [
          `0 0 0 ${spread1.toFixed(1)}px hsla(${hue}, 80%, 65%, ${0.3 + energyBoost * 0.7})`,
          `0 0 0 ${spread2.toFixed(1)}px hsla(${(hue + 60) % 360}, 80%, 60%, ${0.1 + energyBoost * 0.4})`,
          `0 10px 40px rgba(0,0,0,0.5)`
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

  return (
    <div
      ref={containerRef}
      {...{ [PLAYBACK_FOCUS_INTERACTIVE_ATTR]: "" }}
      className={`focus-lane__artist focus-lane__interactive relative mx-auto flex w-full min-w-0 max-w-2xl flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-4 shadow-2xl backdrop-blur-xl sm:gap-4 sm:rounded-3xl sm:p-6${
        songTransitioning ? " is-song-transitioning" : ""
      }`}
    >
      {onMinimize ? (
        <button
          type="button"
          className="focus-lane__artist-return"
          title="Minimize player"
          aria-label="Minimize player"
          onPointerDown={stopPlaybackFocusBubble}
          onClick={(event) => {
            stopPlaybackFocusBubble(event);
            onMinimize();
          }}
        >
          <Minimize2 size={16} aria-hidden />
        </button>
      ) : null}
      <div className="flex min-w-0 items-start gap-3 sm:gap-5">
        {links.artistHref ? (
          <FocusLaneLink
            to={links.artistHref}
            title={artistName ? `View ${artistName}` : "View artist profile"}
            className="focus-lane__artist-image-link shrink-0"
          >
            {artistImage}
          </FocusLaneLink>
        ) : (
          <div className="shrink-0">{artistImage}</div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden pt-0.5 sm:gap-2.5">
          {artistName ? (
            <>
              {links.artistHref ? (
                <FocusLaneLink
                  to={links.artistHref}
                  title={`View ${artistName}`}
                  className="focus-lane__artist-name-link truncate text-2xl font-extrabold leading-none tracking-tight text-white drop-shadow-md transition hover:text-[var(--color-brand)] sm:text-4xl"
                >
                  {artistName}
                </FocusLaneLink>
              ) : (
                <p className="truncate text-2xl font-extrabold leading-none tracking-tight text-white drop-shadow-md sm:text-4xl">
                  {artistName}
                </p>
              )}
              {artistFacts.genres.length > 0 ? (
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  {artistFacts.genres.map((genre) => (
                    <FocusLaneGenreLink key={genre.slug} genre={genre} />
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
          {artistFacts.profileLinks.length > 0 ? (
            <nav
              aria-label={artistName ? `${artistName} social links` : "Artist social links"}
              className="flex min-w-0 flex-wrap items-center gap-1.5"
            >
              {artistFacts.profileLinks.map((link) => {
                const platform = getProfileLinkPlatform(link.platform);
                const Icon = platform.icon;
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    title={link.label || platform.label}
                    className="inline-flex h-8 max-w-[9rem] items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 text-[11px] font-semibold text-white/68 transition hover:border-white/25 hover:bg-white/[0.09] hover:text-white"
                    onPointerDown={stopPlaybackFocusBubble}
                    onClick={stopPlaybackFocusBubble}
                  >
                    <Icon size={13} className="shrink-0" aria-hidden />
                    <span className="min-w-0 truncate">{link.label || platform.label}</span>
                    <ExternalLink size={11} className="shrink-0 opacity-55" aria-hidden />
                  </a>
                );
              })}
            </nav>
          ) : (
            <div className="min-h-8" aria-hidden />
          )}
          <PlaybackFocusReactionBar recordingId={recording?.id} />
          {artistBio || badgeGenres.length > 0 ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-medium text-white/70 drop-shadow-sm sm:text-base">
              {badgeGenres.map((genre) => (
                <FocusLaneGenreLink
                  key={genre.slug}
                  genre={genre}
                  className="focus-lane__artist-genre-badge shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition hover:bg-white/18 hover:text-white sm:text-xs"
                />
              ))}
              {artistBio ? <span className="min-w-0 truncate">{artistBio}</span> : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Tier 2: Currently Playing */}
      {recording ? (
        <div className="mt-1 flex min-w-0 items-center rounded-xl border border-white/5 bg-black/30 px-3 py-2.5 sm:mt-2 sm:px-4 sm:py-3">
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
                  active={true}
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
        </div>
      ) : null}
    </div>
  );
}
