"use client";

import { MutateOnly } from "@/components/mutate-only";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { TableShell } from "@/components/ui/table-shell";
import { apiFetchJson } from "@/lib/api";
import type { Patient } from "@/types/patient";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function PatientsPage() {
  const { user, ready } = useAuth();
  const [q, setQ] = useState("");
  const [submittedQ, setSubmittedQ] = useState("");
  const [rows, setRows] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (submittedQ.trim()) params.set("q", submittedQ.trim());
      params.set("take", "50");
      const path = `/patients${params.toString() ? `?${params}` : ""}`;
      const data = await apiFetchJson<Patient[]>(path);
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load patients");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user, submittedQ]);

  useEffect(() => {
    if (!ready || !user) return;
    void load();
  }, [ready, user, load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description="Search by name, email, or phone. Add a patient to start a record."
        actions={
          <MutateOnly>
            <ButtonLink href="/patients/new">Add patient</ButtonLink>
          </MutateOnly>
        }
      />

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
          className="h-9 w-full rounded-md border border-app-border bg-app-elevated px-3 text-sm text-foreground"
        />
        <Button type="submit" variant="secondary" className="shrink-0">
          Search
        </Button>
      </form>

      {error ? <Alert>{error}</Alert> : null}

      {loading ? (
        <p className="text-sm text-foreground/60">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-foreground/70">
          No patients yet.{" "}
          <Link href="/patients/new" className="font-medium underline">
            Add your first patient
          </Link>
          .
        </p>
      ) : (
        <TableShell>
          <thead className="border-b border-app-border bg-app-muted">
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
                className="border-b border-app-border/80 last:border-0"
              >
                <td className="px-4 py-2">
                  <Link
                    href={`/patients/${p.id}`}
                    className="font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    {p.lastName}, {p.firstName}
                  </Link>
                </td>
                <td className="px-4 py-2 text-foreground/70">
                  {p.email ?? "—"}
                </td>
                <td className="px-4 py-2 text-foreground/70">
                  {p.phone ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
