import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, SkipForward, Upload, Users } from "lucide-react";

import { FavoriteHeartButton } from "@/components/media/FavoriteHeartButton";
import { VerticalVolumeControl } from "@/components/playback/VerticalVolumeControl";
import { RadioStationTiles } from "@/components/radio/RadioStationTiles";
import { DEFAULT_COLLECTION_TITLE } from "@/components/studio/studioCollectionUtils";
import { useLibraryGenres } from "@/hooks/useLibrary";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { authedApi } from "@/lib/authedApi";
import {
  SWIPE_COMMIT_THRESHOLD_PX,
  SWIPE_VELOCITY_THRESHOLD_PX_PER_MS,
  isGestureExcludedTarget,
} from "@/lib/gestures/swipeGesture";
import { playlistPath, profilePath, studioCollectionEditPath } from "@/lib/routes";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";
import { usePlaybackVolume } from "@/providers/PlaybackVolumeProvider";
import { useRadioPlayer } from "@/providers/RadioPlayerProvider";

import "./radioSection.css";

function formatTime(totalSeconds?: number | null) {
  if (!totalSeconds || !Number.isFinite(totalSeconds)) return "0:00";
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function isRadioGestureExcludedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-radio-gesture-surface]")) return false;
  return isGestureExcludedTarget(target);
}

/**
 * Registers the radio UI only while the section is on stage. That one signal
 * drives the bottom-player handoff (docked radio controls once scrolled past)
 * and the shell's idle body fade + focus lanes (only while radio is in view).
 */
function useRadioUiWhileVisible(ref: RefObject<HTMLElement | null>) {
  const { registerRadioUi, unregisterRadioUi } = useRadioPlayer();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let registered = false;
    const setRegistered = (next: boolean) => {
      if (next === registered) return;
      registered = next;
      if (next) registerRadioUi();
      else unregisterRadioUi();
    };

    if (typeof IntersectionObserver === "undefined") {
      setRegistered(true);
      return () => setRegistered(false);
    }

    const observer = new IntersectionObserver(
      ([entry]) => setRegistered(entry.isIntersecting),
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      setRegistered(false);
    };
  }, [ref, registerRadioUi, unregisterRadioUi]);
}

