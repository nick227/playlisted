import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Check, Trash2, Plus, Key } from "lucide-react";
import type { ApiKey } from "@playlisted/client-sdk";

import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";
import { usePageMeta } from "@/hooks/usePageMeta";

function KeyRow({ apiKey, onRevoke, revoking }: {
  apiKey: ApiKey;
  onRevoke: () => void;
  revoking: boolean;
}) {
  const lastUsed = apiKey.lastUsedAt
    ? new Date(apiKey.lastUsedAt).toLocaleDateString()
    : "Never";

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <Key size={16} className="shrink-0 text-[var(--color-text-muted)]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{apiKey.name}</p>
        <p className="mt-0.5 font-mono text-xs text-[var(--color-text-muted)]">
          {apiKey.prefix}••••••••••••••••••••••••
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-xs text-[var(--color-text-muted)]">Last used</p>
        <p className="text-xs text-white">{lastUsed}</p>
      </div>
      <button
        type="button"
        onClick={onRevoke}
        disabled={revoking}
        className="shrink-0 rounded-lg p-2 text-[var(--color-text-muted)] transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
        aria-label="Revoke key"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function NewKeyReveal({ rawKey, onDismiss }: { rawKey: string; onDismiss: () => void }) {
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

export function StudioDeveloperPage() {
  const { accessToken } = useAuth();
  const client = authedApi(accessToken);
  const queryClient = useQueryClient();

  usePageMeta({ title: "Developer — Studio" });

  const [newKeyName, setNewKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const keysQuery = useQuery({
    queryKey: ["developer", "keys"],
    queryFn: () => client.developer.listKeys(),
    enabled: Boolean(accessToken),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => client.developer.createKey({ name }),
    onSuccess: (created) => {
      setRevealedKey(created.key);
      setNewKeyName("");
      queryClient.invalidateQueries({ queryKey: ["developer", "keys"] });
    },
  });

  async function handleRevoke(keyId: string) {
    setRevokingId(keyId);
    try {
      await client.developer.revokeKey(keyId);
      queryClient.invalidateQueries({ queryKey: ["developer", "keys"] });
    } finally {
      setRevokingId(null);
    }
  }

  const keys = keysQuery.data?.keys ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand)]">
        Developer
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">API Keys</h1>
      <p className="mt-3 text-sm text-[var(--color-text-muted)]">
        Use API keys to authenticate requests to the Playlisted Ingest API. Keys act on behalf
        of your account — treat them like passwords.
      </p>

      <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <p className="mb-3 text-sm font-semibold text-white">Create a new key</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newKeyName.trim()) createMutation.mutate(newKeyName.trim());
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name, e.g. My Script"
            maxLength={100}
            required
            className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand)]"
          />
          <button
            type="submit"
            disabled={createMutation.isPending || !newKeyName.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            <Plus size={15} />
            {createMutation.isPending ? "Creating…" : "Create"}
          </button>
        </form>
        {createMutation.isError ? (
          <p className="mt-2 text-xs text-red-400">
            {createMutation.error instanceof Error
              ? createMutation.error.message
              : "Failed to create key."}
          </p>
        ) : null}
      </div>

      {revealedKey ? (
        <div className="mt-4">
          <NewKeyReveal rawKey={revealedKey} onDismiss={() => setRevealedKey(null)} />
        </div>
      ) : null}

      <div className="mt-8">
        <p className="mb-3 text-sm font-semibold text-white">
          Active keys{keys.length > 0 ? ` (${keys.length})` : ""}
        </p>
        {keysQuery.isLoading ? (
          <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
        ) : keys.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
            No API keys yet. Create one above to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <KeyRow
                key={key.id}
                apiKey={key}
                onRevoke={() => handleRevoke(key.id)}
                revoking={revokingId === key.id}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <p className="mb-2 text-sm font-semibold text-white">Usage</p>
        <p className="mb-3 text-xs text-[var(--color-text-muted)]">
          Pass your key as a Bearer token in the Authorization header:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-[var(--color-canvas)] px-4 py-3 font-mono text-xs text-[var(--color-brand)]">
          {`Authorization: Bearer plt_your_key_here`}
        </pre>
      </div>
    </div>
  );
}
