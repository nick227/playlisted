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

function isTextEntryTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function isNonTextShortcutTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (isTextEntryTarget(target)) return true;
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
      const key = event.key.toLowerCase();
      const mod = event.metaKey || event.ctrlKey;
      const isSpace = event.code === "Space" || key === " ";

      if (isSpace) {
        if (event.repeat || mod || event.altKey) return;
        if (isTextEntryTarget(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        if (!isBusy && durationSec > 0) {
          togglePlayback();
        }
        return;
      }

      if (isNonTextShortcutTarget(event.target)) return;

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

      if ((key === "delete" || key === "backspace") && selectedAttachmentId) {
        event.preventDefault();
        detachAttachment(selectedAttachmentId);
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
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
