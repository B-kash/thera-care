"use client";

import { AppointmentsCalendar } from "@/components/appointments-calendar";
import { DateTimeInput } from "@/components/date-inputs";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { TableShell } from "@/components/ui/table-shell";
import { apiFetchJson } from "@/lib/api";
import {
  appointmentsCalendarHref,
  readStoredAppointmentsTab,
  resolveAppointmentsCalMode,
  writeStoredAppointmentsTab,
} from "@/lib/appointments-view-storage";
import type { Appointment } from "@/types/appointment";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

function formatRange(startsAt: string, endsAt: string): string {
  const a = new Date(startsAt);
  const b = new Date(endsAt);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "—";
  return `${a.toLocaleString()} → ${b.toLocaleString()}`;
}

export function AppointmentsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitView = searchParams.get("view");

  const tab = useMemo<"list" | "calendar">(() => {
    if (explicitView === "calendar") return "calendar";
    if (explicitView === "list") return "list";
    return readStoredAppointmentsTab();
  }, [explicitView]);

  const calMode = useMemo(
    () => resolveAppointmentsCalMode(searchParams),
    [searchParams],
  );

  const [calendarTabHref, setCalendarTabHref] = useState(
    "/appointments?view=calendar&calView=month",
  );

  useEffect(() => {
    setCalendarTabHref(appointmentsCalendarHref());
  }, []);

  useEffect(() => {
    if (explicitView != null) return;
    if (readStoredAppointmentsTab() === "calendar") {
      router.replace(appointmentsCalendarHref());
    }
  }, [explicitView, router]);

  useEffect(() => {
    if (explicitView !== "calendar") return;
    const cv = searchParams.get("calView");
    if (cv === "week" || cv === "month") return;
    router.replace(appointmentsCalendarHref());
  }, [explicitView, searchParams, router]);

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
      params.set("take", "500");
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
    if (tab !== "list") return;
    void load();
  }, [ready, user, load, tab]);

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-app-accent text-app-accent-fg"
        : "text-foreground/80 hover:bg-app-muted"
    }`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="Filter by start time on the list, or browse week and month on the calendar. Overlapping slots for the same patient are blocked on the server."
        actions={
          <ButtonLink href="/appointments/new" size="md">
            New appointment
          </ButtonLink>
        }
      />

      <div className="flex flex-wrap gap-1 rounded-lg border border-app-border bg-app-muted p-1">
        <Link
          href="/appointments"
          className={tabClass(tab === "list")}
          onClick={() => writeStoredAppointmentsTab("list")}
        >
          List
        </Link>
        <Link
          href={calendarTabHref}
          className={tabClass(tab === "calendar")}
          onClick={() => writeStoredAppointmentsTab("calendar")}
        >
          Calendar
        </Link>
      </div>

      {tab === "calendar" ? (
        <AppointmentsCalendar
          patientIdFilter=""
          calMode={calMode}
        />
      ) : (
        <>
          <form
            className="flex max-w-2xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedFrom(from ? new Date(from).toISOString() : "");
              setAppliedTo(to ? new Date(to).toISOString() : "");
            }}
          >
            <div>
              <label
                htmlFor="apt-filter-from"
                className="block text-xs font-medium text-foreground/70"
              >
                Starts on or after
              </label>
              <DateTimeInput
                id="apt-filter-from"
                label="Filter appointments from"
                className="sm:min-w-[11rem]"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="apt-filter-to"
                className="block text-xs font-medium text-foreground/70"
              >
                Starts on or before
              </label>
              <DateTimeInput
                id="apt-filter-to"
                label="Filter appointments to"
                className="sm:min-w-[11rem]"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary">
              Apply filter
            </Button>
          </form>

          {error ? <Alert>{error}</Alert> : null}

          {!ready || !user ? (
            <p className="text-sm text-foreground/60">Loading…</p>
          ) : loading ? (
            <p className="text-sm text-foreground/60">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-foreground/70">
              No appointments.{" "}
              <Link
                href="/appointments/new"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                Create one
              </Link>
              .
            </p>
          ) : (
            <TableShell>
              <thead className="border-b border-app-border bg-app-muted">
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
                    className="border-b border-app-border/80 last:border-0"
                  >
                    <td className="px-4 py-2">
                      <Link
                        href={`/appointments/${a.id}`}
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        {formatRange(a.startsAt, a.endsAt)}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/patients/${a.patient.id}`}
                        className="text-foreground/90 underline-offset-2 hover:underline"
                      >
                        {a.patient.lastName}, {a.patient.firstName}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-foreground/70">{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </>
      )}
    </div>
  );
}
