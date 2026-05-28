import { useState } from "react";

import { bulkRegisterUploads, uploadAudioFile } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";

type QueueItem = {
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
};

export function StudioUploadsPage() {
  const { accessToken } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [registering, setRegistering] = useState(false);

  const doneCount = queue.filter((q) => q.status === "done").length;
  const total = queue.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  function onFilesSelected(files: FileList | null) {
    if (!files?.length) return;
    setQueue(
      Array.from(files).map((file) => ({
        file,
        status: "queued",
      })),
    );
  }

  async function runUploads() {
    if (!accessToken || queue.length === 0) return;

    const uploaded: { url: string; mimeType: string; bytes: number; title: string }[] = [];

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      setQueue((prev) =>
        prev.map((q, idx) => (idx === i ? { ...q, status: "uploading" } : q)),
      );

      try {
        const result = await uploadAudioFile(item.file, accessToken);
        uploaded.push({
          url: result.url,
          mimeType: result.mimeType,
          bytes: result.bytes,
          title: result.title,
        });
        setQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: "done" } : q)),
        );
      } catch (error) {
        setQueue((prev) =>
          prev.map((q, idx) =>
            idx === i
              ? {
                  ...q,
                  status: "error",
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : q,
          ),
        );
      }
    }

    if (uploaded.length > 0) {
      setRegistering(true);
      try {
        await bulkRegisterUploads(uploaded, accessToken);
      } finally {
        setRegistering(false);
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-extrabold text-white">Bulk upload</h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Select multiple MP3s. Tracks land in your uploads library and can be added to any collection.
      </p>

      <label className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 transition hover:border-[var(--color-brand)]">
        <span className="text-lg font-semibold text-white">Drop files or click to browse</span>
        <span className="mt-2 text-sm text-[var(--color-text-muted)]">MP3, M4A, WAV</span>
        <input
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(e) => onFilesSelected(e.target.files)}
        />
      </label>

      {total > 0 ? (
        <div className="mt-8">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">
              {doneCount} / {total} uploaded
            </span>
            <span className="font-medium text-white">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-elevated)]">
            <div
              className="h-full bg-[var(--color-brand)] transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <ul className="mt-6 max-h-64 space-y-2 overflow-y-auto">
            {queue.map((item, index) => (
              <li
                key={`${item.file.name}-${index}`}
                className="flex items-center justify-between rounded-lg bg-[var(--color-surface)] px-3 py-2 text-sm"
              >
                <span className="truncate text-white">{item.file.name}</span>
                <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                  {item.status}
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={runUploads}
            disabled={registering || queue.some((q) => q.status === "uploading")}
            className="mt-6 w-full rounded-full bg-white py-3 font-bold text-black disabled:opacity-50"
          >
            {registering ? "Saving to library…" : "Start upload"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
