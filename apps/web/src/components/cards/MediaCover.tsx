import { Pause, Play } from "lucide-react";

import { PlaybackBars } from "@/features/playback-indicators/PlaybackBars";
import { coverFallback } from "@/lib/routes";

interface MediaCoverProps {
  title: string;
  imageUrl?: string | null;
  shape?: "square" | "circle";
  /** Tailwind aspect class, e.g. aspect-[2/1]. Defaults to aspect-square. */
  aspectClass?: string;
  loading?: "eager" | "lazy";
  decoding?: "async" | "auto" | "sync";
  fetchPriority?: "high" | "low" | "auto";
  onPlay?: () => void;
  isPlaying?: boolean;
  isActive?: boolean;
  showPlaybackBars?: boolean;
}

export function MediaCover({
  title,
  imageUrl,
  shape = "square",
  aspectClass = "aspect-square",
  loading = "lazy",
  decoding = "async",
  fetchPriority,
  onPlay,
  isPlaying = false,
  isActive = false,
  showPlaybackBars = false,
}: MediaCoverProps) {
  const rounded = shape === "circle" ? "rounded-full" : "rounded-lg";
  const showOverlay = Boolean(onPlay);

  return (
    <div className={`group relative w-full overflow-hidden ${aspectClass} ${rounded}`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          loading={loading}
          decoding={decoding}
          fetchPriority={fetchPriority}
          className={`h-full w-full object-cover ${rounded}`}
        />
      ) : (
        <div
          className={`h-full w-full ${rounded}`}
          style={{ background: coverFallback(title) }}
          aria-hidden
        />
      )}
      {showPlaybackBars ? (
        <>
          <span
            className={[
              "playback-thumb-glow",
              isActive ? "is-active" : "",
              isPlaying ? "is-playing" : "",
              rounded,
            ].join(" ")}
            aria-hidden="true"
          />
          <PlaybackBars variant="thumb" active={isActive} playing={isPlaying} />
        </>
      ) : null}
      {showOverlay ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPlay?.();
          }}
          className={[
            "absolute inset-0 flex items-center justify-center bg-black/40 transition",
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          ].join(" ")}
          aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)] shadow-lg">
            {isPlaying ? (
              <Pause size={22} fill="white" className="text-white" />
            ) : (
              <Play size={22} fill="white" className="text-white" />
            )}
          </span>
        </button>
      ) : null}
      {isActive ? (
        <div className={`pointer-events-none absolute inset-0 ring-2 ring-inset ring-[var(--color-brand)] ${rounded}`} />
      ) : null}
    </div>
  );
}
