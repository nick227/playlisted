import type { components } from "@playlisted/client-sdk";

import type { CollectionRecording } from "@/components/collection/collectionTypes";
import {
  type PlaylistTrackContext,
  recordingShareUrlForContext,
  recordingSummaryToQueueTrack,
} from "@/lib/queueTrack";

import { TrackRow } from "./TrackRow";

type Recording = CollectionRecording & {
  tags?: components["schemas"]["Tag"][];
};

interface TrackListProps {
  recordings: Recording[];
  ownerName?: string;
  playlistContext?: PlaylistTrackContext;
  onPlay: (recording: Recording, index: number) => void;
  editMode?: boolean;
  onRemove?: (recordingId: string) => void;
  onMoveUp?: (recordingId: string) => void;
  onMoveDown?: (recordingId: string) => void;
  onUpdateTags?: (recordingId: string, tagSlugs: string[]) => void;
}

export function TrackList({
  recordings,
  ownerName,
  playlistContext,
  onPlay,
  editMode,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdateTags,
}: TrackListProps) {
  if (recordings.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {recordings.map((recording, index) => {
        const displayOwner = ownerName ?? recording.uploader?.displayName ?? playlistContext?.ownerDisplayName;
        const trackContext = playlistContext
          ? {
              playlistTitle: playlistContext.playlistTitle,
              ownerName: displayOwner,
            }
          : undefined;

        return (
          <TrackRow
            key={recording.id}
            recordingId={recording.id}
            index={index}
            title={recording.title}
            creator={displayOwner}
            meta={recording.recordingType}
            playCount={recording.playCount}
            durationSeconds={recording.durationSeconds}
            artworkUrl={recording.artworkUrl}
            onPlay={() => onPlay(recording, index)}
            editMode={editMode}
            canMoveUp={editMode ? index > 0 : undefined}
            canMoveDown={editMode ? index < recordings.length - 1 : undefined}
            onRemove={onRemove ? () => onRemove(recording.id) : undefined}
            onMoveUp={onMoveUp ? () => onMoveUp(recording.id) : undefined}
            onMoveDown={onMoveDown ? () => onMoveDown(recording.id) : undefined}
            tags={recording.tags}
            onUpdateTags={onUpdateTags ? (tags: string[]) => onUpdateTags(recording.id, tags) : undefined}
            queueTrack={
              editMode || !playlistContext
                ? undefined
                : recordingSummaryToQueueTrack(recording, trackContext)
            }
            shareUrl={
              editMode || !playlistContext
                ? undefined
                : recordingShareUrlForContext(recording.id, playlistContext)
            }
          />
        );
      })}
    </div>
  );
}
