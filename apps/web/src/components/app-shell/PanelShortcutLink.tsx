import { Link } from "react-router-dom";

import { ADMIN_PATH, STUDIO_PATH } from "@/lib/routes";

interface PanelShortcutLinkProps {
  panelPath: string | null;
}

export function PanelShortcutLink({ panelPath }: PanelShortcutLinkProps) {
  if (panelPath === STUDIO_PATH) {
    return (
      <Link
        to={STUDIO_PATH}
        className="hidden rounded-full border border-[var(--color-brand)]/40 bg-[var(--color-brand)]/10 px-4 py-2 text-sm font-semibold text-white sm:inline"
      >
        Studio
      </Link>
    );
  }

  if (panelPath === ADMIN_PATH) {
    return (
      <Link
        to={ADMIN_PATH}
        className="hidden rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 sm:inline"
      >
        Admin
      </Link>
    );
  }

  return null;
}
