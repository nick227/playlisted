import type { CSSProperties } from "react";

type SubtitleTextProps = {
  text: string;
  customStyle?: CSSProperties;
};

/** Lyric caption text for the focus-lane subtitle layer. */
export function SubtitleText({ text, customStyle }: SubtitleTextProps) {
  return (
    <p
      className={`focus-lane__text${customStyle ? " focus-lane__text--custom" : ""}`}
      style={customStyle}
    >
      {text}
    </p>
  );
}
