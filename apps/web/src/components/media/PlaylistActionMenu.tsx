import { Library, ListPlus, Share2 } from "lucide-react";
import { useMemo, useState } from "react";

import { MediaActionMenu } from "@/components/media/MediaActionMenu";
import { useAppendToQueue } from "@/hooks/useAppendToQueue";
import { useAuthAction } from "@/hooks/useAuthAction";
import { useAddCollectionPlaylist, useCollectionPlaylists } from "@/hooks/useCollections";
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
  const collectionPlaylists = useCollectionPlaylists();
  const addCollectionPlaylist = useAddCollectionPlaylist();
  const [feedback, setFeedback] = useState<string | null>(null);
  const isSaved = collectionPlaylists.data?.data.some((item) => item.id === playlistId) ?? false;

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
      id: "save-playlist",
      label: isSaved ? "Saved playlist" : "Save playlist",
      icon: <Library size={16} />,
      disabled: isSaved,
      onClick: () => {
        requireAuth(() => {
          addCollectionPlaylist.mutate(playlistId, {
            onSuccess: () => flash("Saved playlist"),
          });
        });
      },
    },
    {
      id: "queue-all",
      label: "Add playlist to queue",
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
