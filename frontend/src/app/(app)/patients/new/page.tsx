import { Suspense } from "react";
import { NewPatientForm } from "./new-patient-form";

export default function NewPatientPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <NewPatientForm />
    </Suspense>
  );
}
