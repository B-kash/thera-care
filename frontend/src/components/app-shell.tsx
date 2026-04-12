import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { LogoutButton } from "./logout-button";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/patients", label: "Patients" },
  { href: "/appointments", label: "Appointments" },
  { href: "/treatment-notes", label: "Treatment notes" },
  { href: "/exercise-plans", label: "Exercise plans" },
  { href: "/progress", label: "Progress" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen text-foreground">
      <aside className="flex w-52 shrink-0 flex-col border-r border-app-border/70 bg-app-sidebar/88 backdrop-blur-xl supports-[backdrop-filter]:bg-app-sidebar/75">
        <div className="border-b border-app-border px-4 py-4">
          <Link
            href="/dashboard"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            Thera Care
          </Link>
          <p className="mt-1 text-xs text-foreground/60">Physio practice</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-foreground/90 hover:bg-app-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-app-border p-3">
          <LogoutButton />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-app-border/70 bg-app-elevated/85 backdrop-blur-xl supports-[backdrop-filter]:bg-app-elevated/70 px-6 text-sm font-medium text-foreground">
          <span>Thera Care</span>
          <ThemeSwitcher />
        </header>
        <main className="flex-1 px-6 py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
