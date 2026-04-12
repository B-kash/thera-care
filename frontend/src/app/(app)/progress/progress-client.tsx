"use client";

import { apiFetchJson } from "@/lib/api";
import type { Patient } from "@/types/patient";
import type { ProgressRecord } from "@/types/progress-record";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString();
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function ProgressClient() {
  const { token, ready } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get("patientId") ?? "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [rows, setRows] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    if (!token || !patientIdFromUrl) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ patientId: patientIdFromUrl });
      const data = await apiFetchJson<ProgressRecord[]>(`/progress?${qs}`, token);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load progress");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, patientIdFromUrl]);

  useEffect(() => {
    if (!token) return;
    void apiFetchJson<Patient[]>("/patients?take=200", token)
      .then(setPatients)
      .catch(() => setPatients([]));
  }, [token]);

  useEffect(() => {
    if (!ready || !token) return;
    void loadRows();
  }, [ready, token, loadRows]);

  const vizSeries = useMemo(() => {
    if (rows.length === 0) return [];
    const cap = 14;
    const slice = rows.slice(0, cap);
    return slice.slice().reverse();
  }, [rows]);

  if (!ready || !token) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  const selectedPatient = patients.find((p) => p.id === patientIdFromUrl);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Pain (0–10), optional mobility (0–100), notes, and visit date per
            patient. Chart uses up to 14 most recent entries, oldest → newest
            left → right.
          </p>
        </div>
        {patientIdFromUrl ? (
          <Link
            href={`/progress/new?patientId=${encodeURIComponent(patientIdFromUrl)}`}
            className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            New entry
          </Link>
        ) : null}
      </div>

      <div className="max-w-md">
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Patient
        </label>
        <select
          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
          value={patientIdFromUrl}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) router.replace("/progress");
            else router.replace(`/progress?patientId=${encodeURIComponent(v)}`);
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
          Tracking{" "}
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
          Pick patient to load history and chart.
        </p>
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No entries yet.{" "}
          <Link
            href={`/progress/new?patientId=${encodeURIComponent(patientIdFromUrl)}`}
            className="font-medium underline"
          >
            Add first record
          </Link>
          .
        </p>
      ) : (
        <>
          <section className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold tracking-tight">Pain trend</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Bar height = pain level (max 10). Hover a column for date.
            </p>
            <div className="mt-4 flex h-32 items-end gap-1 border-b border-zinc-200 pb-1 dark:border-zinc-700">
              {vizSeries.map((r) => {
                const h = Math.round((r.painLevel / 10) * 120);
                return (
                  <div
                    key={r.id}
                    className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                    title={`${dateLabel(r.recordedOn)} — pain ${r.painLevel}`}
                  >
                    <div
                      className="w-full max-w-[18px] rounded-t bg-zinc-700 dark:bg-zinc-300"
                      style={{
                        height: `${Math.max(r.painLevel > 0 ? 4 : 0, h)}px`,
                        maxHeight: 120,
                      }}
                    />
                    <span className="text-[10px] leading-none text-zinc-500">
                      {shortDate(r.recordedOn)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {vizSeries.some((r) => r.mobilityScore != null) ? (
            <section className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
              <h2 className="text-sm font-semibold tracking-tight">
                Mobility trend
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Bar height = mobility score when recorded (0–100).
              </p>
              <div className="mt-4 flex h-32 items-end gap-1 border-b border-zinc-200 pb-1 dark:border-zinc-700">
                {vizSeries.map((r) => {
                  const m = r.mobilityScore;
                  const h =
                    m == null ? 0 : Math.round((m / 100) * 120);
                  return (
                    <div
                      key={r.id}
                      className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                      title={
                        m == null
                          ? `${dateLabel(r.recordedOn)} — no mobility`
                          : `${dateLabel(r.recordedOn)} — mobility ${m}`
                      }
                    >
                      <div
                        className="w-full max-w-[18px] rounded-t bg-emerald-700 dark:bg-emerald-400"
                        style={{
                          height: `${Math.max(m != null && m > 0 ? 4 : 0, h)}px`,
                          maxHeight: 120,
                          opacity: m == null ? 0.2 : 1,
                        }}
                      />
                      <span className="text-[10px] leading-none text-zinc-500">
                        {shortDate(r.recordedOn)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/progress/${r.id}`}
                  className="block px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">
                      {dateLabel(r.recordedOn)}
                    </span>
                    <span className="text-xs text-zinc-500">
                      Pain {r.painLevel}
                      {r.mobilityScore != null
                        ? ` · Mobility ${r.mobilityScore}`
                        : ""}
                    </span>
                  </div>
                  {r.notes ? (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {r.notes}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
