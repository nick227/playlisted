import { useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart2, Pause, Play, Radio, Users, Upload } from "lucide-react";

import { DEFAULT_COLLECTION_TITLE } from "@/components/studio/studioCollectionUtils";
import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { VerticalVolumeControl } from "@/components/playback/VerticalVolumeControl";
import { GenreHorizontalPanel } from "@/components/radio/GenreHorizontalPanel";
import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { useLibraryGenres } from "@/hooks/useLibrary";
import { authedApi } from "@/lib/authedApi";
import { coverFallback, playlistPath, profilePath, studioCollectionEditPath } from "@/lib/routes";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/providers/AuthProvider";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { usePlaybackVolume } from "@/providers/PlaybackVolumeProvider";
import { useRadioPlayer } from "@/providers/RadioPlayerProvider";

function formatTime(totalSeconds?: number | null) {
  if (!totalSeconds || !Number.isFinite(totalSeconds)) return "0:00";
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function RadioPage({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { status, user, accessToken } = useAuth();
  const {
    playing,
    togglePlayback,
    radioQuery,
    station,
    nowPlaying,
    isLive,
    activeStationSlug,
    playStation,
    registerRadioUi,
    unregisterRadioUi,
  } = useRadioPlayer();

  const { currentTrack } = useAudioPlayer();
  const { volume, setVolume } = usePlaybackVolume();
  const { data: genreData } = useLibraryGenres({ minSongCount: 1 });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  usePageMeta({ title: "Radio" });

  const radioClient = useMemo(() => authedApi(accessToken), [accessToken]);

  const genres = useMemo(
    () => (genreData?.data ?? []).filter((genre) => genre.songCount > 0),
    [genreData?.data],
  );
  const activeGenre = useMemo(
    () => genres.find((genre) => genre.slug === activeStationSlug) ?? null,
    [activeStationSlug, genres],
  );
  const genreStationActive = activeStationSlug !== null;
  const genreStationName = activeGenre
    ? `${activeGenre.name} Radio`
    : activeStationSlug
      ? `${activeStationSlug} Radio`
      : null;

  const statusLabel = radioQuery.isError
      ? "Unavailable"
      : isLive
        ? "Live"
        : "Offline";

  const artStyle = useMemo(() => {
    const artworkUrl = nowPlaying?.artworkUrl;
    const title = nowPlaying?.title;
    if (artworkUrl) return { backgroundImage: `url(${artworkUrl})` };
    return { background: coverFallback(title ?? "Radio") };
  }, [
    nowPlaying?.artworkUrl,
    nowPlaying?.title,
  ]);

  const progressPct = nowPlaying?.durationSeconds
      ? Math.min(100, ((nowPlaying.elapsedSeconds ?? 0) / nowPlaying.durationSeconds) * 100)
      : null;
  const elapsedLabel = nowPlaying?.durationSeconds
      ? formatTime(nowPlaying.elapsedSeconds)
      : null;
  const durationLabel = nowPlaying?.durationSeconds
      ? formatTime(nowPlaying.durationSeconds)
      : null;

  const playlistUrl = nowPlaying
      ? playlistPath({ id: nowPlaying.playlist.id, slug: nowPlaying.playlist.slug, username: nowPlaying.uploader.username })
      : null;
  const displayTitle = nowPlaying?.title;
  const displayArtistName = nowPlaying?.uploader?.displayName;
  const displayArtistUsername = nowPlaying?.uploader?.username;
  const activePlaying = playing;
  const favoriteRecordingId = nowPlaying?.id;

  useEffect(() => {
    registerRadioUi();
    return unregisterRadioUi;
  }, [registerRadioUi, unregisterRadioUi]);

  const submissionCollectionMutation = useMutation({
    mutationFn: () =>
      radioClient.playlists.create({
        ownerId: user!.id,
        title: DEFAULT_COLLECTION_TITLE,
        type: "PLAYLIST",
        status: "PUBLISHED",
        visibility: "PUBLIC",
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["me", "playlists"] });
      navigate(studioCollectionEditPath(created.id));
    },
  });

  function handleSubmitSong() {
    if (status !== "authenticated" || !user) {
      navigate("/login", { state: { from: location.pathname }, replace: false });
      return;
    }

    if (submissionCollectionMutation.isPending) return;
    submissionCollectionMutation.mutate();
  }

  /* Magic font */

  type MagicFontProps = {
    children: string;
    minFontSize?: number;
    maxFontSize?: number;
    minChars?: number;
    maxChars?: number;
  };
  
  function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }
  
  function countTextLength(text: string): number {
    return [...text.trim()].length;
  }
  
  function calculateFontSize(
    text: string,
    {
      minFontSize = 24,
      maxFontSize = 64,
      minChars = 25,
      maxChars = 35,
    }: Omit<MagicFontProps, "children"> = {},
  ): number {
    const charRange = maxChars - minChars;
  
    if (charRange <= 0) {
      return maxFontSize;
    }
  
    const length = clamp(countTextLength(text), minChars, maxChars);
    const progress = (length - minChars) / charRange;
  
    return maxFontSize - progress * (maxFontSize - minFontSize);
  }
  
  function MagicFont({
    children,
    minFontSize = 16,
    maxFontSize = 24,
    minChars = 10,
    maxChars = 65,
  }: MagicFontProps) {
    const text = children.trim();
  
    const fontSize = calculateFontSize(text, {
      minFontSize,
      maxFontSize,
      minChars,
      maxChars,
    });
  
    return (
      <span
        style={{
          display: "block",
          fontSize: `${fontSize}px`,
          lineHeight: 1,
        }}
      >
        {text}
      </span>
    );
  }

  /* End Magic font */

  const pageHeight = "h-full max-h-full";
  const artworkClassName =
    "aspect-square max-h-full w-full max-w-full rounded-[1.4rem] border border-white/[0.08] bg-white/5 bg-cover bg-center shadow-[0_26px_80px_rgba(0,0,0,0.44)]";

  return (
    <div
      className={`relative isolate -mx-4 flex items-center justify-center px-4 py-3 sm:-mx-6 sm:px-6 sm:py-6 lg:-mx-8 lg:px-8 ${pageHeight}`}
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[30rem] flex-col items-center justify-between gap-2 sm:justify-center sm:gap-0">
        {radioQuery.isError ? (
          <div className="w-full shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200 shadow-lg shadow-black/20 backdrop-blur">
            Couldn&apos;t load radio.{" "}
            <button
              type="button"
              onClick={() => void radioQuery.refetch()}
              className="font-semibold underline underline-offset-2 hover:text-white"
            >
              Retry
            </button>
          </div>
        ) : null}


        <div className="flex h-8 shrink-0 items-center justify-center gap-2 rounded-full border border-white/[0.08] px-3 text-xs font-semibold uppercase text-white/78">
          <PlaybackBars
            active={genreStationActive || isLive}
            playing={activePlaying}
            variant="thumb"
            barCount={7}
          />
          <span className="text-[var(--color-brand)]">{statusLabel}</span>
          {!genreStationActive && isLive && station?.listenerCount != null ? (
            <span className="flex items-center gap-1 border-l border-white/10 pl-2 text-white/72">
              <Users size={12} />
              {station.listenerCount}
            </span>
          ) : null}
        </div>

        <div className="relative flex min-h-0 w-full max-w-[min(74vw,23rem)] items-center justify-center">
          <div className="absolute -inset-4 -z-10 rounded-[2rem] blur-xl" />
          {playlistUrl ? (
            <Link
              to={playlistUrl}
              className={`${artworkClassName} block transition duration-300 hover:scale-[1.012] hover:brightness-105`}
              style={artStyle}
              aria-label={`Go to playlist: ${
                genreStationActive
                  ? currentTrack?.playlistTitle ?? displayTitle ?? "current recording"
                  : nowPlaying?.playlist.title ?? "current recording"
              }`}
            />
          ) : (
            <div className={artworkClassName} style={artStyle} />
          )}
        </div>

        <div className="flex w-full shrink-0 flex-col items-center justify-start text-center sm:mt-7 sm:min-h-[9.35rem]">
          <p className="mb-1 flex h-5 max-w-full items-center gap-2 truncate text-xs font-semibold uppercase text-white/42 bg-[var(--color-canvas)] px-2 py-1 rounded-full sm:mb-3">
            <Radio size={13} className="shrink-0 text-[var(--color-brand)]" />
            <span className="truncate">{genreStationName ?? station?.name ?? "Playlisted Radio"}</span>
          </p>
          <h1 className="grid max-w-full place-items-center overflow-hidden text-balance text-[clamp(1.5rem,7vw,3.75rem)] font-black leading-[0.98] text-white line-height-none sm:min-h-[4.9rem]">
            {playlistUrl ? (
              <Link
                to={playlistUrl}
                className="overflow-hidden transition hover:text-[var(--color-brand)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] bg-[var(--color-canvas)]/80 shadow-[0_0_20px_rgba(0,0,0,0.5)]  rounded-sm p-2"
              >
                <MagicFont>{displayTitle ?? "Radio"}</MagicFont>
              </Link>
            ) : (
              <span className="overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] bg-[var(--color-canvas)]/80 shadow-[0_0_20px_rgba(0,0,0,0.5)]  rounded-sm">
                {displayTitle ?? "Radio"}
              </span>
            )}
          </h1>

          <p className="mt-1 h-7 max-w-full truncate text-base leading-7 text-[var(--color-text-muted)] bg-[var(--color-canvas)]/80 shadow-[0_0_20px_rgba(0,0,0,0.5)]  rounded-sm px-4 sm:mt-3">
            {displayArtistName ? (
              displayArtistUsername ? (
                <Link to={profilePath(displayArtistUsername)} className="hover:text-white transition">
                  {displayArtistName}
                </Link>
              ) : (
                displayArtistName
              )
            ) : null}
          </p>
        </div>

        <div className="w-full max-w-[min(74vw,23rem)] shrink-0 sm:mt-1">
          <div className="flex h-5 items-center justify-between text-[0.7rem] font-medium text-white/36">
            <span>{elapsedLabel ?? "Live"}</span>
            <span>{durationLabel ?? "On air"}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10 shadow-inner shadow-black/20">
            {progressPct !== null ? (
              <div
                className="h-full rounded-full bg-white transition-[width] duration-1000 ease-linear"
                style={{ width: `${progressPct}%` }}
              />
            ) : (
              <div className="h-full w-1/3 rounded-full bg-[var(--color-brand)]/70" />
            )}
          </div>
        </div>

        <div className="flex h-16 shrink-0 items-center justify-center gap-4 sm:mt-8">
          <VerticalVolumeControl
            volume={volume}
            onVolumeChange={setVolume}
            variant="radio"
          />

          <button
            type="button"
            onClick={() => void togglePlayback()}
            disabled={!nowPlaying?.audioUrl}
            className="inline-flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_18px_46px_rgba(0,0,0,0.42)] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 bg-[var(--color-surface)]/80 rounded-full"
            aria-label={activePlaying ? "Pause radio" : "Play radio"}
          >
            {activePlaying ? (
              <Pause size={26} fill="currentColor" />
            ) : (
              <Play size={26} fill="currentColor" className="ml-1" />
            )}
          </button>

          {favoriteRecordingId ? (
            <FavoriteHeartButton
              target="recording"
              id={favoriteRecordingId}
              variant="inline"
              inlineAlwaysVisible
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] p-0 text-white/72 shadow-lg shadow-black/20 transition hover:border-rose-400/35 hover:bg-white/[0.09] hover:text-rose-400 bg-[var(--color-surface)]/80"
            />
          ) : (
            <span className="h-11 w-11" aria-hidden="true" />
          )}
        </div>

        <div className="flex shrink-0 items-center justify-center gap-2 sm:mt-8">
          <button
            type="button"
            onClick={handleSubmitSong}
            disabled={status === "loading" || submissionCollectionMutation.isPending}
            className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg shadow-black/25 backdrop-blur transition hover:border-[var(--color-brand)]/40 hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-60 bg-[var(--color-surface)]/80"
            aria-label="Submit a song"
          >
            <Upload size={17} className="text-[var(--color-brand)]" />
          </button>
          <Link
            to="/favorites"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] text-white shadow-lg shadow-black/25 backdrop-blur transition hover:border-[var(--color-brand)]/40 hover:bg-white/[0.09] bg-[var(--color-surface)]/80"
            aria-label="Music Charts"
          >
            <BarChart2 size={17} className="text-[var(--color-brand)]" />
          </Link>
        </div>
        <GenreHorizontalPanel
          genres={genres}
          genreStationActive={genreStationActive}
          activeGenreSlug={activeStationSlug}
          pendingGenreSlug={null}
          onPlaylistedRadioClick={() => {
            if (activeStationSlug !== null) {
              playStation(null);
            } else {
              void togglePlayback();
            }
          }}
          onGenreClick={(genre) => {
            if (activeStationSlug === genre.slug) {
              void togglePlayback();
            } else {
              playStation(genre.slug);
            }
          }}
          isGenreStationPlaying={(slug) => activeStationSlug === slug && playing}
        />

      </div>
    </div>
  );
}
