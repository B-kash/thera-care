"use client";

import { DateInput } from "@/components/date-inputs";
import { apiFetchJson } from "@/lib/api";
import { formFieldClassName } from "@/lib/form-classes";
import type { Patient } from "@/types/patient";
import type { ProgressRecord } from "@/types/progress-record";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function todayInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function NewProgressClient() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPatientId = searchParams.get("patientId") ?? "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState(initialPatientId);
  const [painLevel, setPainLevel] = useState("3");
  const [mobilityScore, setMobilityScore] = useState("");
  const [notes, setNotes] = useState("");
  const [recordedOn, setRecordedOn] = useState(todayInputValue);
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
      const pain = Number.parseInt(painLevel, 10);
      if (Number.isNaN(pain) || pain < 0 || pain > 10) {
        setError("Pain must be 0–10");
        setPending(false);
        return;
      }
      const body: Record<string, unknown> = {
        patientId,
        painLevel: pain,
        recordedOn,
      };
      const m = mobilityScore.trim();
      if (m !== "") {
        const n = Number.parseInt(m, 10);
        if (Number.isNaN(n) || n < 0 || n > 100) {
          setError("Mobility must be empty or 0–100");
          setPending(false);
          return;
        }
        body.mobilityScore = n;
      }
      if (notes.trim()) body.notes = notes.trim();

      const created = await apiFetchJson<ProgressRecord>("/progress", {
        method: "POST",
        body: JSON.stringify(body),
      });
      router.replace(`/progress/${created.id}`);
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
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href={
            patientId
              ? `/progress?patientId=${encodeURIComponent(patientId)}`
              : "/progress"
          }
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          ← Progress
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          New progress entry
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
          <label htmlFor="progress-new-date" className="block text-xs font-medium">
            Visit date *
          </label>
          <DateInput
            id="progress-new-date"
            label="Visit date"
            required
            value={recordedOn}
            onChange={(e) => setRecordedOn(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Pain level (0–10) *</label>
          <input
            type="number"
            min={0}
            max={10}
            required
            className={`mt-1 ${formFieldClassName}`}
            value={painLevel}
            onChange={(e) => setPainLevel(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">
            Mobility score (0–100, optional)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            className={`mt-1 ${formFieldClassName}`}
            value={mobilityScore}
            onChange={(e) => setMobilityScore(e.target.value)}
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
          {pending ? "Saving…" : "Save entry"}
        </button>
      </form>
    </div>
  );
}
