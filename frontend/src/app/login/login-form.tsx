"use client";

import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function LoginForm() {
  const { ready, token, login, register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/dashboard";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!ready || !token) return;
    router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
  }, [ready, token, router, nextPath]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(
          email,
          password,
          displayName.trim() ? displayName.trim() : undefined,
        );
      }
      router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  if (!ready) {
    return (
      <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</div>
    );
  }

  if (token) {
    return (
      <div className="text-sm text-zinc-500 dark:text-zinc-400">Redirecting…</div>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-xl font-semibold tracking-tight">Thera Care</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {mode === "login" ? "Sign in to continue" : "Create your account"}
      </p>

      <div className="mt-6 flex gap-2 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
        <button
          type="button"
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
            mode === "login"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
          onClick={() => {
            setMode("login");
            setError(null);
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${
            mode === "register"
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
          onClick={() => {
            setMode("register");
            setError(null);
          }}
        >
          Register
        </button>
      </div>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        {mode === "register" && (
          <div>
            <label
              htmlFor="displayName"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Display name (optional)
            </label>
            <input
              id="displayName"
              name="displayName"
              autoComplete="name"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        )}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "register" ? 8 : 1}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "register" && (
            <p className="mt-1 text-xs text-zinc-500">At least 8 characters.</p>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-500">
        <Link href="/" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
          Back to home
        </Link>
      </p>
    </div>
  );
}
