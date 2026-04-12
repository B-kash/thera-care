"use client";

import { apiFetchJson } from "@/lib/api";
import type { Patient } from "@/types/patient";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function PatientsPage() {
  const { token, ready } = useAuth();
  const [q, setQ] = useState("");
  const [submittedQ, setSubmittedQ] = useState("");
  const [rows, setRows] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (submittedQ.trim()) params.set("q", submittedQ.trim());
      params.set("take", "50");
      const path = `/patients${params.toString() ? `?${params}` : ""}`;
      const data = await apiFetchJson<Patient[]>(path, token);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load patients");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, submittedQ]);

  useEffect(() => {
    if (!ready || !token) return;
    void load();
  }, [ready, token, load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Search by name, email, or phone. Add a patient to start a record.
          </p>
        </div>
        <Link
          href="/patients/new"
          className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Add patient
        </Link>
      </div>

      <form
        className="flex max-w-md flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmittedQ(q);
        }}
      >
        <input
          type="search"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
        />
        <button
          type="submit"
          className="h-9 shrink-0 rounded-md border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
        >
          Search
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
          No patients yet.{" "}
          <Link href="/patients/new" className="font-medium underline">
            Add your first patient
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Phone</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/patients/${p.id}`}
                      className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
                    >
                      {p.lastName}, {p.firstName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {p.email ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">
                    {p.phone ?? "—"}
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
