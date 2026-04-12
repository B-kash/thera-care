"use client";

import { apiFetchJson } from "@/lib/api";
import type { Appointment } from "@/types/appointment";
import type { Patient } from "@/types/patient";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AppointmentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, ready } = useAuth();
  const router = useRouter();

  const [apt, setApt] = useState<Appointment | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [status, setStatus] = useState("SCHEDULED");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const load = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    setError(null);
    try {
      const a = await apiFetchJson<Appointment>(`/appointments/${id}`);
      setApt(a);
      setPatientId(a.patientId);
      setStartsAt(toLocalInput(a.startsAt));
      setEndsAt(toLocalInput(a.endsAt));
      setStatus(a.status);
      setNotes(a.notes ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setApt(null);
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    if (!user) return;
    void apiFetchJson<Patient[]>("/patients?take=200")
      .then(setPatients)
      .catch(() => setPatients([]));
  }, [user]);

  useEffect(() => {
    if (!ready || !user) return;
    void load();
  }, [ready, user, load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavePending(true);
    setError(null);
    try {
      const updated = await apiFetchJson<Appointment>(`/appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          patientId,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          status,
          notes: notes.trim() || null,
        }),
      });
      setApt(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavePending(false);
    }
  }

  async function onDelete() {
    if (!user) return;
    if (!window.confirm("Delete this appointment?")) return;
    setDeletePending(true);
    setError(null);
    try {
      await apiFetchJson(`/appointments/${id}`, { method: "DELETE" });
      router.replace("/appointments");
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
  if (!apt) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/appointments" className="text-sm underline">
          ← Back
        </Link>
      </div>
    );
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
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Appointment</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Patient:{" "}
          <Link
            href={`/patients/${apt.patient.id}`}
            className="font-medium underline"
          >
            {apt.patient.lastName}, {apt.patient.firstName}
          </Link>
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSave}>
        <div>
          <label className="block text-xs font-medium">Patient *</label>
          <select
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.lastName}, {p.firstName}
              </option>
            ))}
          </select>
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

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={savePending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {savePending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={deletePending}
            onClick={() => void onDelete()}
            className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:text-red-400"
          >
            {deletePending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </form>
    </div>
  );
}
