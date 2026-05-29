import { ListPlus, ListMusic, Share2 } from "lucide-react";
import { useState } from "react";

import { MediaActionMenu } from "@/components/media/MediaActionMenu";
import { AddToPlaylistDialog } from "@/components/playlists/AddToPlaylistDialog";
import { useAppendToQueue } from "@/hooks/useAppendToQueue";
import { useAuthAction } from "@/hooks/useAuthAction";
import { shareContent } from "@/lib/shareContent";
import type { QueueTrack } from "@/providers/AudioPlayerProvider";

type RecordingActionMenuProps = {
  recordingId: string;
  title: string;
  queueTrack: QueueTrack;
  shareUrl: string;
  className?: string;
};

export function RecordingActionMenu({
  recordingId,
  title,
  queueTrack,
  shareUrl,
  className,
}: RecordingActionMenuProps) {
  const { appendTrack } = useAppendToQueue();
  const requireAuth = useAuthAction();
  const [saveOpen, setSaveOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  function flash(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2000);
  }

  const items = [
    {
      id: "queue",
      label: "Add to queue",
      icon: <ListPlus size={16} />,
      onClick: () => {
        requireAuth(() => {
          const result = appendTrack(queueTrack);
          flash(result.added ? "Added to queue" : "Already in queue");
        });
      },
    },
    {
      id: "save",
      label: "Save to playlist",
      icon: <ListMusic size={16} />,
      onClick: () => {
        requireAuth(() => setSaveOpen(true));
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
    <>
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

      <AddToPlaylistDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        recordingIds={[recordingId]}
        title={title}
      />
    </>
  );
}
