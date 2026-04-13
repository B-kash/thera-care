"use client";

import type { ColorMode, PaletteId } from "@/providers/theme-provider";
import { useTheme } from "@/providers/theme-provider";

const PALETTES: { id: PaletteId; label: string }[] = [
  { id: "zinc", label: "Zinc" },
  { id: "ocean", label: "Ocean" },
  { id: "rose", label: "Rose" },
  { id: "forest", label: "Forest" },
];

const MODES: { id: ColorMode; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

export function ThemeSwitcher() {
  const { palette, mode, setPalette, setMode } = useTheme();

  return (
    <div className="flex max-w-full flex-wrap items-center justify-end gap-2 text-xs">
      <label className="sr-only" htmlFor="theme-palette">
        Color theme
      </label>
      <select
        id="theme-palette"
        value={palette}
        onChange={(e) => setPalette(e.target.value as PaletteId)}
        className="min-h-11 max-w-[9rem] touch-manipulation rounded-md border border-app-border bg-app-elevated px-2 text-foreground sm:min-h-8 sm:max-w-[8rem]"
      >
        {PALETTES.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="theme-mode">
        Light or dark
      </label>
      <select
        id="theme-mode"
        value={mode}
        onChange={(e) => setMode(e.target.value as ColorMode)}
        className="min-h-11 max-w-[9rem] touch-manipulation rounded-md border border-app-border bg-app-elevated px-2 text-foreground sm:min-h-8 sm:max-w-[8rem]"
      >
        {MODES.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}
