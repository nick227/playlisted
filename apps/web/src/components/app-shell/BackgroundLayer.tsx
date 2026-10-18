type BackgroundLayerProps = {
  /** Shelved theatre: idle-reveal visibility of the song-art mount. */
  songArtVisible?: boolean;
};

export function BackgroundLayer({ songArtVisible = true }: BackgroundLayerProps) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[var(--color-canvas)]"
      aria-hidden="true"
      data-background-layer=""
    >
      <div
        className={`theatre-mount absolute inset-0${songArtVisible ? " is-song-art-visible" : ""}`}
        data-theatre-mount=""
      />
    </div>
  );
}
