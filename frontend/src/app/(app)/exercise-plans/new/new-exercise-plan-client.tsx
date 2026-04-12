"use client";

import { apiFetchJson } from "@/lib/api";
import { formFieldClassName } from "@/lib/form-classes";
import type { ExercisePlanDetail } from "@/types/exercise-plan";
import type { Patient } from "@/types/patient";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function NewExercisePlanClient() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPatientId = searchParams.get("patientId") ?? "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState(initialPatientId);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!user) return;
    void apiFetchJson<Patient[]>("/patients?take=200")
      .then(setPatients)
      .catch(() => setPatients([]));
  }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !patientId) return;
    setError(null);
    setPending(true);
    try {
      const body: Record<string, unknown> = {
        patientId,
        title: title.trim(),
      };
      if (notes.trim()) body.notes = notes.trim();

      const created = await apiFetchJson<ExercisePlanDetail>(
        "/exercise-plans", {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
      router.replace(`/exercise-plans/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create");
    } finally {
      setPending(false);
    }
  }

  if (!ready || !user) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href={
            patientId
              ? `/exercise-plans?patientId=${encodeURIComponent(patientId)}`
              : "/exercise-plans"
          }
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          ← Exercise plans
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          New exercise plan
        </h1>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-xs font-medium">Patient *</label>
          <select
            required
            className={`mt-1 ${formFieldClassName}`}
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
          >
            <option value="">Select patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.lastName}, {p.firstName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium">Title *</label>
          <input
            required
            className={`mt-1 ${formFieldClassName}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Notes</label>
          <textarea
            rows={3}
            className={`mt-1 ${formFieldClassName}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !patientId}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Creating…" : "Create plan"}
        </button>
      </form>
    </div>
  );
}
