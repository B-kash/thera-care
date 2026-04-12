"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      {open ? (
        <>
          <path d="M6 6l12 12M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </>
      )}
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col text-foreground md:flex-row">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/45 md:hidden"
          onClick={closeMobileNav}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(18rem,calc(100vw-2.5rem))] shrink-0 flex-col border-r border-app-border/70 bg-app-sidebar/95 shadow-xl backdrop-blur-xl transition-transform duration-200 ease-out supports-[backdrop-filter]:bg-app-sidebar/90 md:static md:z-auto md:w-52 md:max-w-none md:translate-x-0 md:shadow-none ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="border-b border-app-border px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <Link
            href="/dashboard"
            className="text-sm font-semibold tracking-tight text-foreground"
            onClick={closeMobileNav}
          >
            Thera Care
          </Link>
          <p className="mt-1 text-xs text-foreground/60">Physio practice</p>
        </div>
        <nav
          id="app-sidebar-nav"
          className="flex flex-1 flex-col gap-1 overflow-y-auto p-3"
          aria-label="Main"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobileNav}
              className="flex min-h-11 items-center rounded-md px-3 py-2 text-sm text-foreground/90 hover:bg-app-muted md:min-h-0"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-app-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <LogoutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:min-h-screen md:min-h-[100dvh]">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-app-border/70 bg-app-elevated/85 px-4 pt-[max(0px,env(safe-area-inset-top))] text-sm font-medium text-foreground backdrop-blur-xl supports-[backdrop-filter]:bg-app-elevated/70 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-app-border/80 text-foreground hover:bg-app-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
              aria-expanded={mobileNavOpen}
              aria-controls="app-sidebar-nav"
              onClick={() => setMobileNavOpen((o) => !o)}
            >
              <span className="sr-only">{mobileNavOpen ? "Close menu" : "Open menu"}</span>
              <MenuIcon open={mobileNavOpen} />
            </button>
            <span className="truncate">Thera Care</span>
          </div>
          <span className="hidden md:inline">Thera Care</span>
          <ThemeSwitcher />
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 md:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
