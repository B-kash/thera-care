import { Suspense } from "react";
import { NewAppointmentForm } from "./new-appointment-form";

export default function NewAppointmentPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <NewAppointmentForm />
    </Suspense>
  );
}
