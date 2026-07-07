type SwipeLoadingEdgeProps = {
  direction: "top" | "bottom";
  offset: number;
  previewLabel: string | null;
  edgeMessage: string | null;
  isRefreshing: boolean;
};

export function SwipeLoadingEdge({
  direction,
  offset,
  previewLabel,
  edgeMessage,
  isRefreshing,
}: SwipeLoadingEdgeProps) {
  const visible = offset > 8 || Boolean(edgeMessage) || isRefreshing;
  if (!visible) return null;

  const positionClass = direction === "top" ? "top-3" : "bottom-3";
  const label = edgeMessage ?? previewLabel;

  return (
    <>
      {isRefreshing ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-white/10">
          <div className="h-full w-1/3 animate-pulse bg-[var(--color-brand)]" />
        </div>
      ) : null}
      {label ? (
        <div
          className={`pointer-events-none absolute inset-x-0 z-20 flex justify-center ${positionClass}`}
        >
          <span className="rounded-full border border-white/10 bg-black/70 px-3 py-1 text-xs font-medium text-white/80 shadow-lg backdrop-blur">
            {label}
          </span>
        </div>
      ) : null}
    </>
  );
}