/** Live radio: now playing, transport, and genre station tiles. */
export function RadioSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
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
    skipRadioTrack,
  } = useRadioPlayer();
  const { currentTrack } = useAudioPlayer();
  const { volume, setVolume } = usePlaybackVolume();
  const { data: genreData } = useLibraryGenres({ minSongCount: 1 });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  useRadioUiWhileVisible(sectionRef);

  const radioClient = useMemo(() => authedApi(accessToken), [accessToken]);

  const genres = useMemo(
    () => (genreData?.data ?? []).filter((genre) => genre.songCount > 0),
    [genreData?.data],
  );
  const radioStationSlugs = useMemo(
    () => [null, ...genres.map((genre) => genre.slug)] as Array<string | null>,
    [genres],
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

  const artStyle = useMemo(() => {
    if (nowPlaying?.artworkUrl) return { backgroundImage: `url(${nowPlaying.artworkUrl})` };
    return undefined;
  }, [nowPlaying?.artworkUrl]);

  const progressPct = nowPlaying?.durationSeconds
    ? Math.min(100, ((nowPlaying.elapsedSeconds ?? 0) / nowPlaying.durationSeconds) * 100)
    : null;
  const elapsedLabel = nowPlaying?.durationSeconds ? formatTime(nowPlaying.elapsedSeconds) : null;
  const durationLabel = nowPlaying?.durationSeconds ? formatTime(nowPlaying.durationSeconds) : null;

  const playlistUrl = nowPlaying
    ? playlistPath({ id: nowPlaying.playlist.id, slug: nowPlaying.playlist.slug, username: nowPlaying.uploader.username })
    : null;
  const titleText = nowPlaying?.title ?? "Radio";
  const artistName = nowPlaying?.uploader?.displayName;
  const artistUsername = nowPlaying?.uploader?.username;

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

  // Horizontal swipe flips stations; vertical stays native so the page scrolls.
  const swipeHandlers = useSwipeGesture({
    enabled: radioStationSlugs.length > 1,
    axis: "horizontal",
    skipPointerCapture: true,
    horizontalCommitPx: SWIPE_COMMIT_THRESHOLD_PX,
    velocityThreshold: SWIPE_VELOCITY_THRESHOLD_PX_PER_MS,
    isExcludedTarget: isRadioGestureExcludedTarget,
    onHorizontalSwipe: (direction) => {
      const activeIndex = Math.max(0, radioStationSlugs.findIndex((slug) => slug === activeStationSlug));
      const offset = direction === "next" ? 1 : -1;
      const nextIndex = (activeIndex + offset + radioStationSlugs.length) % radioStationSlugs.length;
      playStation(radioStationSlugs[nextIndex]);
    },
  });

  // After a local skip the station's upNext still lists the song now on air; show only what follows it.
  const stationUpNext = station?.upNext ?? [];
  const onAirIndex = stationUpNext.findIndex((track) => track.id === nowPlaying?.id);
  const nextTrack = stationUpNext[onAirIndex + 1] ?? null;
  const stationName = genreStationName ?? station?.name ?? "Playlisted Radio";
  const onAir = isLive && !radioQuery.isError;

  function handleStationClick(slug: string | null) {
    if (activeStationSlug === slug) void togglePlayback();
    else playStation(slug);
  }

  const iconButtonClassName =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-white";
  const coverClassName =
    "radio-cover block aspect-square w-full select-none rounded-xl bg-[var(--color-surface-elevated)] bg-cover bg-center ring-1 ring-inset ring-white/[0.06] [-webkit-user-drag:none]";

  return (
    <section id="radio" ref={sectionRef} aria-label="Live radio" className="scroll-mt-4">
      {radioQuery.isError ? (
        <p className="mb-6 text-center text-sm text-red-300">
          Radio didn&apos;t load.{" "}
          <button
            type="button"
            onClick={() => void radioQuery.refetch()}
            className="font-medium text-white underline underline-offset-2"
          >
            Try again
          </button>
        </p>
      ) : null}

      {/* Stage: row one is the cover, row two is the song and its transport, on one centered axis. */}
      <div
        className="flex min-w-0 touch-pan-y select-none flex-col items-center pt-2 sm:pt-6"
        onPointerDown={swipeHandlers.onPointerDown}
        onPointerMove={swipeHandlers.onPointerMove}
        onPointerUp={swipeHandlers.onPointerUp}
        onPointerCancel={swipeHandlers.onPointerCancel}
        onLostPointerCapture={swipeHandlers.onLostPointerCapture}
        onClickCapture={swipeHandlers.onClick}
      >
        <div data-radio-gesture-surface className="w-[min(100%,clamp(9rem,24vh,17.5rem))]">
          {playlistUrl ? (
            <Link
              key={nowPlaying?.id}
              to={playlistUrl}
              data-radio-gesture-surface
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
              className={`${coverClassName} transition-transform duration-500 hover:scale-[1.01]`}
              style={artStyle}
              aria-label={`Go to playlist: ${
                genreStationActive
                  ? currentTrack?.playlistTitle ?? titleText
                  : nowPlaying?.playlist.title ?? "current recording"
              }`}
            />
          ) : (
            <div data-radio-gesture-surface className={coverClassName} style={artStyle} />
          )}
        </div>

        <div data-radio-gesture-surface className="mt-8 flex w-full min-w-0 max-w-5xl flex-col items-center text-center sm:mt-10">
          <p className="flex min-w-0 max-w-full items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${onAir ? "radio-live-dot bg-[#ff5c7a]" : "bg-white/25"}`}
            />
            <span className={onAir ? "text-white" : undefined}>
              {radioQuery.isError ? "Unavailable" : isLive ? "Live" : "Off air"}
            </span>
            <span aria-hidden className="text-white/20">/</span>
            <span className="min-w-0 truncate">{stationName}</span>
            {!genreStationActive && isLive && station?.listenerCount ? (
              <>
                <span aria-hidden className="text-white/20">/</span>
                <span className="flex shrink-0 items-center gap-1">
                  <Users size={12} />
                  <span className="tabular-nums">{station.listenerCount}</span>
                </span>
              </>
            ) : null}
          </p>

          <h2 className="mt-3 line-clamp-2 max-w-full text-[1.75rem] font-semibold leading-[1.1] tracking-tight text-white [overflow-wrap:anywhere] sm:text-[2.5rem]">
            {playlistUrl ? (
              <Link to={playlistUrl} className="transition-colors hover:text-white/80" title={titleText}>
                {titleText}
              </Link>
            ) : (
              titleText
            )}
          </h2>
          <p className="mt-2 max-w-full truncate text-base text-[var(--color-text-muted)]">
            {artistName && artistUsername ? (
              <Link to={profilePath(artistUsername)} className="text-white/80 transition-colors hover:text-white">
                {artistName}
              </Link>
            ) : (
              artistName ?? " "
            )}
            {nowPlaying && playlistUrl ? (
              <>
                <span className="mx-2 text-white/20" aria-hidden>/</span>
                <Link to={playlistUrl} className="transition-colors hover:text-white">
                  {nowPlaying.playlist.title}
                </Link>
              </>
            ) : null}
          </p>

          <div className="mt-8 flex w-full items-center gap-3 text-[11px] tabular-nums text-[var(--color-text-subtle)]">
            <span className="w-9 text-left">{elapsedLabel ?? "Live"}</span>
            <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/10">
              {progressPct !== null ? (
                <div
                  className="h-full bg-white transition-[width] duration-1000 ease-linear"
                  style={{ width: `${progressPct}%` }}
                />
              ) : null}
            </div>
            <span className="w-9 text-right">{durationLabel ?? ""}</span>
          </div>

          {/* Transport is mirrored around play: love / play / skip, volume and submit on the outer edges. */}
          <div className="mt-5 grid w-full grid-cols-[1fr_auto_1fr] items-center">
            <div className="flex justify-start">
              <VerticalVolumeControl volume={volume} onVolumeChange={setVolume} variant="radio" />
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              {nowPlaying?.id ? (
                <FavoriteHeartButton
                  target="recording"
                  id={nowPlaying.id}
                  variant="inline"
                  inlineAlwaysVisible
                  className={`${iconButtonClassName} p-0 hover:text-rose-400`}
                />
              ) : (
                <span className="h-11 w-11" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => void togglePlayback()}
                disabled={!nowPlaying?.audioUrl}
                className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:scale-[1.04] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label={playing ? "Pause radio" : "Play radio"}
              >
                {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
              </button>
              <button
                type="button"
                onClick={() => skipRadioTrack("next")}
                disabled={!nextTrack}
                className={iconButtonClassName}
                aria-label="Skip to next song"
                title={nextTrack ? `Skip to ${nextTrack.title}` : undefined}
              >
                <SkipForward size={20} fill="currentColor" />
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSubmitSong}
                disabled={status === "loading" || submissionCollectionMutation.isPending}
                className={iconButtonClassName}
                aria-label="Submit a song"
                title="Submit a song"
              >
                <Upload size={18} />
              </button>
            </div>
          </div>

          {nextTrack ? (
            <p className="mt-5 max-w-full truncate text-xs text-[var(--color-text-subtle)]">
              Up next <span className="text-[var(--color-text-muted)]">{nextTrack.title}</span>
              <span className="mx-1.5 text-white/20" aria-hidden>/</span>
              {nextTrack.uploader.displayName}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto mt-10 w-full max-w-5xl sm:mt-12">
        <h3 className="mb-3 text-xs font-medium text-white">Stations</h3>
        <RadioStationTiles
          genres={genres}
          activeStationSlug={activeStationSlug}
          playing={playing}
          onStationClick={handleStationClick}
        />
      </div>
    </section>
  );
}
