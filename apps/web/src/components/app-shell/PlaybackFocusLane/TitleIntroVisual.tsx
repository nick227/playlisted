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
      className="focus-lane__title-intro mx-auto flex w-full min-w-0 max-w-2xl items-center gap-3 rounded-2xl border border-white/10 bg-black/50 p-3 shadow-2xl backdrop-blur-xl transition-all sm:gap-5 sm:rounded-3xl sm:p-4"
      style={customStyle}
    >
      {imageUrl ? (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] sm:h-24 sm:w-24 sm:rounded-2xl">
          <img
            src={imageUrl}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="h-16 w-16 shrink-0 rounded-xl bg-white/5 shadow-inner sm:h-24 sm:w-24 sm:rounded-2xl" />
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
        {recording?.recordingType || recording?.genreLabel ? (
          <p className="mb-1 truncate text-[10px] font-semibold uppercase tracking-widest text-white/50 sm:text-xs">
            {[recording.recordingType, recording.genreLabel].filter(Boolean).join(" • ")}
          </p>
        ) : null}
        <h2 className="truncate text-xl font-extrabold tracking-tight text-white drop-shadow-md sm:text-3xl">
          {title}
        </h2>
        {artistName ? (
          <p className="mt-1 truncate text-base font-medium text-white/70 drop-shadow-sm sm:text-xl">
            {artistName}
          </p>
        ) : null}
      </div>
    </div>
  );
}
