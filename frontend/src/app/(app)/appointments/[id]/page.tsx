"use client";

import { DateTimeInput } from "@/components/date-inputs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiFetchJson } from "@/lib/api";
import { formFieldClassName } from "@/lib/form-classes";
import type { Appointment } from "@/types/appointment";
import type { Patient } from "@/types/patient";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  DEFAULT_APPOINTMENT_MINUTES,
  addMinutesToLocalInput,
  appointmentDurationLabel,
  formatLocalDateTimeInput,
  isValidAppointmentRange,
} from "@/lib/appointment-datetime";
import { appointmentsIndexHref } from "@/lib/appointments-view-storage";
import { useCallback, useEffect, useState } from "react";

const STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentsListHref, setAppointmentsListHref] =
    useState("/appointments");

  useEffect(() => {
    setAppointmentsListHref(appointmentsIndexHref());
  }, []);

  const load = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    setError(null);
    try {
      const a = await apiFetchJson<Appointment>(`/appointments/${id}`);
      setApt(a);
      setPatientId(a.patientId);
      setStartsAt(formatLocalDateTimeInput(new Date(a.startsAt)));
      setEndsAt(formatLocalDateTimeInput(new Date(a.endsAt)));
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

  function onStartsChange(next: string) {
    setStartsAt(next);
    setEndsAt((prevEnd) => {
      if (!next.trim()) return prevEnd;
      const s = new Date(next);
      const e = new Date(prevEnd);
      if (Number.isNaN(s.getTime())) return prevEnd;
      if (
        !prevEnd.trim() ||
        Number.isNaN(e.getTime()) ||
        e.getTime() <= s.getTime()
      ) {
        return addMinutesToLocalInput(next, DEFAULT_APPOINTMENT_MINUTES);
      }
      return prevEnd;
    });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    if (!isValidAppointmentRange(startsAt, endsAt)) {
      setError("End must be after start.");
      return;
    }
    setSavePending(true);
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

  async function performDelete() {
    if (!user) throw new Error("Not signed in");
    setError(null);
    try {
      await apiFetchJson(`/appointments/${id}`, { method: "DELETE" });
      router.replace("/appointments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      throw err;
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
        <Link href={appointmentsListHref} className="text-sm underline">
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href={appointmentsListHref}
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
            className={`mt-1 ${formFieldClassName}`}
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
          <label htmlFor="apt-edit-starts" className="block text-xs font-medium">
            Starts *
          </label>
          <DateTimeInput
            id="apt-edit-starts"
            label="Appointment start"
            required
            value={startsAt}
            max={endsAt.trim() ? endsAt : undefined}
            onChange={(e) => onStartsChange(e.target.value)}
          />
          <p className="mt-1 text-xs text-foreground/55">
            If start moves past end, end jumps to start +{" "}
            {DEFAULT_APPOINTMENT_MINUTES} min.
          </p>
        </div>
        <div>
          <label htmlFor="apt-edit-ends" className="block text-xs font-medium">
            Ends *
          </label>
          <DateTimeInput
            id="apt-edit-ends"
            label="Appointment end"
            required
            value={endsAt}
            min={startsAt.trim() ? startsAt : undefined}
            onChange={(e) => setEndsAt(e.target.value)}
          />
          {appointmentDurationLabel(startsAt, endsAt) ? (
            <p className="mt-1 text-xs text-foreground/60">
              Duration: {appointmentDurationLabel(startsAt, endsAt)}
            </p>
          ) : startsAt && endsAt ? (
            <p className="mt-1 text-xs text-app-danger" role="status">
              End must be after start.
            </p>
          ) : null}
        </div>
        <div>
          <label className="block text-xs font-medium">Status</label>
          <select
            className={`mt-1 ${formFieldClassName}`}
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

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={
              savePending || !isValidAppointmentRange(startsAt, endsAt)
            }
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {savePending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setDeleteDialogOpen(true)}
            className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:text-red-400"
          >
            Delete
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete this appointment?"
        description="Removes this visit from the schedule. This cannot be undone."
        confirmLabel="Delete appointment"
        onConfirm={performDelete}
      />
    </div>
  );
}
