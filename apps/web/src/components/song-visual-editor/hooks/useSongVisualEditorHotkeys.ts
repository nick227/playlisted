import { useEffect } from "react";

type UseSongVisualEditorHotkeysArgs = {
  copySelectedClip: () => void;
  pasteClipAt: (startSec: number) => void | Promise<void>;
  detachAttachment: (attachmentId: string) => void;
  selectedAttachmentId: string | null;
  isBusy: boolean;
  currentTimeSec: number;
  togglePlayback: () => void;
  durationSec: number;
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLButtonElement || target instanceof HTMLSelectElement) return true;
  return target.isContentEditable;
}

export function useSongVisualEditorHotkeys({
  copySelectedClip,
  pasteClipAt,
  detachAttachment,
  selectedAttachmentId,
  isBusy,
  currentTimeSec,
  togglePlayback,
  durationSec,
}: UseSongVisualEditorHotkeysArgs) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;

      if (mod && key === "c") {
        event.preventDefault();
        copySelectedClip();
        return;
      }

      if (mod && key === "v") {
        event.preventDefault();
        void pasteClipAt(currentTimeSec);
        return;
      }

      if (event.code === "Space" || key === " ") {
        event.preventDefault();
        if (!isBusy && durationSec > 0) {
          togglePlayback();
        }
        return;
      }

      if ((key === "delete" || key === "backspace") && selectedAttachmentId) {
        event.preventDefault();
        detachAttachment(selectedAttachmentId);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    copySelectedClip,
    pasteClipAt,
    detachAttachment,
    selectedAttachmentId,
    isBusy,
    currentTimeSec,
    togglePlayback,
    durationSec,
  ]);
}
