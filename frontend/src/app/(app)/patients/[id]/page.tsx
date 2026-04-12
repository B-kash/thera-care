"use client";

import { apiFetchJson } from "@/lib/api";
import type { Patient } from "@/types/patient";
import type { ExercisePlanList } from "@/types/exercise-plan";
import type { ProgressRecord } from "@/types/progress-record";
import type { TreatmentNote } from "@/types/treatment-note";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function dateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function PatientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { token, ready } = useAuth();
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [notes, setNotes] = useState("");
  const [savePending, setSavePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [treatmentNotes, setTreatmentNotes] = useState<TreatmentNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [exercisePlans, setExercisePlans] = useState<ExercisePlanList[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [progressRows, setProgressRows] = useState<ProgressRecord[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    try {
      const p = await apiFetchJson<Patient>(`/patients/${id}`, token);
      setPatient(p);
      setFirstName(p.firstName);
      setLastName(p.lastName);
      setEmail(p.email ?? "");
      setPhone(p.phone ?? "");
      setDateOfBirth(dateInputValue(p.dateOfBirth));
      setNotes(p.notes ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load patient");
      setPatient(null);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  const loadNotes = useCallback(async () => {
    if (!token || !id) return;
    setNotesLoading(true);
    try {
      const qs = new URLSearchParams({ patientId: id });
      const list = await apiFetchJson<TreatmentNote[]>(
        `/treatment-notes?${qs}`,
        token,
      );
      setTreatmentNotes(list);
    } catch {
      setTreatmentNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, [token, id]);

  const loadPlans = useCallback(async () => {
    if (!token || !id) return;
    setPlansLoading(true);
    try {
      const qs = new URLSearchParams({ patientId: id });
      const list = await apiFetchJson<ExercisePlanList[]>(
        `/exercise-plans?${qs}`,
        token,
      );
      setExercisePlans(list);
    } catch {
      setExercisePlans([]);
    } finally {
      setPlansLoading(false);
    }
  }, [token, id]);

  const loadProgress = useCallback(async () => {
    if (!token || !id) return;
    setProgressLoading(true);
    try {
      const qs = new URLSearchParams({ patientId: id });
      const list = await apiFetchJson<ProgressRecord[]>(
        `/progress?${qs}`,
        token,
      );
      setProgressRows(list);
    } catch {
      setProgressRows([]);
    } finally {
      setProgressLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    if (!ready || !token) return;
    void load();
  }, [ready, token, load]);

  useEffect(() => {
    if (!ready || !token || !id) return;
    void loadNotes();
  }, [ready, token, id, loadNotes]);

  useEffect(() => {
    if (!ready || !token || !id) return;
    void loadPlans();
  }, [ready, token, id, loadPlans]);

  useEffect(() => {
    if (!ready || !token || !id) return;
    void loadProgress();
  }, [ready, token, id, loadProgress]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavePending(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        firstName,
        lastName,
        email: email.trim() || null,
        phone: phone.trim() || null,
        dateOfBirth: dateOfBirth || null,
        notes: notes.trim() || null,
      };
      const updated = await apiFetchJson<Patient>(`/patients/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setPatient(updated);
      void loadNotes();
      void loadPlans();
      void loadProgress();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavePending(false);
    }
  }

  async function onDelete() {
    if (!token) return;
    if (!window.confirm("Delete this patient? This cannot be undone.")) return;
    setDeletePending(true);
    setError(null);
    try {
      await apiFetchJson(`/patients/${id}`, token, { method: "DELETE" });
      router.replace("/patients");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletePending(false);
    }
  }

  if (!ready || !token) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (!patient) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Link href="/patients" className="text-sm underline">
          ← Back to patients
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href="/patients"
          className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400"
        >
          ← Patients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {patient.lastName}, {patient.firstName}
        </h1>
      </div>

      <section className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">
            Treatment notes
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/treatment-notes?patientId=${encodeURIComponent(patient.id)}`}
              className="text-xs font-medium underline"
            >
              View all
            </Link>
            <Link
              href={`/treatment-notes/new?patientId=${encodeURIComponent(patient.id)}`}
              className="text-xs font-medium text-zinc-700 underline dark:text-zinc-300"
            >
              New note
            </Link>
          </div>
        </div>
        {notesLoading ? (
          <p className="mt-2 text-sm text-zinc-500">Loading notes…</p>
        ) : treatmentNotes.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            No treatment notes yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {treatmentNotes.slice(0, 5).map((n) => (
              <li key={n.id}>
                <Link
                  href={`/treatment-notes/${n.id}`}
                  className="text-sm text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                >
                  {new Date(n.createdAt).toLocaleString()}
                </Link>
                <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
                  {n.subjective.trim().slice(0, 120)}
                  {n.subjective.length > 120 ? "…" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">
            Exercise plans
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/exercise-plans?patientId=${encodeURIComponent(patient.id)}`}
              className="text-xs font-medium underline"
            >
              View all
            </Link>
            <Link
              href={`/exercise-plans/new?patientId=${encodeURIComponent(patient.id)}`}
              className="text-xs font-medium text-zinc-700 underline dark:text-zinc-300"
            >
              New plan
            </Link>
          </div>
        </div>
        {plansLoading ? (
          <p className="mt-2 text-sm text-zinc-500">Loading plans…</p>
        ) : exercisePlans.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            No exercise plans yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {exercisePlans.slice(0, 5).map((plan) => (
              <li key={plan.id}>
                <Link
                  href={`/exercise-plans/${plan.id}`}
                  className="text-sm text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                >
                  {plan.title}
                </Link>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {plan._count.items} exercise
                  {plan._count.items === 1 ? "" : "s"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">Progress</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/progress?patientId=${encodeURIComponent(patient.id)}`}
              className="text-xs font-medium underline"
            >
              View all
            </Link>
            <Link
              href={`/progress/new?patientId=${encodeURIComponent(patient.id)}`}
              className="text-xs font-medium text-zinc-700 underline dark:text-zinc-300"
            >
              New entry
            </Link>
          </div>
        </div>
        {progressLoading ? (
          <p className="mt-2 text-sm text-zinc-500">Loading progress…</p>
        ) : progressRows.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            No progress entries yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {progressRows.slice(0, 5).map((r) => (
              <li key={r.id}>
                <Link
                  href={`/progress/${r.id}`}
                  className="text-sm text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                >
                  {new Date(r.recordedOn).toLocaleDateString()} — pain{" "}
                  {r.painLevel}
                  {r.mobilityScore != null
                    ? ` · mobility ${r.mobilityScore}`
                    : ""}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form className="space-y-4" onSubmit={onSave}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium">First name *</label>
            <input
              required
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium">Last name *</label>
            <input
              required
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium">Email</label>
          <input
            type="email"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Phone</label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Date of birth</label>
          <input
            type="date"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Notes</label>
          <textarea
            rows={4}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={savePending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {savePending ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            disabled={deletePending}
            onClick={() => void onDelete()}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            {deletePending ? "Deleting…" : "Delete patient"}
          </button>
        </div>
      </form>
    </div>
  );
}
