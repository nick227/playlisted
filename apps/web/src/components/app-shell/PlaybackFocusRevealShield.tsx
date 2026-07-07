import type { PointerEvent, SyntheticEvent } from "react";

import { buildRevealShieldClassName } from "./appShellLayout";

type PlaybackFocusRevealShieldProps = {
  visible: boolean;
  withPlayer: boolean;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove?: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement> | SyntheticEvent) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement> | SyntheticEvent) => void;
  onLostPointerCapture: (event: PointerEvent<HTMLElement> | SyntheticEvent) => void;
  onClick: (event: SyntheticEvent) => void;
};

/** Transparent overlay that restores page content during cinematic playback focus. */
export function PlaybackFocusRevealShield({
  visible,
  withPlayer,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  onClick,
}: PlaybackFocusRevealShieldProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      className={buildRevealShieldClassName(withPlayer)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}
      onClick={onClick}
      aria-label="Show page content"
    />
  );
}
