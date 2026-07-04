import type { PointerEvent, SyntheticEvent } from "react";

import { buildRevealShieldClassName } from "./appShellLayout";

type PlaybackFocusRevealShieldProps = {
  visible: boolean;
  withPlayer: boolean;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: SyntheticEvent) => void;
  onPointerCancel: (event: SyntheticEvent) => void;
  onLostPointerCapture: (event: SyntheticEvent) => void;
  onClick: (event: SyntheticEvent) => void;
};

/** Transparent overlay that restores page content during cinematic playback focus. */
export function PlaybackFocusRevealShield({
  visible,
  withPlayer,
  onPointerDown,
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
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}
      onClick={onClick}
      aria-label="Show page content"
    />
  );
}
