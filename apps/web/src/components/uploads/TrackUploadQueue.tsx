type UploadQueueItem = {
  id: string;
  name: string;
  progress01: number;
  status: "queued" | "uploading" | "registering" | "adding" | "done" | "error";
  error?: string;
};

export function TrackUploadQueue(props: { items: UploadQueueItem[] }) {
  const total = props.items.length;
  const done = props.items.filter((i) => i.status === "done").length;
  const overall01 = total > 0 ? done / total : 0;
  const overallPct = Math.round(overall01 * 100);

  if (total === 0) return null;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Uploading tracks</div>
          <div className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {done} / {total} added to collection
          </div>
        </div>
        <div className="shrink-0 text-sm font-semibold text-white">{overallPct}%</div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-elevated)]">
        <div className="h-full bg-[var(--color-brand)] transition-[width]" style={{ width: `${overallPct}%` }} />
      </div>
    </div>
  );
}

