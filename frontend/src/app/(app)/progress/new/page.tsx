import { Suspense } from "react";
import { NewProgressClient } from "./new-progress-client";

export default function NewProgressPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      }
    >
      <NewProgressClient />
    </Suspense>
  );
}
