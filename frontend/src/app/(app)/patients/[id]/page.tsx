"use client";

import { apiFetchJson } from "@/lib/api";
import type { Patient } from "@/types/patient";
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

  useEffect(() => {
    if (!ready || !token) return;
    void load();
  }, [ready, token, load]);

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
