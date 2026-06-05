import { Menu } from "lucide-react";

interface TopBarMenuButtonProps {
  onClick: () => void;
}

export function TopBarMenuButton({ onClick }: TopBarMenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-lg p-1.5 text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)] hover:text-white sm:p-2 lg:hidden"
      aria-label="Open menu"
    >
      <Menu size={20} />
    </button>
  );
}
