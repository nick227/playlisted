import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { AdminApiKey, AdminApiKeyStats } from "@playlisted/client-sdk";
import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";
import { usePageMeta } from "@/hooks/usePageMeta";

type StatusFilter = "all" | "active" | "revoked";

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-amber-400/30 bg-amber-400/5" : "border-[var(--color-border)] bg-[var(--color-surface)]"}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold tracking-tight ${accent ? "text-amber-400" : "text-white"}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function KeyRow({ apiKey, onRevoke, revoking }: {
  apiKey: AdminApiKey;
  onRevoke: () => void;
  revoking: boolean;
}) {
  const isActive = !apiKey.revokedAt;

  return (
    <tr className={`border-b border-[var(--color-border)] transition ${isActive ? "" : "opacity-50"}`}>
      <td className="px-4 py-3">
        <p className="text-sm font-semibold text-white">{apiKey.user.displayName}</p>
        <p className="text-xs text-[var(--color-text-muted)]">@{apiKey.user.username}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-white">{apiKey.name}</p>
        <p className="font-mono text-[10px] text-[var(--color-text-muted)]">{apiKey.prefix}••••••••</p>
      </td>
      <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
        {apiKey.lastUsedAt
          ? new Date(apiKey.lastUsedAt).toLocaleString()
          : <span className="text-zinc-600">Never</span>}
      </td>
      <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
        {new Date(apiKey.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
          isActive
            ? "bg-green-500/20 text-green-400"
            : "bg-zinc-700 text-zinc-400"
        }`}>
          {isActive ? "Active" : "Revoked"}
        </span>
      </td>
      <td className="px-4 py-3">
        {isActive ? (
          <button
            type="button"
            onClick={onRevoke}
            disabled={revoking}
            className="text-xs text-red-400 transition hover:text-red-300 disabled:opacity-40"
          >
            {revoking ? "Revoking…" : "Revoke"}
          </button>
        ) : (
          <span className="text-xs text-zinc-600">—</span>
        )}
      </td>
    </tr>
  );
}

export function AdminApiKeysPage() {
  const { accessToken } = useAuth();
  const api = useMemo(() => authedApi(accessToken), [accessToken]);

  usePageMeta({ title: "API Keys — Admin" });

  const [keys, setKeys] = useState<AdminApiKey[]>([]);
  const [stats, setStats] = useState<AdminApiKeyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.admin.listApiKeys({
        status: statusFilter,
        q: search.trim() || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setKeys(res.data);
      setTotal(res.meta.total);
      setStats(res.stats);
    } catch (e: any) {
      setError(e.message ?? "Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  }, [api, statusFilter, search, page]);

  useEffect(() => { load(); }, [load]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setSearch(value);
    }, 350);
  };

  const handleRevoke = async (keyId: string) => {
    const key = keys.find((k) => k.id === keyId);
    const label = key ? `"${key.name}" for @${key.user.username}` : "this key";
    if (!confirm(`Revoke API key ${label}? This cannot be undone.`)) return;
    setRevoking(keyId);
    try {
      await api.admin.revokeApiKey(keyId);
      await load();
    } catch (e: any) {
      setError(e.message ?? "Failed to revoke key.");
    } finally {
      setRevoking(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-white">Developer API Keys</h2>

      {/* Stats */}
      {stats && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <StatCard label="Active keys" value={stats.totalActive} accent />
          <StatCard label="Used in last 7 days" value={stats.usedLast7d} />
          <StatCard label="Revoked keys" value={stats.totalRevoked} />
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by user or key name…"
          className="w-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
        <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden text-sm">
          {(["active", "all", "revoked"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setPage(1); setStatusFilter(s); }}
              className={`px-3 py-1.5 font-medium capitalize transition ${
                statusFilter === s
                  ? "bg-amber-400 text-black"
                  : "text-[var(--color-text-muted)] hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-[var(--color-text-muted)]">{total} keys</span>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
        <table className="w-full text-left">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
            <tr>
              {["User", "Key", "Last used", "Created", "Status", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-[var(--color-canvas)]">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                  Loading…
                </td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">
                  No keys match the current filters.
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <KeyRow
                  key={key.id}
                  apiKey={key}
                  onRevoke={() => handleRevoke(key.id)}
                  revoking={revoking === key.id}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-text-muted)] transition hover:text-white disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-[var(--color-text-muted)]">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-[var(--color-text-muted)] transition hover:text-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
