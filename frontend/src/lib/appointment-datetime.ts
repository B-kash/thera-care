/** Default slot length for new appointments (matches typical visit). */
export const DEFAULT_APPOINTMENT_MINUTES = 30;

/** `datetime-local` string from local `Date` (no timezone suffix). */
export function formatLocalDateTimeInput(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Next half-hour boundary after now (+1 min buffer), local time. */
export function defaultNewAppointmentStart(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  const step = DEFAULT_APPOINTMENT_MINUTES;
  const mins = d.getHours() * 60 + d.getMinutes();
  const roundedUp = Math.ceil(mins / step) * step;
  d.setHours(0, 0, 0, 0);
  d.setMinutes(roundedUp);
  return formatLocalDateTimeInput(d);
}

export function addMinutesToLocalInput(
  localStr: string,
  deltaMinutes: number,
): string {
  const d = new Date(localStr);
  if (Number.isNaN(d.getTime())) return localStr;
  d.setMinutes(d.getMinutes() + deltaMinutes);
  return formatLocalDateTimeInput(d);
}

export function isValidAppointmentRange(
  startLocal: string,
  endLocal: string,
): boolean {
  if (!startLocal?.trim() || !endLocal?.trim()) return false;
  const a = new Date(startLocal);
  const b = new Date(endLocal);
  return (
    !Number.isNaN(a.getTime()) &&
    !Number.isNaN(b.getTime()) &&
    b.getTime() > a.getTime()
  );
}

/** Human label for length; `null` if invalid or empty. */
export function defaultSlotRange(): { startsAt: string; endsAt: string } {
  const s = defaultNewAppointmentStart();
  return {
    startsAt: s,
    endsAt: addMinutesToLocalInput(s, DEFAULT_APPOINTMENT_MINUTES),
  };
}

/** Parse `?startsAt=` (datetime-local fragment or ISO) into start + default length end. */
export function parseSlotRangeFromSearchParam(
  raw: string | null | undefined,
): { startsAt: string; endsAt: string } | null {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  const s = formatLocalDateTimeInput(d);
  return {
    startsAt: s,
    endsAt: addMinutesToLocalInput(s, DEFAULT_APPOINTMENT_MINUTES),
  };
}

export function appointmentDurationLabel(
  startLocal: string,
  endLocal: string,
): string | null {
  if (!isValidAppointmentRange(startLocal, endLocal)) return null;
  const ms = new Date(endLocal).getTime() - new Date(startLocal).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins <= 0) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
