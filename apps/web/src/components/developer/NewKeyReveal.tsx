import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function NewKeyReveal({ rawKey, onDismiss }: { rawKey: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  function copyKey() {
    navigator.clipboard.writeText(rawKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-5">
      <p className="mb-1 text-sm font-semibold text-green-400">API key created — copy it now</p>
      <p className="mb-3 text-xs text-[var(--color-text-muted)]">
        This key will never be shown again. Store it somewhere safe.
      </p>
      <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2">
        <code className="min-w-0 flex-1 truncate font-mono text-xs text-white">{rawKey}</code>
        <button
          type="button"
          onClick={copyKey}
          className="shrink-0 rounded p-1 text-[var(--color-text-muted)] transition hover:text-white"
          aria-label="Copy key"
        >
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-3 text-xs text-[var(--color-text-muted)] underline underline-offset-2 hover:text-white"
      >
        I've saved it — dismiss
      </button>
    </div>
  );
}
