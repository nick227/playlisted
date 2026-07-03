import type React from "react";

type ArtistVisualProps = {
  artistName?: string;
  imageUrl?: string;
  subtitleNode?: React.ReactNode;
};

export function ArtistVisual({ artistName, imageUrl, subtitleNode }: ArtistVisualProps) {
  const imageStyle = imageUrl
    ? { backgroundImage: `url(${imageUrl})` }
    : undefined;

  return (
    <div className="focus-lane__artist">
      <div
        className={`focus-lane__artist-image${imageUrl ? "" : " focus-lane__artist-image--fallback"}`}
        style={imageStyle}
        aria-hidden
      />
      <div className="focus-lane__artist-copy">
        {artistName ? <p className="focus-lane__artist-name">{artistName}</p> : null}
        {subtitleNode ? <div className="focus-lane__artist-subtitle">{subtitleNode}</div> : null}
      </div>
    </div>
  );
}
