import type { components } from "@playlisted/client-sdk";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { TrackRow } from "@/components/tracks/TrackRow";
import { authedApi } from "@/lib/authedApi";
import { recordingSummaryToQueueTrack } from "@/lib/queueTrack";
import { playlistRecordingPath } from "@/lib/routes";
import { usePageMeta } from "@/hooks/usePageMeta";
import { recordingShareUrl } from "@/lib/shareContent";
import { useAuth } from "@/providers/AuthProvider";
import { useAudioPlayer, type QueueTrack } from "@/providers/AudioPlayerProvider";

type HistoryItem = components["schemas"]["PlaybackHistoryItem"];

export function StudioHistoryPage() {
  const { accessToken } = useAuth();
  const client = authedApi(accessToken);

  usePageMeta({ title: "Play History — Studio" });
  const { playTrack, currentTrack, togglePlay } = useAudioPlayer();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["me", "playback-history"],
    queryFn: () => client.me.playbackHistory(),
    enabled: Boolean(accessToken),
  });

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-4xl mx-auto">
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
    if (currentTrack?.id === item.recording.id) {
      togglePlay();
      return;
    }

    const track: QueueTrack = {
      ...item.recording,
      playlistTitle: item.playlist?.title,
    };
    playTrack(track, [track], {
      playlistId: item.playlistId ?? undefined,
      playlistOwnerUsername: undefined,
      playlistSlug: undefined,
      sourceContext: "history",
    });
  }

  return (
    <div className="mx-auto max-w-3xl bg-[var(--color-canvas)]/80">
      <Link
        to="/studio"
        className="mb-4 inline-flex text-sm font-semibold text-[var(--color-brand)] hover:underline"
      >
        ← Back to studio
      </Link>
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
                recordingHref={
                  item.playlist
                    ? playlistRecordingPath(
                        {
                          id: item.playlist.id,
                          href: item.playlist.href,
                        },
                        item.recording,
                      )
                    : undefined
                }
                playlistHref={item.playlist?.href}
                playlistTitle={item.playlist?.title}
                meta={
                  item.playlist
                    ? new Date(item.createdAt).toLocaleString()
                    : new Date(item.createdAt).toLocaleString()
                }
                onPlay={() => playItem(item)}
                queueTrack={recordingSummaryToQueueTrack(item.recording, {
                  playlistTitle: item.playlist?.title,
                })}
                shareUrl={
                  item.playlist
                    ? recordingShareUrl({
                        playlistId: item.playlist.id,
                        recordingId: item.recording.id,
                        title: item.recording.title,
                      })
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
