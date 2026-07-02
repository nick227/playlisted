import { CircleSlash, Film } from "lucide-react";

type SongVisualStatusBadgeProps = {
  attachmentCount: number;
};

export function SongVisualStatusBadge({ attachmentCount }: SongVisualStatusBadgeProps) {
  const baseClass =
    "inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded border px-1.5 text-[10px] font-semibold uppercase leading-none";

  if (attachmentCount > 0) {
    return (
      <span
        className={`${baseClass} border-emerald-400/30 bg-emerald-400/10 text-emerald-200`}
        title={`${attachmentCount} attached visual${attachmentCount === 1 ? "" : "s"}`}
      >
        <Film size={13} />
        <span className="ml-1 hidden sm:inline">FX</span>
      </span>
    );
  }

  return (
    <span
      className={`${baseClass} border-white/10 bg-white/[0.03] text-[var(--color-text-subtle)]`}
      title="No attached visuals"
    >
      <CircleSlash size={13} />
      <span className="ml-1 hidden sm:inline">FX</span>
    </span>
  );
}
