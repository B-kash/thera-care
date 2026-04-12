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
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <label className="sr-only" htmlFor="theme-palette">
        Color theme
      </label>
      <select
        id="theme-palette"
        value={palette}
        onChange={(e) => setPalette(e.target.value as PaletteId)}
        className="h-8 max-w-[8rem] rounded-md border border-app-border bg-app-elevated px-2 text-foreground"
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
        className="h-8 max-w-[8rem] rounded-md border border-app-border bg-app-elevated px-2 text-foreground"
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
