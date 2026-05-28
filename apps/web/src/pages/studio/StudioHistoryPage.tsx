import type { components } from "@playlisted/client-sdk";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { TrackRow } from "@/components/tracks/TrackRow";
import { authedApi } from "@/lib/authedApi";
import { playlistPath } from "@/lib/routes";
import { useAuth } from "@/providers/AuthProvider";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";

type HistoryItem = components["schemas"]["PlaybackHistoryItem"];

export function StudioHistoryPage() {
  const { accessToken } = useAuth();
  const client = authedApi(accessToken);
  const { playTrack, currentTrack, state } = useAudioPlayer();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["me", "playback-history"],
    queryFn: () => client.me.playbackHistory(),
    enabled: Boolean(accessToken),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (isError) {
    return <EmptyState title="Could not load history" />;
  }

  const items = data?.data ?? [];

  function playItem(item: HistoryItem) {
    const track: QueueTrack = {
      ...item.recording,
      playlistTitle: item.playlist?.title,
    };
    playTrack(track, [track], {
      playlistId: item.playlistId ?? undefined,
      sourceContext: "history",
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand)]">Listening</p>
      <h1 className="mt-2 text-3xl font-extrabold text-white">Play history</h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Tracks you have played while signed in.
      </p>

      {items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No plays yet"
            description="Start a playlist or track and your history will appear here."
          />
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-1">
          {items.map((item) => (
            <div key={item.id}>
              <TrackRow
                recordingId={item.recording.id}
                title={item.recording.title}
                durationSeconds={item.recording.durationSeconds}
                artworkUrl={item.recording.artworkUrl}
                meta={
                  item.playlist
                    ? `From ${item.playlist.title} • ${new Date(item.createdAt).toLocaleString()}`
                    : new Date(item.createdAt).toLocaleString()
                }
                isActive={currentTrack?.id === item.recording.id}
                isPlaying={currentTrack?.id === item.recording.id && state === "playing"}
                onPlay={() => playItem(item)}
              />
              {item.playlist ? (
                <Link
                  to={playlistPath(item.playlist.id)}
                  className="ml-14 block pb-2 text-xs text-[var(--color-brand)] hover:underline"
                >
                  Open collection
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
