import type { ReactNode } from "react";

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-app-border bg-app-elevated">
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  );
}
