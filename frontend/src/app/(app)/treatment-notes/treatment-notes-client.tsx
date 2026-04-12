"use client";

import { apiFetchJson } from "@/lib/api";
import { formFieldClassName } from "@/lib/form-classes";
import type { Patient } from "@/types/patient";
import type { TreatmentNote } from "@/types/treatment-note";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function TreatmentNotesClient() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get("patientId") ?? "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [rows, setRows] = useState<TreatmentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    if (!user || !patientIdFromUrl) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ patientId: patientIdFromUrl });
      const data = await apiFetchJson<TreatmentNote[]>(
        `/treatment-notes?${qs}`,
      );
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notes");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user, patientIdFromUrl]);

  useEffect(() => {
    if (!user) return;
    void apiFetchJson<Patient[]>("/patients?take=200")
      .then(setPatients)
      .catch(() => setPatients([]));
  }, [user]);

  useEffect(() => {
    if (!ready || !user) return;
    void loadNotes();
  }, [ready, user, loadNotes]);

  if (!ready || !user) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  const selectedPatient = patients.find((p) => p.id === patientIdFromUrl);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Treatment notes
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            SOAP notes are listed per patient. Choose a patient to view
            history.
          </p>
        </div>
        {patientIdFromUrl ? (
          <Link
            href={`/treatment-notes/new?patientId=${encodeURIComponent(patientIdFromUrl)}`}
            className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            New note
          </Link>
        ) : null}
      </div>

      <div className="max-w-md">
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Patient
        </label>
        <select
          className={`mt-1 ${formFieldClassName}`}
          value={patientIdFromUrl}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) router.replace("/treatment-notes");
            else
              router.replace(
                `/treatment-notes?patientId=${encodeURIComponent(v)}`,
              );
          }}
        >
          <option value="">Select patient…</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.lastName}, {p.firstName}
            </option>
          ))}
        </select>
      </div>

      {patientIdFromUrl && selectedPatient ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Viewing notes for{" "}
          <Link
            href={`/patients/${selectedPatient.id}`}
            className="font-medium underline"
          >
            {selectedPatient.lastName}, {selectedPatient.firstName}
          </Link>
          .
        </p>
      ) : null}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {!patientIdFromUrl ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Pick a patient above, or open a patient profile and use the
          treatment notes links there.
        </p>
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No notes yet.{" "}
          <Link
            href={`/treatment-notes/new?patientId=${encodeURIComponent(patientIdFromUrl)}`}
            className="font-medium underline"
          >
            Write the first note
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {rows.map((n) => (
            <li key={n.id}>
              <Link
                href={`/treatment-notes/${n.id}`}
                className="block px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">
                    {formatWhen(n.createdAt)}
                  </span>
                  {n.appointment ? (
                    <span className="text-xs text-zinc-500">
                      Linked appointment
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {n.subjective.trim().slice(0, 160)}
                  {n.subjective.length > 160 ? "…" : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
