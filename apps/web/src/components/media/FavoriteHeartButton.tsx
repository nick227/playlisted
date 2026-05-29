import { Heart } from "lucide-react";

import { useAuthAction } from "@/hooks/useAuthAction";
import {
  useFavoriteIds,
  useFavoritePlaylistIds,
  useToggleFavorite,
  useToggleFavoritePlaylist,
} from "@/hooks/useFavorites";

type FavoriteTarget = "recording" | "playlist";

type FavoriteHeartButtonProps = {
  target: FavoriteTarget;
  id: string;
  className?: string;
  variant?: "overlay" | "inline";
};

export function FavoriteHeartButton({
  target,
  id,
  className = "",
  variant = "overlay",
}: FavoriteHeartButtonProps) {
  const requireAuth = useAuthAction();
  const { ids: recordingIds } = useFavoriteIds();
  const { ids: playlistIds } = useFavoritePlaylistIds();
  const { add: addRecording, remove: removeRecording } = useToggleFavorite();
  const { add: addPlaylist, remove: removePlaylist } = useToggleFavoritePlaylist();

  const isFavorited =
    target === "recording" ? recordingIds.has(id) : playlistIds.has(id);
  const pending =
    target === "recording"
      ? addRecording.isPending || removeRecording.isPending
      : addPlaylist.isPending || removePlaylist.isPending;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    requireAuth(() => {
      if (target === "recording") {
        if (isFavorited) removeRecording.mutate(id);
        else addRecording.mutate(id);
      } else if (isFavorited) {
        removePlaylist.mutate(id);
      } else {
        addPlaylist.mutate(id);
      }
    });
  }

  const isInline = variant === "inline";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={isFavorited}
      className={[
        isInline
          ? "shrink-0 rounded-full p-1.5 transition"
          : "flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition",
        isFavorited
          ? "text-rose-500 hover:text-rose-400"
          : isInline
            ? "text-white/20 hover:text-white group-hover/card:opacity-100"
            : "text-white/80 hover:text-white",
        isInline && !isFavorited ? "opacity-0 group-hover/card:opacity-100 focus:opacity-100" : "opacity-100",
        className,
      ].join(" ")}
    >
      <Heart size={isInline ? 15 : 14} fill={isFavorited ? "currentColor" : "none"} />
    </button>
  );
}
