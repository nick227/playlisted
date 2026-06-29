import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { usePlaybackTransport } from "@/hooks/usePlaybackTransport";
import { playbackFocusTiming } from "@/lib/playbackFocusTiming";
import { fetchRecordingSubtitles, type RecordingSubtitlesResponse } from "@/lib/subtitles";
import { useSubtitleDisplay } from "@/lib/subtitleDisplay";
import { useAudioPlayer } from "@/providers/AudioPlayerProvider";
import { useAuth } from "@/providers/AuthProvider";

type SubtitleLayerProps = {
  visible: boolean;
};

export function SubtitleLayer({ visible }: SubtitleLayerProps) {
  const { accessToken } = useAuth();
  const { currentTrack, isPlaying } = useAudioPlayer();
  const { currentTime } = usePlaybackTransport();
  const { subtitlesEnabled } = useSubtitleDisplay();
  const [subtitles, setSubtitles] = useState<RecordingSubtitlesResponse | null>(null);
  const [renderedSubtitleText, setRenderedSubtitleText] = useState("");
  const [layerVisible, setLayerVisible] = useState(false);
  const renderedSubtitleTextRef = useRef("");

  useEffect(() => {
    renderedSubtitleTextRef.current = renderedSubtitleText;
  }, [renderedSubtitleText]);

  const canLoadSubtitles = Boolean(
    subtitlesEnabled &&
    isPlaying &&
    currentTrack?.id &&
    currentTrack.subtitle != null
  );

  useEffect(() => {
    if (!canLoadSubtitles || !currentTrack?.id) {
      setSubtitles(null);
      return;
    }

    let cancelled = false;
    let pollTimer: number | null = null;

    const fetchSubs = () => {
      fetchRecordingSubtitles(currentTrack.id, accessToken)
        .then((data) => {
          if (cancelled) return;
          setSubtitles(data);
          
          // Poll every 3 seconds if not yet resolved
          if (data.status === "QUEUED" || data.status === "PROCESSING") {
            pollTimer = window.setTimeout(fetchSubs, 3000);
          }
        })
        .catch(() => {
          if (!cancelled) setSubtitles({ status: "FAILED", errorMessage: "Subtitles unavailable" });
        });
    };

    fetchSubs();

    return () => {
      cancelled = true;
      if (pollTimer !== null) window.clearTimeout(pollTimer);
    };
  }, [accessToken, canLoadSubtitles, currentTrack?.id]);

  const activeSubtitleText = useMemo(() => {
    if (!visible || !subtitlesEnabled || !isPlaying) return "";
    if (subtitles?.status !== "READY") return "";
    const active = subtitles.segments?.find(
      (segment) => currentTime >= segment.start && currentTime < segment.end,
    );
    return active?.text.trim() ?? "";
  }, [currentTime, isPlaying, subtitles, subtitlesEnabled, visible]);

  useEffect(() => {
    if (activeSubtitleText) {
      setRenderedSubtitleText(activeSubtitleText);
      if (renderedSubtitleTextRef.current) {
        setLayerVisible(true);
        return;
      }

      setLayerVisible(false);
      let secondFrame: number | null = null;
      const firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          setLayerVisible(true);
        });
      });

      return () => {
        window.cancelAnimationFrame(firstFrame);
        if (secondFrame !== null) window.cancelAnimationFrame(secondFrame);
      };
    }

    setLayerVisible(false);
    if (!renderedSubtitleTextRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setRenderedSubtitleText("");
    }, playbackFocusTiming.subtitle.fadeOutMs + playbackFocusTiming.subtitle.exitBufferMs);

    return () => window.clearTimeout(timeout);
  }, [activeSubtitleText]);

  if (!currentTrack?.id) return null;
  if (!activeSubtitleText && !renderedSubtitleText) return null;

  return (
    <>
      {createPortal(
        <div
          data-subtitle-layer
          className={`subtitle-layer${layerVisible ? " is-visible" : ""}`}
          aria-hidden={!activeSubtitleText}
        >
          <p className="subtitle-layer__text">{renderedSubtitleText}</p>
        </div>,
        document.body,
      )}
    </>
  );
}
