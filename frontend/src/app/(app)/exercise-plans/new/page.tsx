import { Suspense } from "react";
import { NewExercisePlanClient } from "./new-exercise-plan-client";

export default function NewExercisePlanPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      }
    >
      <NewExercisePlanClient />
    </Suspense>
  );
}
