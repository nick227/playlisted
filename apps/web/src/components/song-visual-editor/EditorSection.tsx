import type { ReactNode } from "react";

type EditorSectionProps = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

export function EditorSection({ title, action, children }: EditorSectionProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
