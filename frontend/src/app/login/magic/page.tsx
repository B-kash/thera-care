"use client";

import { Alert } from "@/components/ui/alert";
import { apiFetchJson } from "@/lib/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function MagicConsumeInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("This page needs a valid token from your email link.");
      setPending(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await apiFetchJson<{ accessToken: string }>("/auth/magic-link/consume", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        if (!cancelled) {
          window.location.assign("/dashboard");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Sign-in failed");
          setPending(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-app-border/80 bg-app-elevated/90 p-5 shadow-lg sm:p-8">
        <h1 className="text-xl font-semibold text-foreground">Sign in link</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Open the link from your email on this device. If it expired, request a
          new link.
        </p>
        <p className="mt-6 text-center text-xs">
          <Link href="/login/magic-link" className="underline">
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-app-border/80 bg-app-elevated/90 p-5 shadow-lg sm:p-8">
        <h1 className="text-xl font-semibold text-foreground">Link problem</h1>
        <Alert className="mt-4">{error}</Alert>
        <p className="mt-6 text-center text-xs text-foreground/55">
          <Link href="/login/magic-link" className="underline">
            Request a new link
          </Link>
          {" · "}
          <Link href="/login" className="underline">
            Sign in with password
          </Link>
        </p>
      </div>
    );
  }

  if (pending) {
    return (
      <p className="text-center text-sm text-foreground/70">Signing you in…</p>
    );
  }

  return null;
}

export default function MagicLinkConsumePage() {
  return (
    <Suspense
      fallback={
        <p className="text-center text-sm text-foreground/60">Loading…</p>
      }
    >
      <MagicConsumeInner />
    </Suspense>
  );
}
