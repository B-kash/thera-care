const KEY_TAB = "thera-appointments-tab";
const KEY_CAL = "thera-appointments-cal-view";

export type AppointmentsCalMode = "month" | "week";

export function readStoredAppointmentsTab(): "list" | "calendar" {
  if (typeof window === "undefined") return "list";
  return window.localStorage.getItem(KEY_TAB) === "calendar"
    ? "calendar"
    : "list";
}

export function writeStoredAppointmentsTab(tab: "list" | "calendar"): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_TAB, tab);
}

export function readStoredCalMode(): AppointmentsCalMode {
  if (typeof window === "undefined") return "month";
  return window.localStorage.getItem(KEY_CAL) === "week" ? "week" : "month";
}

export function writeStoredCalMode(mode: AppointmentsCalMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY_CAL, mode);
}

/** Full URL for calendar tab including stored month/week. */
export function appointmentsCalendarHref(): string {
  const cal = readStoredCalMode();
  return `/appointments?view=calendar&calView=${cal}`;
}

/** List index or calendar+mode depending on last tab. */
export function appointmentsIndexHref(): string {
  if (readStoredAppointmentsTab() === "calendar") {
    return appointmentsCalendarHref();
  }
  return "/appointments";
}

export function resolveAppointmentsCalMode(searchParams: {
  get(name: string): string | null;
}): AppointmentsCalMode {
  const cv = searchParams.get("calView");
  if (cv === "week") return "week";
  if (cv === "month") return "month";
  return readStoredCalMode();
}
