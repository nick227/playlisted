import { Heart } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuthAction } from "@/hooks/useAuthAction";
import {
  useFavoriteIds,
  useFavoriteArtistIds,
  useFavoritePlaylistIds,
  useToggleFavorite,
  useToggleFavoriteArtist,
  useToggleFavoritePlaylist,
} from "@/hooks/useFavorites";

type FavoriteTarget = "recording" | "playlist" | "artist";

type FavoriteHeartButtonProps = {
  target: FavoriteTarget;
  id: string;
  className?: string;
  variant?: "overlay" | "inline";
  /** Inline only: keep unfavorited heart visible (default hides until card hover). */
  inlineAlwaysVisible?: boolean;
};

export function FavoriteHeartButton({
  target,
  id,
  className = "",
  variant = "overlay",
  inlineAlwaysVisible = false,
}: FavoriteHeartButtonProps) {
  const requireAuth = useAuthAction();
  const { ids: recordingIds } = useFavoriteIds();
  const { ids: playlistIds } = useFavoritePlaylistIds();
  const { ids: artistIds } = useFavoriteArtistIds();
  const { add: addRecording, remove: removeRecording } = useToggleFavorite();
  const { add: addPlaylist, remove: removePlaylist } = useToggleFavoritePlaylist();
  const { add: addArtist, remove: removeArtist } = useToggleFavoriteArtist();

  const serverFavorited =
    target === "recording"
      ? recordingIds.has(id)
      : target === "playlist"
        ? playlistIds.has(id)
        : artistIds.has(id);
  const pending =
    target === "recording"
      ? addRecording.isPending || removeRecording.isPending
      : target === "playlist"
        ? addPlaylist.isPending || removePlaylist.isPending
        : addArtist.isPending || removeArtist.isPending;
  const [optimisticFavorited, setOptimisticFavorited] = useState<boolean | null>(null);
  const isFavorited = optimisticFavorited ?? serverFavorited;

  useEffect(() => {
    if (!pending && optimisticFavorited === serverFavorited) {
      setOptimisticFavorited(null);
    }
  }, [optimisticFavorited, pending, serverFavorited]);

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    requireAuth(() => {
      const nextFavorited = !isFavorited;
      setOptimisticFavorited(nextFavorited);
      const reset = () => setOptimisticFavorited(serverFavorited);

      if (target === "recording") {
        if (isFavorited) removeRecording.mutate(id, { onError: reset });
        else addRecording.mutate(id, { onError: reset });
      } else if (isFavorited) {
        if (target === "playlist") removePlaylist.mutate(id, { onError: reset });
        else removeArtist.mutate(id, { onError: reset });
      } else if (target === "playlist") {
        addPlaylist.mutate(id, { onError: reset });
      } else {
        addArtist.mutate(id, { onError: reset });
      }
    });
  }

  const isInline = variant === "inline";
  const hideUnfavoritedUntilHover = isInline && !isFavorited && !inlineAlwaysVisible;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={isFavorited}
      className={[
        isInline
          ? "grid shrink-0 place-items-center rounded-full p-1.5 transition"
          : "grid h-8 w-8 place-items-center rounded-full bg-black/60 backdrop-blur-sm transition hover:bg-black/75",
        isFavorited
          ? "text-rose-500 hover:text-rose-400"
          : isInline
            ? inlineAlwaysVisible
              ? "text-white/80 hover:text-rose-400"
              : "text-white/20 hover:text-white"
            : "text-white/80 hover:text-white",
        hideUnfavoritedUntilHover
          ? "opacity-0 group-hover/card:opacity-100 focus:opacity-100"
          : "opacity-100",
        className,
        !isInline ? "!absolute !bottom-2 !right-2 !left-auto !top-auto z-30" : "",
      ].join(" ")}
    >
      <Heart
        size={isInline ? (inlineAlwaysVisible ? 18 : 15) : 14}
        fill={isFavorited ? "currentColor" : "none"}
        strokeWidth={isFavorited ? undefined : 2}
        className="block"
      />
    </button>
  );
}
