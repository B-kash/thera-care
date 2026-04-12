"use client";

import { apiFetchJson } from "@/lib/api";
import { formFieldClassName } from "@/lib/form-classes";
import type { Appointment } from "@/types/appointment";
import type { Patient } from "@/types/patient";
import type { TreatmentNote } from "@/types/treatment-note";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function NewTreatmentNoteClient() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPatientId = searchParams.get("patientId") ?? "";
  const initialAppointmentId = searchParams.get("appointmentId") ?? "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState(initialPatientId);
  const [appointmentId, setAppointmentId] = useState(initialAppointmentId);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!user) return;
    void apiFetchJson<Patient[]>("/patients?take=200")
      .then(setPatients)
      .catch(() => setPatients([]));
  }, [user]);

  useEffect(() => {
    if (!user || !patientId) {
      setAppointments([]);
      return;
    }
    const qs = new URLSearchParams({
      patientId,
      take: "100",
    });
    void apiFetchJson<Appointment[]>(`/appointments?${qs}`)
      .then(setAppointments)
      .catch(() => setAppointments([]));
  }, [user, patientId]);

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !patientId) return;
    setError(null);
    setPending(true);
    try {
      const body: Record<string, unknown> = {
        patientId,
        subjective: subjective.trim(),
        objective: objective.trim(),
        assessment: assessment.trim(),
        plan: plan.trim(),
      };
      if (appointmentId) body.appointmentId = appointmentId;

      const created = await apiFetchJson<TreatmentNote>(
        "/treatment-notes", {
          method: "POST",
          body: JSON.stringify(body),
        },
      );
      router.replace(`/treatment-notes/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setPending(false);
    }
  }

  if (!ready || !user) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={
            patientId
              ? `/treatment-notes?patientId=${encodeURIComponent(patientId)}`
              : "/treatment-notes"
          }
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          ← Treatment notes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          New treatment note
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          SOAP format: subjective, objective, assessment, plan.
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-xs font-medium">Patient *</label>
          <select
            required
            className={`mt-1 ${formFieldClassName}`}
            value={patientId}
            onChange={(e) => {
              setPatientId(e.target.value);
              setAppointmentId("");
            }}
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
          <label className="block text-xs font-medium">
            Appointment (optional)
          </label>
          <select
            className={`mt-1 ${formFieldClassName}`}
            value={appointmentId}
            onChange={(e) => setAppointmentId(e.target.value)}
            disabled={!patientId}
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
            className={`mt-1 ${formFieldClassName}`}
            value={subjective}
            onChange={(e) => setSubjective(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Objective *</label>
          <textarea
            required
            rows={4}
            className={`mt-1 ${formFieldClassName}`}
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Assessment *</label>
          <textarea
            required
            rows={4}
            className={`mt-1 ${formFieldClassName}`}
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Plan *</label>
          <textarea
            required
            rows={4}
            className={`mt-1 ${formFieldClassName}`}
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
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
          {pending ? "Saving…" : "Save note"}
        </button>
      </form>
    </div>
  );
}
