import type { CSSProperties } from "react";
import type { FocusRecording } from "@/lib/playbackFocus/types";

type TitleIntroVisualProps = {
  title: string;
  artistName?: string | null;
  recording?: FocusRecording | null;
  customStyle?: CSSProperties;
};

export function TitleIntroVisual({
  title,
  artistName,
  recording,
  customStyle,
}: TitleIntroVisualProps) {
  const imageUrl = recording?.artworkUrl;

  return (
    <div
      className="focus-lane__title-intro flex items-center gap-6 rounded-3xl bg-black/50 p-4 pr-10 shadow-2xl backdrop-blur-xl border border-white/10 mx-auto max-w-2xl transform transition-all"
      style={customStyle}
    >
      {imageUrl ? (
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
          <img
            src={imageUrl}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="h-24 w-24 shrink-0 rounded-2xl bg-white/5 shadow-inner" />
      )}
      <div className="flex flex-col justify-center overflow-hidden">
        {recording?.recordingType || recording?.genreLabel ? (
          <p className="mb-1 truncate text-xs font-semibold uppercase tracking-widest text-white/50">
            {[recording.recordingType, recording.genreLabel].filter(Boolean).join(" • ")}
          </p>
        ) : null}
        <h2 className="truncate text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
          {title}
        </h2>
        {artistName ? (
          <p className="mt-1 truncate text-xl font-medium text-white/70 drop-shadow-sm">
            {artistName}
          </p>
        ) : null}
      </div>
    </div>
  );
}
