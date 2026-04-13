"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formFieldClassName } from "@/lib/form-classes";
import { apiFetchJson } from "@/lib/api";
import { defaultTenantSlugBody } from "@/lib/default-tenant-slug";
import Link from "next/link";
import { useState } from "react";

const inputClassName = `mt-1 ${formFieldClassName}`;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await apiFetchJson<{ ok: boolean }>("/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          ...defaultTenantSlugBody(),
        }),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-app-border/80 bg-app-elevated/90 p-5 shadow-lg shadow-black/10 backdrop-blur-xl dark:shadow-black/40 sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        Forgot password
      </h1>
      <p className="mt-1 text-sm text-foreground/70">
        {sent
          ? "If an account exists for that email, we sent reset instructions."
          : "We will email you a one-time link if this address is registered."}
      </p>

      {sent ? (
        <p className="mt-6 text-sm text-foreground/80">
          You can close this tab or return to sign in. The message may take a
          minute to arrive.
        </p>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div>
            <label
              htmlFor="fp-email"
              className="block text-xs font-medium text-foreground/80"
            >
              Email
            </label>
            <input
              id="fp-email"
              type="email"
              autoComplete="email"
              required
              className={inputClassName}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error ? <Alert>{error}</Alert> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Please wait…" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-foreground/55">
        <Link
          href="/login"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
