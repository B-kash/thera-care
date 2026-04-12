"use client";

import { apiFetchJson } from "@/lib/api";
import type { Appointment } from "@/types/appointment";
import type { TreatmentNote } from "@/types/treatment-note";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function TreatmentNoteDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, ready } = useAuth();
  const router = useRouter();

  const [note, setNote] = useState<TreatmentNote | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentId, setAppointmentId] = useState("");
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(true);
  const [savePending, setSavePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    setError(null);
    try {
      const n = await apiFetchJson<TreatmentNote>(`/treatment-notes/${id}`);
      setNote(n);
      setSubjective(n.subjective);
      setObjective(n.objective);
      setAssessment(n.assessment);
      setPlan(n.plan);
      setAppointmentId(n.appointmentId ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setNote(null);
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    if (!ready || !user) return;
    void load();
  }, [ready, user, load]);

  useEffect(() => {
    if (!user || !note?.patientId) {
      setAppointments([]);
      return;
    }
    const qs = new URLSearchParams({
      patientId: note.patientId,
      take: "100",
    });
    void apiFetchJson<Appointment[]>(`/appointments?${qs}`)
      .then(setAppointments)
      .catch(() => setAppointments([]));
  }, [user, note?.patientId]);

  const appointmentChoices = useMemo(
    () =>
      appointments
        .slice()
        .sort(
          (a, b) =>
            new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
        ),
    [appointments],
  );

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !note) return;
    setSavePending(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        subjective: subjective.trim(),
        objective: objective.trim(),
        assessment: assessment.trim(),
        plan: plan.trim(),
      };
      body.appointmentId = appointmentId || null;

      const updated = await apiFetchJson<TreatmentNote>(
        `/treatment-notes/${id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        },
      );
      setNote(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavePending(false);
    }
  }

  async function onDelete() {
    if (!user || !note) return;
    if (!window.confirm("Delete this treatment note?")) return;
    const patientId = note.patientId;
    setDeletePending(true);
    setError(null);
    try {
      await apiFetchJson(`/treatment-notes/${id}`, { method: "DELETE" });
      router.replace(
        patientId
          ? `/treatment-notes?patientId=${encodeURIComponent(patientId)}`
          : "/treatment-notes",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletePending(false);
    }
  }

  if (!ready || !user) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (!note) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Link href="/treatment-notes" className="text-sm underline">
          ← Treatment notes
        </Link>
      </div>
    );
  }

  const listHref = `/treatment-notes?patientId=${encodeURIComponent(note.patientId)}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={listHref}
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          ← Notes for patient
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Treatment note
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Patient:{" "}
          <Link
            href={`/patients/${note.patient.id}`}
            className="font-medium underline"
          >
            {note.patient.lastName}, {note.patient.firstName}
          </Link>
          {" · "}
          {new Date(note.createdAt).toLocaleString()}
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSave}>
        <div>
          <label className="block text-xs font-medium">
            Appointment (optional)
          </label>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={appointmentId}
            onChange={(e) => setAppointmentId(e.target.value)}
          >
            <option value="">None</option>
            {appointmentChoices.map((a) => (
              <option key={a.id} value={a.id}>
                {new Date(a.startsAt).toLocaleString()} —{" "}
                {new Date(a.endsAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium">Subjective *</label>
          <textarea
            required
            rows={4}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={subjective}
            onChange={(e) => setSubjective(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Objective *</label>
          <textarea
            required
            rows={4}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Assessment *</label>
          <textarea
            required
            rows={4}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Plan *</label>
          <textarea
            required
            rows={4}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
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
            {deletePending ? "Deleting…" : "Delete note"}
          </button>
        </div>
      </form>
    </div>
  );
}
