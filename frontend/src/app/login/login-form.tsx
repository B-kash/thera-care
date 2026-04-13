"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formFieldClassName } from "@/lib/form-classes";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const inputClassName = `mt-1 ${formFieldClassName}`;

export function LoginForm() {
  const { ready, user, login, register, completeTwoFactorLogin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/dashboard";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loginStep, setLoginStep] = useState<"password" | "2fa">("password");
  const [preAuthToken, setPreAuthToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  useEffect(() => {
    if (!ready || !user) return;
    router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
  }, [ready, user, router, nextPath]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === "login") {
        if (loginStep === "2fa" && preAuthToken) {
          await completeTwoFactorLogin(preAuthToken, twoFactorCode);
          router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
        } else {
          const out = await login(email, password);
          if (out.needsTwoFactor) {
            setPreAuthToken(out.preAuthToken);
            setLoginStep("2fa");
            setTwoFactorCode("");
          } else {
            router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
          }
        }
      } else {
        await register(
          email,
          password,
          displayName.trim() ? displayName.trim() : undefined,
        );
        router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  if (!ready) {
    return (
      <p className="text-center text-sm text-foreground/60">Loading…</p>
    );
  }

  if (user) {
    return (
      <p className="text-center text-sm text-foreground/60">Redirecting…</p>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-app-border/80 bg-app-elevated/90 p-5 shadow-lg shadow-black/10 backdrop-blur-xl dark:shadow-black/40 sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        Thera Care
      </h1>
      <p className="mt-1 text-sm text-foreground/70">
        {mode === "register"
          ? "Create your account"
          : loginStep === "2fa"
            ? "Enter the code from your authenticator app or a backup code"
            : "Sign in to continue"}
      </p>

      <div className="mt-6 flex gap-1 rounded-lg border border-app-border/60 bg-app-muted/90 p-1">
        <button
          type="button"
          className={`flex min-h-11 flex-1 touch-manipulation items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "login"
              ? "bg-app-elevated text-foreground shadow-sm"
              : "text-foreground/65 hover:text-foreground"
          }`}
          onClick={() => {
            setMode("login");
            setError(null);
            setLoginStep("password");
            setPreAuthToken(null);
            setTwoFactorCode("");
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`flex min-h-11 flex-1 touch-manipulation items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === "register"
              ? "bg-app-elevated text-foreground shadow-sm"
              : "text-foreground/65 hover:text-foreground"
          }`}
          onClick={() => {
            setMode("register");
            setError(null);
            setLoginStep("password");
            setPreAuthToken(null);
            setTwoFactorCode("");
          }}
        >
          Register
        </button>
      </div>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {mode === "login" && loginStep === "2fa" ? (
          <div>
            <label
              htmlFor="twoFactorCode"
              className="block text-xs font-medium text-foreground/80"
            >
              Authenticator or backup code
            </label>
            <input
              id="twoFactorCode"
              name="twoFactorCode"
              autoComplete="one-time-code"
              inputMode="text"
              required
              className={inputClassName}
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              placeholder="6-digit code or 8-character backup"
            />
            <button
              type="button"
              className="mt-2 text-xs text-foreground/60 underline underline-offset-2 hover:text-foreground"
              onClick={() => {
                setLoginStep("password");
                setPreAuthToken(null);
                setTwoFactorCode("");
                setError(null);
              }}
            >
              Back to password
            </button>
          </div>
        ) : null}
        {mode === "register" && (
          <div>
            <label
              htmlFor="displayName"
              className="block text-xs font-medium text-foreground/80"
            >
              Display name (optional)
            </label>
            <input
              id="displayName"
              name="displayName"
              autoComplete="name"
              className={inputClassName}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        )}
        {!(mode === "login" && loginStep === "2fa") ? (
          <>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-foreground/80"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={inputClassName}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-foreground/80"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                required
                minLength={mode === "register" ? 8 : 1}
                className={inputClassName}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {mode === "register" && (
                <p className="mt-1 text-xs text-foreground/55">
                  At least 8 characters.
                </p>
              )}
            </div>
          </>
        ) : null}

        {error ? <Alert>{error}</Alert> : null}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending
            ? "Please wait…"
            : mode === "login" && loginStep === "2fa"
              ? "Verify and sign in"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-foreground/55">
        <Link
          href="/"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Back to home
        </Link>
      </p>
    </div>
  );
}
