import { useState, useEffect, useRef } from "react";

type Props = {
  title: string;
  saving: boolean;
  onSave: (title: string) => void;
};

export function AdminInlineTitleEditor({ title, saving, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(title); }, [title]);

  function startEdit() {
    setValue(title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    const trimmed = value.trim();
    if (trimmed && trimmed !== title) onSave(trimmed);
    setEditing(false);
  }

  function cancel() {
    setValue(title);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") cancel();
        }}
        disabled={saving}
        className="w-full rounded border border-amber-400/50 bg-black/40 px-1.5 py-0.5 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-amber-400/70"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className="group/title block w-full truncate rounded px-1 py-0.5 text-left text-xs font-medium text-white transition hover:bg-white/[0.06]"
      title="Click to edit title"
    >
      {title}
      <span className="ml-1 opacity-0 text-zinc-600 group-hover/title:opacity-100">✎</span>
    </button>
  );
}
