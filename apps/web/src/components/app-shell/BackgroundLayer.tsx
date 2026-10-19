import { useEffect, useState } from "react";

import { THEATRE_SHELVED } from "@/theatre/shelf";
import "./songArtwork.css";

type BackgroundLayerProps = {
  artworkUrl: string | null;
  songArtEnabled: boolean;
};

type ArtworkLayer = { url: string; visible: boolean };

/** Song context owns these layers; playback activity and page focus are irrelevant. */
function SongArtwork({ artworkUrl, enabled }: { artworkUrl: string | null; enabled: boolean }) {
  const [layers, setLayers] = useState<ArtworkLayer[]>([]);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let nextFrame = 0;
    let cleanupTimer = 0;
    const image = new Image();

    const transition = (url: string | null) => {
      if (cancelled) return;
      if (url) {
        setLayers((previous) => [...previous.filter((layer) => layer.url !== url), { url, visible: false }]);
      }
      // Give the new layer an initial painted frame before changing its opacity.
      frame = requestAnimationFrame(() => {
        nextFrame = requestAnimationFrame(() => {
          setLayers((previous) => previous.map((layer) => ({ ...layer, visible: layer.url === url })));
          cleanupTimer = window.setTimeout(() => {
            setLayers((previous) => previous.filter((layer) => layer.url === url));
          }, 800);
        });
      });
    };

    if (artworkUrl) {
      image.onload = () => transition(artworkUrl);
      image.onerror = () => transition(null);
      image.src = artworkUrl;
    } else {
      transition(null);
    }

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(nextFrame);
      window.clearTimeout(cleanupTimer);
    };
  }, [artworkUrl]);

  return (
    <div className="song-artwork" style={{ opacity: enabled ? 1 : 0 }} data-song-artwork="">
      {layers.map(({ url, visible }) => (
        <img key={url} src={url} alt="" className="song-artwork-image" style={{ opacity: visible ? 1 : 0 }} />
      ))}
      <div className="song-artwork-shade" />
    </div>
  );
}

export function BackgroundLayer({ artworkUrl, songArtEnabled }: BackgroundLayerProps) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[var(--color-canvas)]"
      aria-hidden="true"
      data-background-layer=""
    >
      {THEATRE_SHELVED ? (
        <SongArtwork artworkUrl={artworkUrl} enabled={songArtEnabled} />
      ) : (
        <div className="theatre-mount absolute inset-0 is-song-art-visible" data-theatre-mount="" />
      )}
    </div>
  );
}
