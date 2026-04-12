"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_PALETTE = "thera-palette";
const STORAGE_MODE = "thera-color-mode";

export type PaletteId = "zinc" | "ocean" | "rose" | "forest";
export type ColorMode = "light" | "dark" | "system";

type ThemeContextValue = {
  palette: PaletteId;
  mode: ColorMode;
  setPalette: (p: PaletteId) => void;
  setMode: (m: ColorMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPalette(): PaletteId {
  if (typeof window === "undefined") return "zinc";
  const v = window.localStorage.getItem(STORAGE_PALETTE);
  if (v === "ocean" || v === "rose" || v === "forest" || v === "zinc") return v;
  return "zinc";
}

function readStoredMode(): ColorMode {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(STORAGE_MODE);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

function applyDom(palette: PaletteId, darkActive: boolean) {
  const root = document.documentElement;
  root.dataset.palette = palette;
  root.classList.toggle("dark", darkActive);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = useState<PaletteId>("zinc");
  const [mode, setModeState] = useState<ColorMode>("system");
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    /* After mount: sync from localStorage (defaults on server for SSR). */
    /* eslint-disable react-hooks/set-state-in-effect -- intentional client rehydration */
    setPaletteState(readStoredPalette());
    setModeState(readStoredMode());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemDark(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const darkActive = mode === "dark" || (mode === "system" && systemDark);

  useEffect(() => {
    applyDom(palette, darkActive);
  }, [palette, darkActive]);

  const setPalette = useCallback((p: PaletteId) => {
    setPaletteState(p);
    window.localStorage.setItem(STORAGE_PALETTE, p);
  }, []);

  const setMode = useCallback((m: ColorMode) => {
    setModeState(m);
    window.localStorage.setItem(STORAGE_MODE, m);
  }, []);

  const value = useMemo(
    () => ({ palette, mode, setPalette, setMode }),
    [palette, mode, setPalette, setMode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
