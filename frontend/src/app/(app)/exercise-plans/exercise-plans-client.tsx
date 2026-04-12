"use client";

import { apiFetchJson } from "@/lib/api";
import { formFieldClassName } from "@/lib/form-classes";
import type { ExercisePlanList } from "@/types/exercise-plan";
import type { Patient } from "@/types/patient";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export function ExercisePlansClient() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromUrl = searchParams.get("patientId") ?? "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [rows, setRows] = useState<ExercisePlanList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    if (!user || !patientIdFromUrl) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ patientId: patientIdFromUrl });
      const data = await apiFetchJson<ExercisePlanList[]>(
        `/exercise-plans?${qs}`,
      );
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load plans");
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
    void loadPlans();
  }, [ready, user, loadPlans]);

  if (!ready || !user) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  const selectedPatient = patients.find((p) => p.id === patientIdFromUrl);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Exercise plans
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Plans belong to one patient. Each plan has ordered exercise items
            (sets/reps optional).
          </p>
        </div>
        {patientIdFromUrl ? (
          <Link
            href={`/exercise-plans/new?patientId=${encodeURIComponent(patientIdFromUrl)}`}
            className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            New plan
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
            if (!v) router.replace("/exercise-plans");
            else
              router.replace(
                `/exercise-plans?patientId=${encodeURIComponent(v)}`,
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
          Plans for{" "}
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
          Select patient to list plans, or use links from a patient profile.
        </p>
      ) : loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No plans yet.{" "}
          <Link
            href={`/exercise-plans/new?patientId=${encodeURIComponent(patientIdFromUrl)}`}
            className="font-medium underline"
          >
            Create one
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {rows.map((plan) => (
            <li key={plan.id}>
              <Link
                href={`/exercise-plans/${plan.id}`}
                className="block px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              >
                <span className="text-sm font-medium">{plan.title}</span>
                <p className="mt-1 text-xs text-zinc-500">
                  {plan._count.items} exercise
                  {plan._count.items === 1 ? "" : "s"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
