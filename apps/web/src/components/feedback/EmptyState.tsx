import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <p className="text-lg font-semibold text-white">{title}</p>
      {description ? <p className="max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p> : null}
      {action}
    </div>
  );
}
