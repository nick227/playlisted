import type { AdminContentTagRef, AdminSong, AdminTag } from "@playlisted/client-sdk";

import { AdminGenreEditor } from "./AdminGenreEditor";

type Props = {
  song: AdminSong;
  allGenres: AdminTag[];
  saving: boolean;
  onSave: (tagIds: string[]) => void;
};

function songGenreIds(song: AdminSong): Set<string> {
  return new Set(song.tags.filter((t) => t.kind === "GENRE").map((t) => t.id));
}

function playlistOnlyGenres(song: AdminSong): AdminContentTagRef[] {
  const songIds = songGenreIds(song);
  return (song.playlistGenres ?? []).filter((g) => g.kind === "GENRE" && !songIds.has(g.id));
}

export function AdminSongGenreCell({ song, allGenres, saving, onSave }: Props) {
  const extraPlaylist = playlistOnlyGenres(song);
  const playlistGenres = (song.playlistGenres ?? []).filter((g) => g.kind === "GENRE");

  return (
    <div className="space-y-1.5">
      <AdminGenreEditor
        tags={song.tags}
        allGenres={allGenres}
        saving={saving}
        emptyLabel="— song genre"
        onSave={onSave}
      />
      {playlistGenres.length > 0 && (
        <div className="rounded-md border border-amber-400/20 bg-amber-400/[0.04] px-1.5 py-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-amber-400/80">
            Playlist{extraPlaylist.length > 0 ? " · homepage mismatch" : ""}
          </p>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {playlistGenres.map((g) => (
              <span
                key={g.id}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  extraPlaylist.some((x) => x.id === g.id)
                    ? "bg-amber-400/15 text-amber-300"
                    : "bg-zinc-700/50 text-zinc-400"
                }`}
                title="Published playlist genre (not editable here)"
              >
                {g.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
