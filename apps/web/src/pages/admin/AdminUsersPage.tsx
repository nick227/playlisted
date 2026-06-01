import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { UserSummary } from "@playlisted/client-sdk";
import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";
import { usePageMeta } from "@/hooks/usePageMeta";

type UserRole = "LISTENER" | "CREATOR" | "EDITOR" | "ADMIN";
type UserStatus = "ACTIVE" | "SUSPENDED" | "INVITED";

const ROLE_LABELS: Record<UserRole, string> = {
  LISTENER: "Listener",
  CREATOR: "Creator",
  EDITOR: "Editor",
  ADMIN: "Admin",
};

const ROLE_COLORS: Record<UserRole, string> = {
  LISTENER: "text-zinc-400",
  CREATOR: "text-blue-400",
  EDITOR: "text-purple-400",
  ADMIN: "text-amber-400",
};

const STATUS_COLORS: Record<UserStatus, string> = {
  ACTIVE: "text-green-400",
  SUSPENDED: "text-red-400",
  INVITED: "text-zinc-400",
};

export function AdminUsersPage() {
  const { accessToken, user: currentUser } = useAuth();
  const api = useMemo(() => authedApi(accessToken), [accessToken]);
  const isFullAdmin = currentUser?.role === "ADMIN";
  const [users, setUsers] = useState<UserSummary[]>([]);

  usePageMeta({ title: "Users — Admin" });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "ALL">("ALL");
  const [filterStatus, setFilterStatus] = useState<UserStatus | "ALL">("ALL");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string | number> = { page, pageSize: PAGE_SIZE };
      if (filterRole !== "ALL") query.role = filterRole;
      if (filterStatus !== "ALL") query.status = filterStatus;
      if (search.trim()) query.q = search.trim();
      const res = await api.admin.listUsers(query as any);
      setUsers(res.data);
      setTotal(res.meta.total);
    } catch (e: any) {
      setError(e.message ?? "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [api, page, filterRole, filterStatus, search]);

  useEffect(() => { load(); }, [load]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setSearch(value);
    }, 350);
  };

  const update = async (userId: string, patch: { role?: UserRole; status?: UserStatus; isFeaturedArtist?: boolean }) => {
    setSaving(userId);
    setError(null);
    try {
      const updated = await api.admin.updateUser(userId, patch);
      setUsers((prev) => prev.map((u) => u.id === userId ? updated : u));
    } catch (e: any) {
      setError(e.message ?? "Failed to update user.");
    } finally {
      setSaving(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Admin / Users</p>
        <h2 className="mt-1 text-2xl font-bold text-white">User Management</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {isFullAdmin
            ? "Adjust roles, suspend accounts, and flag featured artists."
            : "Flag featured artists. Only full admins may change roles or account status."}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <input
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search name, username, or email…"
          className="min-w-[220px] flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-amber-400/50"
        />
        <select
          value={filterRole}
          onChange={(e) => { setFilterRole(e.target.value as UserRole | "ALL"); setPage(1); }}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="ALL">All roles</option>
          {(["LISTENER", "CREATOR", "EDITOR", "ADMIN"] as UserRole[]).map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as UserStatus | "ALL"); setPage(1); }}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="ALL">All statuses</option>
          {(["ACTIVE", "SUSPENDED", "INVITED"] as UserStatus[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="text-xs text-[var(--color-text-muted)]">
        {total} users total · showing {users.length}
        {search.trim() ? ` matching "${search}"` : ""}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No users found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)] text-left text-xs text-[var(--color-text-muted)]">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Featured</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-surface)]">
              {users.map((user) => (
                <tr key={user.id} className={`transition ${saving === user.id ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700 text-xs font-bold text-white">
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-white">{user.displayName}</p>
                        <p className="text-xs text-[var(--color-text-muted)]">@{user.username} · {user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => update(user.id, { role: e.target.value as UserRole })}
                      disabled={saving === user.id || !isFullAdmin}
                      title={isFullAdmin ? undefined : "Only admins can change roles"}
                      className={`rounded border border-[var(--color-border)] bg-black/30 px-2 py-1 text-xs font-semibold focus:outline-none disabled:opacity-50 ${ROLE_COLORS[user.role as UserRole]}`}
                    >
                      {(["LISTENER", "CREATOR", "EDITOR", "ADMIN"] as UserRole[]).map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.status}
                      onChange={(e) => update(user.id, { status: e.target.value as UserStatus })}
                      disabled={saving === user.id || !isFullAdmin}
                      title={isFullAdmin ? undefined : "Only admins can change account status"}
                      className={`rounded border border-[var(--color-border)] bg-black/30 px-2 py-1 text-xs font-semibold focus:outline-none disabled:opacity-50 ${STATUS_COLORS[user.status as UserStatus]}`}
                    >
                      {(["ACTIVE", "SUSPENDED", "INVITED"] as UserStatus[]).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => update(user.id, { isFeaturedArtist: !user.isFeaturedArtist })}
                      disabled={saving === user.id}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        user.isFeaturedArtist
                          ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                          : "border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white"
                      }`}
                    >
                      {user.isFeaturedArtist ? "Featured" : "Not featured"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-muted)]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-white disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-[var(--color-text-muted)]">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-white disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
