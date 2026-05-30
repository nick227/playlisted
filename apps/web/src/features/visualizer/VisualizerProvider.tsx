import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  readVisualizerSettings,
  writeVisualizerSettings,
} from "./visualizerStore";
import type {
  VisualizerDisabledReason,
  VisualizerSettings,
} from "./visualizerTypes";

type VisualizerContextValue = {
  settings: VisualizerSettings;
  setEnabled: (enabled: boolean) => void;
  setPaletteId: (paletteId: string) => void;
  updateSettings: (next: Partial<VisualizerSettings>) => void;
  disableForReason: (reason: VisualizerDisabledReason) => void;
};

const VisualizerContext = createContext<VisualizerContextValue | null>(null);

function getPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function warnVisualizerFailure(error: unknown): void {
  if (!import.meta.env.DEV) return;
  console.warn("[visualizer] disabled after error", error);
}

export function VisualizerProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<VisualizerSettings>(() =>
    readVisualizerSettings(
      typeof window === "undefined" ? undefined : window.localStorage,
      getPrefersReducedMotion(),
    ),
  );

  useEffect(() => {
    writeVisualizerSettings(
      typeof window === "undefined" ? undefined : window.localStorage,
      settings,
    );
  }, [settings]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.visualizer = settings.enabled ? "on" : "off";
    return () => {
      delete document.documentElement.dataset.visualizer;
    };
  }, [settings.enabled]);

  const updateSettings = useCallback((next: Partial<VisualizerSettings>) => {
    setSettings((current) => ({
      ...current,
      ...next,
      disabledReason: next.enabled === true ? undefined : next.disabledReason ?? current.disabledReason,
    }));
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setSettings((current) => ({
      ...current,
      enabled,
      disabledReason: enabled ? undefined : "user",
    }));
  }, []);

  const setPaletteId = useCallback((paletteId: string) => {
    setSettings((current) => ({ ...current, paletteId }));
  }, []);

  const disableForReason = useCallback((reason: VisualizerDisabledReason) => {
    setSettings((current) => ({
      ...current,
      enabled: false,
      disabledReason: reason,
    }));
  }, []);

  const value = useMemo<VisualizerContextValue>(
    () => ({
      settings,
      setEnabled,
      setPaletteId,
      updateSettings,
      disableForReason,
    }),
    [disableForReason, setEnabled, setPaletteId, settings, updateSettings],
  );

  return <VisualizerContext.Provider value={value}>{children}</VisualizerContext.Provider>;
}

export function useVisualizer(): VisualizerContextValue {
  const ctx = useContext(VisualizerContext);
  if (!ctx) throw new Error("useVisualizer must be used within VisualizerProvider");
  return ctx;
}

export function handleVisualizerError(
  error: unknown,
  disableForReason: (reason: VisualizerDisabledReason) => void,
): void {
  warnVisualizerFailure(error);
  disableForReason("error");
}
