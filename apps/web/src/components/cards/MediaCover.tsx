import { Play } from "lucide-react";

import { coverFallback } from "@/lib/routes";

interface MediaCoverProps {
  title: string;
  imageUrl?: string | null;
  shape?: "square" | "circle";
  onPlay?: () => void;
}

export function MediaCover({ title, imageUrl, shape = "square", onPlay }: MediaCoverProps) {
  const rounded = shape === "circle" ? "rounded-full" : "rounded-lg";

  return (
    <div className={`group relative aspect-square w-full overflow-hidden ${rounded}`}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className={`h-full w-full object-cover ${rounded}`} />
      ) : (
        <div
          className={`h-full w-full ${rounded}`}
          style={{ background: coverFallback(title) }}
          aria-hidden
        />
      )}
      {onPlay ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPlay();
          }}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100"
          aria-label={`Play ${title}`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)] shadow-lg">
            <Play size={22} fill="white" className="text-white" />
          </span>
        </button>
      ) : null}
    </div>
  );
}
