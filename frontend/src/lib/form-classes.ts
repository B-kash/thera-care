/** Shared control surface — always set bg + text (browser defaults ignore theme). */
export const formFieldClassName =
  "min-h-11 w-full touch-manipulation rounded-md border border-app-border bg-app-elevated px-3 py-2 text-base text-foreground shadow-sm outline-none placeholder:text-foreground/45 sm:text-sm " +
  "focus:border-app-border focus:ring-2 focus:ring-app-accent/35 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export const formFieldCompactClassName =
  "min-h-10 touch-manipulation rounded border border-app-border bg-app-elevated px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-foreground/45 " +
  "focus:border-app-border focus:ring-2 focus:ring-app-accent/35 " +
  "disabled:cursor-not-allowed disabled:opacity-60";
