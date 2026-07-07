import type { components } from "@playlisted/client-sdk";

import type { CollectionRecording } from "@/components/collection/collectionTypes";
import type { GenreOption } from "@/components/studio/studioCollectionUtils";
import {
  type PlaylistTrackContext,
  recordingShareUrlForContext,
  recordingSummaryToQueueTrack,
} from "@/lib/queueTrack";
import { playlistRecordingPath } from "@/lib/routes";

import { TrackRow } from "./TrackRow";

type Recording = CollectionRecording & {
  tags?: components["schemas"]["Tag"][];
};

interface TrackListProps {
  recordings: Recording[];
  ownerName?: string;
  playlistContext?: PlaylistTrackContext;
  onPlay: (recording: Recording, index: number) => void;
  playbackOriginForTrack?: (recording: Recording, index: number) => string | undefined;
  editMode?: boolean;
  onRemove?: (recordingId: string) => void;
  onMoveUp?: (recordingId: string) => void;
  onMoveDown?: (recordingId: string) => void;
  onUpdateTitle?: (recordingId: string, title: string) => void;
  onUpdateArtwork?: (recordingId: string, file: File) => void;
  onUpdateTags?: (recordingId: string, tagSlugs: string[]) => void;
  genreOptions?: GenreOption[];
  playlistGenreSlug?: string | null;
  genreLoading?: boolean;
  fallbackArtworkUrl?: string | null;
  savingById?: Record<string, boolean>;
  errorById?: Record<string, string | undefined>;
}

export function TrackList({
  recordings,
  ownerName,
  playlistContext,
  onPlay,
  playbackOriginForTrack,
  editMode,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdateTitle,
  onUpdateArtwork,
  onUpdateTags,
  genreOptions,
  playlistGenreSlug,
  genreLoading,
  fallbackArtworkUrl,
  savingById,
  errorById,
}: TrackListProps) {
  if (recordings.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-0.5 rounded-2xl">
      {recordings.map((recording, index) => {
        const displayOwner = ownerName ?? recording.uploader?.displayName ?? playlistContext?.ownerDisplayName;
        const trackContext = playlistContext
          ? {
              playlistTitle: playlistContext.playlistTitle,
              ownerName: displayOwner,
              ownerUsername: playlistContext.ownerUsername,
              artistImageUrl: playlistContext.ownerAvatarUrl,
              playlistSlug: playlistContext.slug,
            }
          : undefined;

        return (
          <div key={recording.id}>
            <TrackRow
            recordingId={recording.id}
            index={index}
            title={recording.title}
            creator={displayOwner}
            meta={recording.recordingType}
            playCount={recording.playCount}
            durationSeconds={recording.durationSeconds}
            audioUrl={recording.audioUrl}
            artworkUrl={recording.artworkUrl ?? fallbackArtworkUrl}
            onPlay={() => onPlay(recording, index)}
            playbackOrigin={playbackOriginForTrack?.(recording, index)}
            recordingHref={
              playlistContext
                ? playlistRecordingPath(
                    {
                      id: playlistContext.playlistId,
                      username: playlistContext.ownerUsername,
                      slug: playlistContext.slug,
                    },
                    recording,
                  )
                : undefined
            }
            playlistTitle={playlistContext?.playlistTitle}
            editMode={editMode}
            canMoveUp={editMode ? index > 0 : undefined}
            canMoveDown={editMode ? index < recordings.length - 1 : undefined}
            onRemove={onRemove ? () => onRemove(recording.id) : undefined}
            onMoveUp={onMoveUp ? () => onMoveUp(recording.id) : undefined}
            onMoveDown={onMoveDown ? () => onMoveDown(recording.id) : undefined}
            tags={recording.tags}
            onUpdateTitle={onUpdateTitle ? (title: string) => onUpdateTitle(recording.id, title) : undefined}
            onUpdateArtwork={onUpdateArtwork ? (file: File) => onUpdateArtwork(recording.id, file) : undefined}
            onUpdateTags={onUpdateTags ? (tags: string[]) => onUpdateTags(recording.id, tags) : undefined}
            genreOptions={genreOptions}
            playlistGenreSlug={playlistGenreSlug}
            genreLoading={genreLoading}
            saving={savingById?.[recording.id]}
            error={errorById?.[recording.id]}
            subtitle={recording.subtitle}
            queueTrack={
              editMode || !playlistContext
                ? undefined
                : recordingSummaryToQueueTrack(recording, trackContext)
            }
            shareUrl={
              editMode || !playlistContext
                ? undefined
                : recordingShareUrlForContext(recording, playlistContext)
            }
            />
          </div>
        );
      })}
    </div>
  );
}
