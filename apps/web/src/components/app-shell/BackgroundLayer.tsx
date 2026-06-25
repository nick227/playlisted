export function BackgroundLayer() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[var(--color-canvas)]"
      aria-hidden="true"
      data-background-layer=""
    >
      <div className="absolute inset-0" data-theatre-mount="" />
    </div>
  );
}
