import { MoreVertical } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export type MediaActionMenuItem = {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
};

type MediaActionMenuProps = {
  items: MediaActionMenuItem[];
  ariaLabel?: string;
  className?: string;
  align?: "left" | "right";
};

export function MediaActionMenu({
  items,
  ariaLabel = "More actions",
  className = "",
  align = "right",
}: MediaActionMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function runItem(item: MediaActionMenuItem) {
    if (item.disabled) return;
    setOpen(false);
    item.onClick();
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className={[
          "flex h-7 w-7 items-center justify-center rounded-full",
          "bg-black/50 text-white/80 backdrop-blur-sm transition",
          "hover:bg-black/70 hover:text-white",
          "opacity-0 group-hover/card:opacity-100 focus:opacity-100",
          open ? "opacity-100" : "",
        ].join(" ")}
      >
        <MoreVertical size={14} />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className={[
            "absolute top-full z-30 mt-1 min-w-[11rem] overflow-hidden rounded-lg",
            "border border-white/10 bg-[var(--color-surface-elevated)] py-1 shadow-xl",
            align === "right" ? "right-0" : "left-0",
          ].join(" ")}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={(e) => {
                e.stopPropagation();
                runItem(item);
              }}
              className={[
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-white transition",
                item.disabled ? "cursor-not-allowed opacity-40" : "hover:bg-white/10",
              ].join(" ")}
            >
              <span className="shrink-0 text-[var(--color-text-muted)]">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
