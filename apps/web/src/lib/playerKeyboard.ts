/** True when Space should not toggle the site-wide player (typing, native controls, card play targets). */
export function isPlayerShortcutSuppressed(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.closest("input, textarea, select, [contenteditable='true']")) return true;
  if (target.closest('button, a[href], [role="button"]')) return true;
  return false;
}
