import { useEffect, useRef, useState } from "react";

import {
  TheatrePresetThumbnail,
  TheatrePresetThumbnailFallback,
} from "./TheatrePresetThumbnail";
import { resolveAssetUrl } from "./types";
import type { VisualLibraryRow } from "./useSongVisualLibraryItems";

type CommunityFxThumbProps = {
  row: VisualLibraryRow;
  className?: string;
};

export function CommunityFxThumb({ row, className = "" }: CommunityFxThumbProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!isVisible) {
    return (
      <div ref={containerRef} className={["h-full w-full", className].join(" ")}>
        <TheatrePresetThumbnailFallback kind={row.communityKind ?? "animations"} className="h-full w-full" />
      </div>
    );
  }

  if (row.communityKind === "videos" && row.thumbUrl) {
    return <CommunityVideoThumb url={row.thumbUrl} label={row.label} className={className} />;
  }

  if (row.theatrePresetId) {
    return (
      <TheatrePresetThumbnail
        presetId={row.theatrePresetId}
        kind={row.communityKind ?? "animations"}
        className={className}
      />
    );
  }

  return <TheatrePresetThumbnailFallback kind={row.communityKind ?? "animations"} className={className} />;
}

function CommunityVideoThumb({
  url,
  label,
  className,
}: {
  url: string;
  label: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    function primeFrame() {
      if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
      video.currentTime = Math.min(0.25, video.duration * 0.05);
    }

    video.addEventListener("loadeddata", primeFrame, { once: true });
    return () => video.removeEventListener("loadeddata", primeFrame);
  }, [url]);

  if (failed) {
    return <TheatrePresetThumbnailFallback kind="videos" className={className} />;
  }

  return (
    <video
      ref={videoRef}
      src={resolveAssetUrl(url)}
      className={["h-full w-full object-cover", className].join(" ")}
      aria-label={label}
      muted
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
    />
  );
}
