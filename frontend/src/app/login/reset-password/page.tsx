"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formFieldClassName } from "@/lib/form-classes";
import { apiFetchJson } from "@/lib/api";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const inputClassName = `mt-1 ${formFieldClassName}`;

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("This page needs a valid token from your email link.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setPending(true);
    try {
      await apiFetchJson<{ ok: boolean }>("/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
      router.replace("/login?reset=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-app-border/80 bg-app-elevated/90 p-5 shadow-lg sm:p-8">
        <h1 className="text-xl font-semibold text-foreground">Reset password</h1>
        <p className="mt-2 text-sm text-foreground/70">
          Open the reset link from your email. If the link expired, request a
          new one from the sign-in page.
        </p>
        <p className="mt-6 text-center text-xs text-foreground/55">
          <Link href="/login/forgot-password" className="underline">
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <p className="text-center text-sm text-foreground/70">Redirecting…</p>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-app-border/80 bg-app-elevated/90 p-5 shadow-lg sm:p-8">
      <h1 className="text-xl font-semibold text-foreground">New password</h1>
      <p className="mt-1 text-sm text-foreground/70">
        Choose a new password for your account.
      </p>
      <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <div>
          <label
            htmlFor="np"
            className="block text-xs font-medium text-foreground/80"
          >
            Password
          </label>
          <input
            id="np"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={inputClassName}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="mt-1 text-xs text-foreground/55">At least 8 characters.</p>
        </div>
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving…" : "Update password"}
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-foreground/55">
        <Link href="/login" className="underline underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <p className="text-center text-sm text-foreground/60">Loading…</p>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
