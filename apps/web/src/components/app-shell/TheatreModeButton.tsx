import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { Captions, Loader2, Monitor, Sparkles } from "lucide-react";

import { useTheatreMode } from "@/components/app-shell/useTheatreMode";
import {
  DISPLAY_SETTINGS_INTERACTION_MS,
  PLAYBACK_FOCUS_INTERACTIVE_ATTR,
  armDisplaySettingsBodyRevealSuppression,
} from "@/lib/playbackFocus/interactiveTarget";
import { useSubtitleDisplay } from "@/lib/subtitleDisplay";
import {
  listAtmosphereFxPresets,
  setAtmosphereFxMode,
  setAtmosphereFxPresetId,
  useAtmosphereFxSettings,
  type AtmosphereFxGlobalMode,
} from "@/theatre/atmosphere";

const MENU_WIDTH_PX = 220;

const ATMOSPHERE_MODES: { value: AtmosphereFxGlobalMode; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "subtle", label: "Subtle" },
  { value: "normal", label: "Normal" },
  { value: "strong", label: "Strong" },
];

export function TheatreModeButton() {
  const { canEnterTheatre, theatreFxEnabled, theatreLoading, toggleTheatreMode } = useTheatreMode();
  const { subtitlesEnabled, toggleSubtitlesEnabled } = useSubtitleDisplay();
  const { settings: atmosphereSettings } = useAtmosphereFxSettings();
  const atmospherePresets = listAtmosphereFxPresets();
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const openedAtRef = useRef(0);

  function openMenu() {
    openedAtRef.current = performance.now();
    armDisplaySettingsBodyRevealSuppression();
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
  }

  function handleSubtitlesClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    armDisplaySettingsBodyRevealSuppression();
    toggleSubtitlesEnabled();
    closeMenu();
  }

  function handleTheatreClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    armDisplaySettingsBodyRevealSuppression();
    void toggleTheatreMode();
    closeMenu();
  }

  function updateMenuPosition() {
    const button = buttonRef.current;
    if (!button) {
      setMenuStyle(null);
      return;
    }

    const rect = button.getBoundingClientRect();
    setMenuStyle({
      position: "fixed",
      top: rect.bottom,
      right: window.innerWidth - rect.right,
      width: MENU_WIDTH_PX,
    });
  }

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (performance.now() - openedAtRef.current < DISPLAY_SETTINGS_INTERACTION_MS) return;

      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      closeMenu();
    }

    if (open) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [open]);

  const atmosphereOn = atmosphereSettings.mode !== "off";

  const menu = open && menuStyle ? (
    <div
      ref={menuRef}
      className="z-[60] w-[220px] pt-2"
      style={menuStyle}
      {...{ [PLAYBACK_FOCUS_INTERACTIVE_ATTR]: true }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-1 shadow-xl">
        <button
          type="button"
          onClick={handleSubtitlesClick}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white hover:bg-white/5"
        >
          <Captions
            size={16}
            className={subtitlesEnabled ? "text-[var(--color-brand)]" : "text-[var(--color-text-muted)]"}
          />
          {subtitlesEnabled ? "Hide subtitles" : "Show subtitles"}
        </button>
        <button
          type="button"
          disabled={theatreLoading || (!theatreFxEnabled && !canEnterTheatre)}
          onClick={handleTheatreClick}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          title={
            theatreLoading
              ? "Loading theatre..."
              : !theatreFxEnabled && !canEnterTheatre
                ? "Play music to enable theatre visualizations"
                : ""
          }
        >
          {theatreLoading ? (
            <Loader2 size={16} className="animate-spin text-[var(--color-brand)]" />
          ) : (
            <Monitor
              size={16}
              className={theatreFxEnabled ? "text-[var(--color-brand)]" : "text-[var(--color-text-muted)]"}
            />
          )}
          {theatreFxEnabled ? "Hide theatre" : "Show theatre"}
        </button>

        <div className="my-1 border-t border-white/10" />

        <div className="px-4 py-2">
          <div className="mb-1.5 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <Sparkles size={14} className={atmosphereOn ? "text-[var(--color-brand)]" : undefined} />
            Atmosphere FX
          </div>
          <select
            className="mb-1.5 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white"
            value={atmosphereSettings.mode}
            onChange={(event) => {
              armDisplaySettingsBodyRevealSuppression();
              setAtmosphereFxMode(event.target.value as AtmosphereFxGlobalMode);
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {ATMOSPHERE_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white disabled:opacity-40"
            disabled={atmosphereSettings.mode === "off"}
            value={atmosphereSettings.presetId}
            onChange={(event) => {
              armDisplaySettingsBodyRevealSuppression();
              setAtmosphereFxPresetId(event.target.value);
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {atmospherePresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div
      className="relative"
      ref={containerRef}
      data-playback-focus-interactive
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (open) closeMenu();
          else openMenu();
        }}
        className={`inline-flex shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1.5 transition sm:p-2 ${
          open || theatreFxEnabled || subtitlesEnabled || atmosphereOn
            ? "text-[var(--color-brand)]"
            : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-white"
        }`}
        title="Display settings"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Display settings"
      >
        <Monitor size={20} />
      </button>

      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
