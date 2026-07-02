import { useEffect, useRef } from "react";

import { resolveAssetUrl, type TimelineClip } from "./types";

type SongVisualEditorPreviewProps = {
  clip: TimelineClip | null;
  artworkUrl?: string | null;
  recordingTitle: string;
  isPlaying: boolean;
  currentTimeSec: number;
};

export function SongVisualEditorPreview({
  clip,
  artworkUrl,
  recordingTitle,
  isPlaying,
  currentTimeSec,
}: SongVisualEditorPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || clip?.attachment.mediaAsset.mediaType !== "video") return;

    const clipTimeSec = Math.max(0, currentTimeSec - clip.startSec);
    if (Math.abs(video.currentTime - clipTimeSec) > 0.25) {
      video.currentTime = clipTimeSec;
    }

    if (isPlaying && video.paused) {
      void video.play().catch(() => undefined);
      return;
    }
    if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [clip, currentTimeSec, isPlaying]);

  const attachment = clip?.attachment ?? null;
  const media = attachment?.mediaAsset ?? null;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
      {!media ? (
        <PreviewFallback artworkUrl={artworkUrl} title={recordingTitle} />
      ) : media.mediaType === "video" ? (
        <video
          ref={videoRef}
          src={resolveAssetUrl(media.url)}
          className="h-full w-full object-cover"
          muted
          playsInline
          loop
        />
      ) : (
        <img
          src={resolveAssetUrl(media.thumbnailUrl ?? media.url)}
          alt={attachment?.label ?? media.originalName}
          className="h-full w-full object-cover"
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
        <p className="truncate text-sm font-medium text-white">
          {attachment?.label ?? media?.originalName ?? "Default theatre rotation"}
        </p>
        <p className="text-xs text-white/60">
          {media
            ? `${media.mediaType}${attachment?.beatFx?.enabled ? " · beat reactive" : ""}`
            : "Attach visuals on the timeline below"}
        </p>
      </div>
    </div>
  );
}

function PreviewFallback({
  artworkUrl,
  title,
}: {
  artworkUrl?: string | null;
  title: string;
}) {
  if (artworkUrl) {
    return <img src={resolveAssetUrl(artworkUrl)} alt={title} className="h-full w-full object-cover opacity-70" />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 to-black px-6 text-center">
      <p className="text-sm text-white/50">Preview updates as you scrub the timeline</p>
    </div>
  );
}
