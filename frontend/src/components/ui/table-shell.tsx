import type { ReactNode } from "react";

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 touch-pan-x overflow-x-auto overscroll-x-contain border-y border-app-border bg-app-elevated sm:mx-0 sm:rounded-lg sm:border">
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  );
}
