import type { LibrarySong } from "@playlisted/client-sdk";

import { LibraryTrackList } from "@/components/library/LibraryTrackList";
import { SONGS_PATH } from "@/lib/browsePaths";

import { MuseumBankSection, MuseumTrackPanel } from "./museumUi";

interface MuseumTrackListSectionProps {
  songs: LibrarySong[];
  label?: string;
  viewAllHref?: string;
}

export function MuseumTrackListSection({
  songs,
  label = "Recordings",
  viewAllHref = SONGS_PATH,
}: MuseumTrackListSectionProps) {
  if (songs.length === 0) return null;

  return (
    <MuseumBankSection label={label} href={viewAllHref} type="trackRow">
      <MuseumTrackPanel>
        <LibraryTrackList songs={songs} />
      </MuseumTrackPanel>
    </MuseumBankSection>
  );
}
