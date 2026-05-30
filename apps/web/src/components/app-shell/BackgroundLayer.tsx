export function BackgroundLayer() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 bg-[var(--color-canvas)]"
      aria-hidden="true"
      data-background-layer=""
    />
  );
}
