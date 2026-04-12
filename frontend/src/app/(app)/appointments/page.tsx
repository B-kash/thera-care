"use client";

import { apiFetchJson } from "@/lib/api";
import type { Appointment } from "@/types/appointment";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

function formatRange(startsAt: string, endsAt: string): string {
  const a = new Date(startsAt);
  const b = new Date(endsAt);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "—";
  return `${a.toLocaleString()} → ${b.toLocaleString()}`;
}

export default function AppointmentsPage() {
  const { user, ready } = useAuth();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [rows, setRows] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (appliedFrom) params.set("from", appliedFrom);
      if (appliedTo) params.set("to", appliedTo);
      params.set("take", "100");
      const path = `/appointments${params.toString() ? `?${params}` : ""}`;
      const data = await apiFetchJson<Appointment[]>(path);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user, appliedFrom, appliedTo]);

  useEffect(() => {
    if (!ready || !user) return;
    void load();
  }, [ready, user, load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Filter by start time. Overlapping slots for the same patient are
            blocked on the server.
          </p>
        </div>
        <Link
          href="/appointments/new"
          className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New appointment
        </Link>
      </div>

      <form
        className="flex max-w-2xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setAppliedFrom(from ? new Date(from).toISOString() : "");
          setAppliedTo(to ? new Date(to).toISOString() : "");
        }}
      >
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Starts on or after
          </label>
          <input
            type="datetime-local"
            className="mt-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Starts on or before
          </label>
          <input
            type="datetime-local"
            className="mt-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="h-9 rounded-md border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
        >
          Apply filter
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No appointments.{" "}
          <Link href="/appointments/new" className="font-medium underline">
            Create one
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2 font-medium">Patient</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/appointments/${a.id}`}
                      className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
                    >
                      {formatRange(a.startsAt, a.endsAt)}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/patients/${a.patient.id}`}
                      className="text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-200"
                    >
                      {a.patient.lastName}, {a.patient.firstName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {a.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
