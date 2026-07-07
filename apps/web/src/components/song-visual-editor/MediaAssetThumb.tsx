import { Film, ImageIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { VisualMediaAssetRecord } from "@/lib/visualMediaApi";

import { resolveAssetUrl } from "./types";

type MediaAssetThumbProps = {
  asset: VisualMediaAssetRecord;
  className?: string;
};

export function MediaAssetThumb({ asset, className = "" }: MediaAssetThumbProps) {
  const imagePreviewUrl = asset.thumbnailUrl ?? (asset.mediaType === "image" ? asset.url : null);

  return (
    <div className={["relative overflow-hidden bg-black", className].join(" ")}>
      {imagePreviewUrl ? (
        <img
          src={resolveAssetUrl(imagePreviewUrl)}
          alt={asset.originalName}
          className="h-full w-full object-cover"
        />
      ) : asset.mediaType === "video" && asset.url ? (
        <VideoAssetThumb url={asset.url} label={asset.originalName} className="h-full w-full" />
      ) : (
        <div className="flex h-full items-center justify-center text-white/30">
          {asset.mediaType === "video" ? <Film size={16} /> : <ImageIcon size={16} />}
        </div>
      )}
    </div>
  );
}

function VideoAssetThumb({
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
    return (
      <div className={["flex items-center justify-center bg-black text-white/30", className].join(" ")}>
        <Film size={16} />
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={resolveAssetUrl(url)}
      className={["object-cover", className].join(" ")}
      aria-label={label}
      muted
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
    />
  );
}
