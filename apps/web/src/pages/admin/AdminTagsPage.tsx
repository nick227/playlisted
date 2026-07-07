import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { AdminTag, AdminCreateTagRequest, AdminBulkCreateTagItem } from "@playlisted/client-sdk";
import { authedApi } from "@/lib/authedApi";
import { useAuth } from "@/providers/AuthProvider";
import { usePageMeta } from "@/hooks/usePageMeta";

const KIND_OPTIONS = ["GENRE", "MOOD", "CATEGORY", "SCENE"] as const;
type TagKind = typeof KIND_OPTIONS[number];

const KIND_LABELS: Record<TagKind, string> = {
  GENRE: "Genre",
  MOOD: "Mood",
  CATEGORY: "Category",
  SCENE: "Scene",
};

const KIND_COLORS: Record<TagKind, string> = {
  GENRE: "text-purple-400 bg-purple-400/10",
  MOOD: "text-blue-400 bg-blue-400/10",
  CATEGORY: "text-amber-400 bg-amber-400/10",
  SCENE: "text-green-400 bg-green-400/10",
};

type ImportPreviewItem = AdminBulkCreateTagItem & { duplicate: boolean };

function parseCsv(text: string, existingSlugs: Set<string>): ImportPreviewItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const seen = new Set<string>();
  const result: ImportPreviewItem[] = [];

  for (const line of lines) {
    if (line.startsWith("#")) continue;
    const [rawName, rawKind] = line.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
    if (!rawName) continue;

    const name = rawName.slice(0, 64);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180);
    if (!slug) continue;

    const kind = (KIND_OPTIONS as readonly string[]).includes(rawKind?.toUpperCase() ?? "")
      ? (rawKind!.toUpperCase() as TagKind)
      : "GENRE";

    const isDuplicateExisting = existingSlugs.has(slug);
    const isDuplicateInBatch = seen.has(slug);
    seen.add(slug);

    result.push({ name, kind, duplicate: isDuplicateExisting || isDuplicateInBatch });
  }

  return result;
}

