import { Suspense } from "react";
import { AppointmentsClient } from "./appointments-client";

export default function AppointmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded-md bg-app-muted" />
          <div className="h-32 animate-pulse rounded-lg bg-app-muted" />
        </div>
      }
    >
      <AppointmentsClient />
    </Suspense>
  );
}
