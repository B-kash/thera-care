"use client";

import { apiFetchJson } from "@/lib/api";
import type { Appointment } from "@/types/appointment";
import type { Patient } from "@/types/patient";
import { MutateOnly } from "@/components/mutate-only";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

const NEW_PATIENT_NEXT = "/appointments/new";

export function NewAppointmentForm() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPatientId = searchParams.get("patientId");

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [status, setStatus] = useState<string>("SCHEDULED");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const loadPatients = useCallback(async () => {
    if (!user) return;
    setLoadError(null);
    try {
      const list = await apiFetchJson<Patient[]>("/patients?take=200");
      setPatients(list);
    } catch (e) {
      setPatients([]);
      setLoadError(
        e instanceof Error ? e.message : "Could not load patient list",
      );
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadPatients();
  }, [user, loadPatients]);

  useEffect(() => {
    if (!urlPatientId || patients.length === 0) return;
    if (patients.some((p) => p.id === urlPatientId)) {
      setPatientId(urlPatientId);
    }
  }, [urlPatientId, patients]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setPending(true);
    try {
      const body: Record<string, unknown> = {
        patientId,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        status,
      };
      if (notes.trim()) body.notes = notes.trim();

      const created = await apiFetchJson<Appointment>("/appointments", {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.replace(`/appointments/${created.id}`);
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
          href="/appointments"
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          ← Appointments
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          New appointment
        </h1>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <label className="block text-xs font-medium">Patient *</label>
            <MutateOnly>
              <Link
                href={`/patients/new?next=${encodeURIComponent(NEW_PATIENT_NEXT)}`}
                className="text-xs font-medium text-zinc-700 underline dark:text-zinc-300"
              >
                New patient
              </Link>
            </MutateOnly>
          </div>
          <select
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
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
          {loadError && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
              {loadError}
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium">Starts *</label>
          <input
            type="datetime-local"
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Ends *</label>
          <input
            type="datetime-local"
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Status</label>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium">Notes</label>
          <textarea
            rows={3}
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

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "Saving…" : "Create"}
          </button>
          <Link
            href="/appointments"
            className="inline-flex items-center rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
