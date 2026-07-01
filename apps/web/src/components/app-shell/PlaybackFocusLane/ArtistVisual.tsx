type ArtistVisualProps = {
  artistName: string;
  imageUrl?: string;
  bioLine?: string;
};

export function ArtistVisual({ artistName, imageUrl, bioLine }: ArtistVisualProps) {
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
        <p className="focus-lane__artist-name">{artistName}</p>
        {bioLine ? <p className="focus-lane__artist-bio">{bioLine}</p> : null}
      </div>
    </div>
  );
}