export function AdminTagsPage() {
  const { accessToken } = useAuth();
  const api = useMemo(() => authedApi(accessToken), [accessToken]);
  const [tags, setTags] = useState<AdminTag[]>([]);

  usePageMeta({ title: "Tags — Admin" });
  const [loading, setLoading] = useState(true);
  const [filterKind, setFilterKind] = useState<TagKind | "ALL">("ALL");
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<TagKind>("GENRE");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKind, setEditKind] = useState<TagKind>("GENRE");
  const [error, setError] = useState<string | null>(null);

  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<ImportPreviewItem[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.admin.listTags();
      setTags(res.data);
    } catch (e: any) {
      setError(e.message ?? "Failed to load tags.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const body: AdminCreateTagRequest = { name: newName.trim(), kind: newKind };
      const tag = await api.admin.createTag(body);
      setTags((prev) => [...prev, tag].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)));
      setNewName("");
    } catch (e: any) {
      setError(e.message ?? "Failed to create tag.");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (tag: AdminTag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditKind(tag.kind as TagKind);
  };

  const handleSaveEdit = async (tagId: string) => {
    setError(null);
    try {
      const updated = await api.admin.updateTag(tagId, { name: editName.trim(), kind: editKind });
      setTags((prev) => prev.map((t) => t.id === tagId ? updated : t).sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)));
      setEditingId(null);
    } catch (e: any) {
      setError(e.message ?? "Failed to update tag.");
    }
  };

  const handleDelete = async (tagId: string, name: string) => {
    if (!confirm(`Delete tag "${name}"? This will remove it from all playlists and tracks.`)) return;
    setError(null);
    try {
      await api.admin.deleteTag(tagId);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch (e: any) {
      setError(e.message ?? "Failed to delete tag.");
    }
  };

  const existingSlugs = useMemo(
    () => new Set(tags.map((t) => t.slug)),
    [tags]
  );

  const handleCsvChange = (text: string) => {
    setCsvText(text);
    setImportResult(null);
    if (!text.trim()) { setPreview(null); return; }
    setPreview(parseCsv(text, existingSlugs));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      setPreview(parseCsv(text, existingSlugs));
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!preview) return;
    const toImport = preview
      .filter((p) => !p.duplicate)
      .map(({ name, kind }) => ({ name, kind }));
    if (toImport.length === 0) {
      setError("No new tags to import — all entries are duplicates.");
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const result = await api.admin.bulkCreateTags(toImport);
      setImportResult({ created: result.created, skipped: result.skipped });
      await load();
      setCsvText("");
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e: any) {
      setError(e.message ?? "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const visible = filterKind === "ALL" ? tags : tags.filter((t) => t.kind === filterKind);

  return (
    <div className="mx-auto w-full space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Admin / Tags</p>
        <h2 className="mt-1 text-2xl font-bold text-white">Genre &amp; Tag Control</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Manage genres, moods, categories, and scenes used across tracks and playlists.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {importResult && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          Imported <strong>{importResult.created}</strong> tags.
          {importResult.skipped > 0 && <> Skipped <strong>{importResult.skipped}</strong> duplicates.</>}
          <button onClick={() => setImportResult(null)} className="ml-3 text-xs underline opacity-70 hover:opacity-100">Dismiss</button>
        </div>
      )}

      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <button
          type="button"
          onClick={() => { setShowImport((v) => !v); setPreview(null); setCsvText(""); setImportResult(null); }}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-white hover:bg-white/5 transition rounded-xl"
        >
          <span>Bulk import from CSV</span>
          <span className="text-[var(--color-text-muted)] text-xs">{showImport ? "▲ collapse" : "▼ expand"}</span>
        </button>

        {showImport && (
          <div className="border-t border-[var(--color-border)] px-4 pb-4 pt-3 space-y-3">
            <p className="text-xs text-[var(--color-text-muted)]">
              One tag per line: <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-amber-300/80">name</code> or <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-amber-300/80">name,KIND</code> — KIND is one of <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-amber-300/80">GENRE MOOD CATEGORY SCENE</code> (defaults to GENRE). Lines starting with # are ignored.
            </p>

            <div className="flex gap-2">
              <label className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-white transition">
                Upload .csv
                <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
              </label>
              <span className="text-xs text-[var(--color-text-muted)] self-center">or paste below</span>
            </div>

            <textarea
              value={csvText}
              onChange={(e) => handleCsvChange(e.target.value)}
              placeholder={"Hip-Hop,GENRE\nAmbient,MOOD\nElectronic\nJazz"}
              rows={5}
              className="w-full rounded-lg border border-[var(--color-border)] bg-black/30 px-3 py-2 font-mono text-xs text-white placeholder-zinc-600 focus:outline-none resize-y"
            />

            {preview && preview.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-white">
                  Preview — <span className="text-green-400">{preview.filter((p) => !p.duplicate).length} new</span>
                  {preview.filter((p) => p.duplicate).length > 0 && (
                    <>, <span className="text-zinc-500">{preview.filter((p) => p.duplicate).length} skipped (already exist)</span></>
                  )}
                </p>
                <div className="max-h-48 overflow-y-auto divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
                  {preview.map((item, i) => (
                    <div key={i} className={`flex items-center gap-2 px-3 py-1.5 text-xs ${item.duplicate ? "opacity-40" : ""}`}>
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${KIND_COLORS[item.kind as TagKind] ?? "text-zinc-400 bg-zinc-400/10"}`}>
                        {KIND_LABELS[item.kind as TagKind] ?? item.kind}
                      </span>
                      <span className="text-white">{item.name}</span>
                      {item.duplicate && <span className="ml-auto text-zinc-500">duplicate — will skip</span>}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setCsvText(""); setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="text-xs text-[var(--color-text-muted)] hover:text-white"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={importing || preview.filter((p) => !p.duplicate).length === 0}
                    className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-semibold text-black hover:bg-amber-400 disabled:opacity-40"
                  >
                    {importing ? "Importing…" : `Import ${preview.filter((p) => !p.duplicate).length} tags`}
                  </button>
                </div>
              </div>
            )}

            {preview && preview.length === 0 && csvText.trim() && (
              <p className="text-xs text-[var(--color-text-muted)]">No valid tags found in the input.</p>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New tag name…"
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-1 min-w-0 focus:ring-amber-400/50"
        />
        <select
          value={newKind}
          onChange={(e) => setNewKind(e.target.value as TagKind)}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white focus:outline-none"
        >
          {KIND_OPTIONS.map((k) => (
            <option key={k} value={k}>{KIND_LABELS[k]}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-40"
        >
          {creating ? "Adding…" : "Add"}
        </button>
      </form>

      <div className="flex gap-2 flex-wrap">
        {(["ALL", ...KIND_OPTIONS] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilterKind(k)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              filterKind === k
                ? "bg-amber-500 text-black"
                : "border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white"
            }`}
          >
            {k === "ALL" ? `All (${tags.length})` : `${KIND_LABELS[k]} (${tags.filter((t) => t.kind === k).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No tags found.</p>
      ) : (
        <div className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {visible.map((tag) => (
            <div key={tag.id} className="flex items-center gap-3 px-4 py-3">
              {editingId === tag.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded border border-[var(--color-border)] bg-black/30 px-2 py-1 text-sm text-white focus:outline-none"
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(tag.id); if (e.key === "Escape") setEditingId(null); }}
                    autoFocus
                  />
                  <select
                    value={editKind}
                    onChange={(e) => setEditKind(e.target.value as TagKind)}
                    className="rounded border border-[var(--color-border)] bg-black/30 px-2 py-1 text-sm text-white focus:outline-none"
                  >
                    {KIND_OPTIONS.map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
                  </select>
                  <button onClick={() => handleSaveEdit(tag.id)} className="text-xs font-semibold text-amber-400 hover:text-amber-300">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-[var(--color-text-muted)] hover:text-white">Cancel</button>
                </>
              ) : (
                <>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${KIND_COLORS[tag.kind as TagKind] ?? "text-zinc-400 bg-zinc-400/10"}`}>
                    {KIND_LABELS[tag.kind as TagKind] ?? tag.kind}
                  </span>
                  <span className="flex-1 text-sm text-white">{tag.name}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{tag.slug}</span>
                  <button onClick={() => startEdit(tag)} className="text-xs text-[var(--color-text-muted)] hover:text-white">Edit</button>
                  <button onClick={() => handleDelete(tag.id, tag.name)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
