import { ListPlus, Share2 } from "lucide-react";
import { useMemo, useState } from "react";

import { MediaActionMenu } from "@/components/media/MediaActionMenu";
import { useAppendToQueue } from "@/hooks/useAppendToQueue";
import { useAuthAction } from "@/hooks/useAuthAction";
import { usePlaylist } from "@/hooks/usePlaylist";
import { playlistShareUrl, shareContent } from "@/lib/shareContent";
import type { QueueTrack } from "@/providers/AudioPlayerProvider";

type PlaylistActionMenuProps = {
  playlistId: string;
  title: string;
  ownerUsername?: string | null;
  slug?: string | null;
  className?: string;
};

function mapPlaylistTracks(
  playlist: NonNullable<ReturnType<typeof usePlaylist>["data"]>,
): QueueTrack[] {
  return playlist.recordings.map((r) => ({
    ...r,
    playlistTitle: playlist.title,
    ownerName: playlist.owner.displayName,
  }));
}

export function PlaylistActionMenu({
  playlistId,
  title,
  ownerUsername,
  slug,
  className,
}: PlaylistActionMenuProps) {
  const { data: playlist } = usePlaylist(playlistId);
  const { appendTracks } = useAppendToQueue();
  const requireAuth = useAuthAction();
  const [feedback, setFeedback] = useState<string | null>(null);

  const shareUrl = useMemo(
    () => playlistShareUrl({ id: playlistId, username: ownerUsername, slug }),
    [playlistId, ownerUsername, slug],
  );

  function flash(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2000);
  }

  const items = [
    {
      id: "queue-all",
      label: "Add all to queue",
      icon: <ListPlus size={16} />,
      disabled: !playlist?.recordings.length,
      onClick: () => {
        requireAuth(() => {
          if (!playlist?.recordings.length) return;
          const result = appendTracks(mapPlaylistTracks(playlist));
          if (result.added === 0) {
            flash("All tracks already in queue");
          } else {
            flash(`Added ${result.added} track${result.added === 1 ? "" : "s"} to queue`);
          }
        });
      },
    },
    {
      id: "share",
      label: "Share",
      icon: <Share2 size={16} />,
      onClick: () => {
        void shareContent(shareUrl, title).then((result) => {
          if (result === "copied") flash("Link copied");
          else if (result === "shared") flash("Shared");
        });
      },
    },
  ];

  return (
    <div className={`relative ${className ?? ""}`}>
      <MediaActionMenu items={items} ariaLabel={`Actions for ${title}`} />
      {feedback ? (
        <span
          className="pointer-events-none absolute right-0 top-full z-40 mt-1 whitespace-nowrap rounded-md bg-black/80 px-2 py-1 text-xs text-white"
          role="status"
        >
          {feedback}
        </span>
      ) : null}
    </div>
  );
}
