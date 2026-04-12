"use client";

import { apiFetchJson } from "@/lib/api";
import type { ProgressRecord } from "@/types/progress-record";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function dateInputFromApi(iso: string): string {
  if (iso.length >= 10 && iso[4] === "-" && iso[7] === "-") {
    return iso.slice(0, 10);
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ProgressDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, ready } = useAuth();
  const router = useRouter();

  const [row, setRow] = useState<ProgressRecord | null>(null);
  const [painLevel, setPainLevel] = useState("");
  const [mobilityScore, setMobilityScore] = useState("");
  const [notes, setNotes] = useState("");
  const [recordedOn, setRecordedOn] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const load = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetchJson<ProgressRecord>(`/progress/${id}`);
      setRow(r);
      setPainLevel(String(r.painLevel));
      setMobilityScore(
        r.mobilityScore != null ? String(r.mobilityScore) : "",
      );
      setNotes(r.notes ?? "");
      setRecordedOn(dateInputFromApi(r.recordedOn));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => {
    if (!ready || !user) return;
    void load();
  }, [ready, user, load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !row) return;
    const pain = Number.parseInt(painLevel, 10);
    if (Number.isNaN(pain) || pain < 0 || pain > 10) {
      setError("Pain must be 0–10");
      return;
    }
    const body: Record<string, unknown> = {
      painLevel: pain,
      recordedOn,
    };
    const m = mobilityScore.trim();
    if (m === "") body.mobilityScore = null;
    else {
      const n = Number.parseInt(m, 10);
      if (Number.isNaN(n) || n < 0 || n > 100) {
        setError("Mobility must be empty or 0–100");
        return;
      }
      body.mobilityScore = n;
    }
    body.notes = notes.trim() || null;

    setSavePending(true);
    setError(null);
    try {
      const updated = await apiFetchJson<ProgressRecord>(`/progress/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setRow(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavePending(false);
    }
  }

  async function onDelete() {
    if (!user || !row) return;
    if (!window.confirm("Delete this progress entry?")) return;
    const pid = row.patientId;
    setDeletePending(true);
    setError(null);
    try {
      await apiFetchJson(`/progress/${id}`, { method: "DELETE" });
      router.replace(
        pid ? `/progress?patientId=${encodeURIComponent(pid)}` : "/progress",
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

  if (!row) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <Link href="/progress" className="text-sm underline">
          ← Progress
        </Link>
      </div>
    );
  }

  const listHref = `/progress?patientId=${encodeURIComponent(row.patientId)}`;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href={listHref}
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          ← Progress for patient
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Edit entry
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Patient:{" "}
          <Link
            href={`/patients/${row.patient.id}`}
            className="font-medium underline"
          >
            {row.patient.lastName}, {row.patient.firstName}
          </Link>
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSave}>
        <div>
          <label className="block text-xs font-medium">Visit date *</label>
          <input
            type="date"
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={recordedOn}
            onChange={(e) => setRecordedOn(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Pain (0–10) *</label>
          <input
            type="number"
            min={0}
            max={10}
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={painLevel}
            onChange={(e) => setPainLevel(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">
            Mobility (0–100, empty = clear)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={mobilityScore}
            onChange={(e) => setMobilityScore(e.target.value)}
          />
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
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {savePending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={deletePending}
            onClick={() => void onDelete()}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 dark:border-red-900 dark:text-red-400"
          >
            {deletePending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </form>
    </div>
  );
}
