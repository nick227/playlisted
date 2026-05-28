import type { components } from "@playlisted/client-sdk";

import { TrackRow } from "./TrackRow";

type Recording = components["schemas"]["RecordingSummary"];

interface TrackListProps {
  recordings: Recording[];
  activeId?: string | null;
  playerState?: "idle" | "loading" | "playing" | "paused" | "error";
  ownerName?: string;
  onPlay: (recording: Recording, index: number) => void;
  editMode?: boolean;
  onRemove?: (recordingId: string) => void;
  onMoveUp?: (recordingId: string) => void;
  onMoveDown?: (recordingId: string) => void;
}

export function TrackList({
  recordings,
  activeId,
  playerState,
  ownerName,
  onPlay,
  editMode,
  onRemove,
  onMoveUp,
  onMoveDown,
}: TrackListProps) {
  if (recordings.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="mb-2 grid grid-cols-[auto_1fr_auto] gap-4 px-3 text-xs font-medium uppercase tracking-wide text-[var(--color-text-subtle)]">
        <span className="w-10 text-center">#</span>
        <span>Title</span>
        <span className="w-16 text-right">Time</span>
      </div>
      {recordings.map((recording, index) => (
        <TrackRow
          key={recording.id}
          recordingId={recording.id}
          index={index}
          title={recording.title}
          creator={ownerName}
          meta={recording.recordingType}
          durationSeconds={recording.durationSeconds}
          artworkUrl={recording.artworkUrl}
          isActive={recording.id === activeId}
          isPlaying={recording.id === activeId && playerState === "playing"}
          onPlay={() => onPlay(recording, index)}
          editMode={editMode}
          canMoveUp={editMode ? index > 0 : undefined}
          canMoveDown={editMode ? index < recordings.length - 1 : undefined}
          onRemove={onRemove ? () => onRemove(recording.id) : undefined}
          onMoveUp={onMoveUp ? () => onMoveUp(recording.id) : undefined}
          onMoveDown={onMoveDown ? () => onMoveDown(recording.id) : undefined}
        />
      ))}
    </div>
  );
}
