"use client";

import { apiFetchJson } from "@/lib/api";
import type { Patient } from "@/types/patient";
import { DateInput } from "@/components/date-inputs";
import { canMutateRole } from "@/components/mutate-only";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

function safeInternalPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.includes(":")) return null;
  return raw;
}

export function NewPatientForm() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => safeInternalPath(searchParams.get("next")),
    [searchParams],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [notes, setNotes] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setPending(true);
    try {
      const body: Record<string, unknown> = {
        firstName,
        lastName,
      };
      if (email.trim()) body.email = email.trim();
      if (phone.trim()) body.phone = phone.trim();
      if (dateOfBirth) body.dateOfBirth = dateOfBirth;
      if (notes.trim()) body.notes = notes.trim();

      const created = await apiFetchJson<Patient>("/patients", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (nextPath) {
        const join = nextPath.includes("?") ? "&" : "?";
        router.replace(
          `${nextPath}${join}patientId=${encodeURIComponent(created.id)}`,
        );
      } else {
        router.replace(`/patients/${created.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create patient");
    } finally {
      setPending(false);
    }
  }

  if (!ready || !user) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (!canMutateRole(user.role)) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Your role cannot create patients.
        </p>
        <Link href={nextPath ?? "/patients"} className="text-sm underline">
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href={nextPath ?? "/patients"}
          className="text-sm text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {nextPath ? "← Back" : "← Patients"}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New patient</h1>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              First name *
            </label>
            <input
              required
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Last name *
            </label>
            <input
              required
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <input
            type="email"
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Phone
          </label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="new-patient-dob"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            Date of birth
          </label>
          <DateInput
            id="new-patient-dob"
            label="Date of birth"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Notes
          </label>
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

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? "Saving…" : "Create patient"}
          </button>
          <Link
            href={nextPath ?? "/patients"}
            className="inline-flex items-center rounded-md border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-600"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
