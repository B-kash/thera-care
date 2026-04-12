import { Suspense } from "react";
import { NewTreatmentNoteClient } from "./new-treatment-note-client";

export default function NewTreatmentNotePage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      }
    >
      <NewTreatmentNoteClient />
    </Suspense>
  );
}
