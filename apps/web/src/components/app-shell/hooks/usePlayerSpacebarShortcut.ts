import { useEffect } from "react";

import { isPlaybackFocusSuppressed } from "@/lib/playbackFocusSuppression";
import { isPlayerShortcutSuppressed } from "@/lib/playerKeyboard";

type UsePlayerSpacebarShortcutOptions = {
  currentTrackId: string | undefined;
  radioAudioUrl: string | undefined;
  radioPlaying: boolean;
  togglePlay: () => void;
  toggleRadioPlayback: () => void | Promise<void>;
};

/** Global spacebar toggles play/pause when focus is not in an input. */
export function usePlayerSpacebarShortcut({
  currentTrackId,
  radioAudioUrl,
  radioPlaying,
  togglePlay,
  toggleRadioPlayback,
}: UsePlayerSpacebarShortcutOptions) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space" && event.key !== " ") return;
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isPlaybackFocusSuppressed()) return;
      if (isPlayerShortcutSuppressed(event)) return;

      if (radioPlaying || (!currentTrackId && radioAudioUrl)) {
        event.preventDefault();
        void toggleRadioPlayback();
        return;
      }

      if (!currentTrackId) return;
      event.preventDefault();
      togglePlay();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentTrackId, radioAudioUrl, radioPlaying, togglePlay, toggleRadioPlayback]);
}
