"use client";

import { apiFetchJson } from "@/lib/api";
import { calendarLocalizer } from "@/lib/calendar-localizer";
import { formatLocalDateTimeInput } from "@/lib/appointment-datetime";
import {
  type AppointmentsCalMode,
  writeStoredCalMode,
} from "@/lib/appointments-view-storage";
import type { Appointment } from "@/types/appointment";
import { useAuth } from "@/providers/auth-provider";
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Views, type SlotInfo, type View } from "react-big-calendar";
import { Alert } from "@/components/ui/alert";

export type CalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
};

type Props = {
  patientIdFilter: string;
  calMode: AppointmentsCalMode;
};

export function AppointmentsCalendar({ patientIdFilter, calMode }: Props) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rbcView: View = calMode === "week" ? Views.WEEK : Views.MONTH;

  const range = useMemo(() => {
    if (rbcView === Views.WEEK) {
      return {
        start: startOfWeek(cursor, { locale: enUS }),
        end: endOfWeek(cursor, { locale: enUS }),
      };
    }
    return {
      start: startOfMonth(cursor),
      end: endOfMonth(cursor),
    };
  }, [cursor, rbcView]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("from", range.start.toISOString());
      params.set("to", range.end.toISOString());
      if (patientIdFilter) params.set("patientId", patientIdFilter);
      params.set("take", "500");
      const rows = await apiFetchJson<Appointment[]>(
        `/appointments?${params.toString()}`,
      );
      const next: CalEvent[] = rows.map((a) => ({
        id: a.id,
        title: `${a.patient.lastName}, ${a.patient.firstName}`,
        start: new Date(a.startsAt),
        end: new Date(a.endsAt),
      }));
      setEvents(next);
    } catch (e) {
      setEvents([]);
      setError(e instanceof Error ? e.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, [user, range.start, range.end, patientIdFilter]);

  useEffect(() => {
    if (!ready || !user) return;
    void load();
  }, [ready, user, load]);

  if (!ready || !user) {
    return <p className="text-sm text-foreground/60">Loading…</p>;
  }

  function persistCalView(next: View) {
    const mode: AppointmentsCalMode = next === Views.WEEK ? "week" : "month";
    writeStoredCalMode(mode);
    const qs = new URLSearchParams();
    qs.set("view", "calendar");
    qs.set("calView", mode);
    if (patientIdFilter) qs.set("patientId", patientIdFilter);
    const nextPath = `/appointments?${qs.toString()}`;
    // RBC often calls onView when controlled `view` syncs; unconditional replace → RSC refetch storm + broken UI.
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (
        sp.get("view") === "calendar" &&
        sp.get("calView") === mode &&
        (patientIdFilter ? sp.get("patientId") === patientIdFilter : !sp.get("patientId"))
      ) {
        return;
      }
    }
    router.replace(nextPath, { scroll: false });
  }

  function openNewAtSlot(slot: SlotInfo) {
    const start = slot.start;
    if (!(start instanceof Date) || Number.isNaN(start.getTime())) return;
    const local = formatLocalDateTimeInput(start);
    const qs = new URLSearchParams();
    qs.set("startsAt", local);
    if (patientIdFilter) qs.set("patientId", patientIdFilter);
    router.push(`/appointments/new?${qs.toString()}`);
  }

  return (
    <div className="space-y-3">
      {error ? <Alert>{error}</Alert> : null}
      {loading ? (
        <p className="text-sm text-foreground/60">Loading calendar…</p>
      ) : null}
      <div className="rounded-lg border border-app-border bg-app-elevated p-2">
        <Calendar
          localizer={calendarLocalizer}
          culture="en-US"
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ minHeight: 560 }}
          views={[Views.MONTH, Views.WEEK]}
          view={rbcView}
          date={cursor}
          selectable
          onView={(v) => persistCalView(v)}
          onNavigate={(d) => setCursor(d)}
          onSelectSlot={(slot) => openNewAtSlot(slot)}
          onSelectEvent={(ev) => {
            const e = ev as CalEvent;
            router.push(`/appointments/${e.id}`);
          }}
        />
      </div>
      <p className="text-xs text-foreground/60">
        Month loads appointments that start in that month. Click an event for
        details. Click empty space to open new appointment at that time (week
        view = time slot; month = start of day). List tab and detail page still
        work for create/edit.
      </p>
    </div>
  );
}
