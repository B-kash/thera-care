/** Shared control surface — always set bg + text (browser defaults ignore theme). */
export const formFieldClassName =
  "w-full rounded-md border border-app-border bg-app-elevated px-3 py-2 text-sm text-foreground shadow-sm outline-none placeholder:text-foreground/45 " +
  "focus:border-app-border focus:ring-2 focus:ring-app-accent/35 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export const formFieldCompactClassName =
  "rounded border border-app-border bg-app-elevated px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-foreground/45 " +
  "focus:border-app-border focus:ring-2 focus:ring-app-accent/35 " +
  "disabled:cursor-not-allowed disabled:opacity-60";
