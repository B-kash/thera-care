"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { formFieldClassName } from "@/lib/form-classes";
import { resolveApiUrl } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useState } from "react";

const inputClassName = `mt-1 ${formFieldClassName}`;

type SetupPayload = { secretBase32: string; otpauthUrl: string };

export default function SecuritySettingsPage() {
  const { user, refreshSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

  async function postJson<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(resolveApiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      let msg = text || `Request failed (${res.status})`;
      try {
        const err = JSON.parse(text) as { message?: string | string[] };
        if (typeof err.message === "string") msg = err.message;
        else if (Array.isArray(err.message)) msg = err.message.join(", ");
      } catch {
        /* use raw text */
      }
      throw new Error(msg);
    }
    return text ? (JSON.parse(text) as T) : ({} as T);
  }

  async function startSetup() {
    setError(null);
    setPending(true);
    setBackupCodes(null);
    try {
      const data = await postJson<SetupPayload>("/auth/2fa/setup/start");
      setSetup(data);
      setConfirmCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start setup");
    } finally {
      setPending(false);
    }
  }

  async function cancelSetup() {
    setError(null);
    setPending(true);
    try {
      await postJson("/auth/2fa/setup/cancel");
      setSetup(null);
      setConfirmCode("");
      await refreshSession();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel");
    } finally {
      setPending(false);
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await postJson<{ backupCodes: string[] }>(
        "/auth/2fa/setup/confirm",
        { code: confirmCode.replace(/\s+/g, "") },
      );
      setBackupCodes(res.backupCodes);
      setSetup(null);
      setConfirmCode("");
      await refreshSession();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setPending(false);
    }
  }

  async function disableTotp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await postJson("/auth/2fa/disable", {
        password: disablePassword,
        code: disableCode,
      });
      setDisablePassword("");
      setDisableCode("");
      await refreshSession();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not disable 2FA");
    } finally {
      setPending(false);
    }
  }

  async function copyBackups() {
    if (!backupCodes?.length) return;
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Security"
        description="Authenticator app (TOTP) and backup codes. Store backup codes offline — they are shown only once."
      />

      {error ? <Alert>{error}</Alert> : null}

      <section className="rounded-xl border border-app-border/80 bg-app-elevated/60 p-5">
        <h2 className="text-sm font-semibold text-foreground">Two-factor status</h2>
        <p className="mt-2 text-sm text-foreground/70">
          {user.totpEnabled
            ? "Two-factor authentication is on for your account."
            : user.totpEnrollmentPending
              ? "Setup in progress — finish by entering the code from your app, or cancel to start over."
              : "Two-factor authentication is off."}
        </p>
      </section>

      {backupCodes ? (
        <section className="rounded-xl border border-app-border/80 bg-app-elevated/60 p-5">
          <h2 className="text-sm font-semibold text-foreground">Backup codes</h2>
          <p className="mt-2 text-sm text-foreground/70">
            Save these codes in a safe place. Each code works once if you lose your
            phone. They will not be shown again.
          </p>
          <ul className="mt-3 grid gap-1 font-mono text-xs text-foreground sm:grid-cols-2">
            {backupCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void copyBackups()}>
              Copy all
            </Button>
            <Button
              type="button"
              onClick={() => {
                setBackupCodes(null);
              }}
            >
              Done
            </Button>
          </div>
        </section>
      ) : null}

      {!user.totpEnabled && !setup ? (
        <section className="rounded-xl border border-app-border/80 bg-app-elevated/60 p-5">
          <h2 className="text-sm font-semibold text-foreground">Enable TOTP</h2>
          <p className="mt-2 text-sm text-foreground/70">
            Use an authenticator app (Google Authenticator, 1Password, Authy, etc.).
          </p>
          <Button
            type="button"
            className="mt-4"
            disabled={pending}
            onClick={() => void startSetup()}
          >
            Start setup
          </Button>
        </section>
      ) : null}

      {setup ? (
        <section className="rounded-xl border border-app-border/80 bg-app-elevated/60 p-5">
          <h2 className="text-sm font-semibold text-foreground">Scan or enter secret</h2>
          <p className="mt-2 text-sm text-foreground/70">
            On your phone, add an account and either scan the QR from another device
            or use &quot;Enter setup key&quot; with the secret below. You can also open
            this provisioning link on the same device if your app supports it.
          </p>
          <div className="mt-3 break-all text-xs">
            <a
              href={setup.otpauthUrl}
              className="text-app-accent underline underline-offset-2"
            >
              Open in authenticator (otpauth link)
            </a>
          </div>
          <p className="mt-3 text-xs font-medium text-foreground/80">Secret (Base32)</p>
          <pre className="mt-1 overflow-x-auto rounded-md border border-app-border/70 bg-app-muted/50 p-3 font-mono text-xs text-foreground">
            {setup.secretBase32}
          </pre>
          <form className="mt-6 space-y-3" onSubmit={confirmSetup}>
            <div>
              <label
                htmlFor="totpConfirm"
                className="block text-xs font-medium text-foreground/80"
              >
                6-digit code from the app
              </label>
              <input
                id="totpConfirm"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                className={inputClassName}
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={pending}>
                Confirm and save
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => void cancelSetup()}
              >
                Cancel setup
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {user.totpEnabled ? (
        <section className="rounded-xl border border-app-border/80 bg-app-elevated/60 p-5">
          <h2 className="text-sm font-semibold text-foreground">Disable two-factor</h2>
          <p className="mt-2 text-sm text-foreground/70">
            Enter your account password and a current authenticator code or unused
            backup code.
          </p>
          <form className="mt-4 space-y-3" onSubmit={disableTotp}>
            <div>
              <label
                htmlFor="dPass"
                className="block text-xs font-medium text-foreground/80"
              >
                Password
              </label>
              <input
                id="dPass"
                type="password"
                autoComplete="current-password"
                required
                className={inputClassName}
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="dCode"
                className="block text-xs font-medium text-foreground/80"
              >
                Authenticator or backup code
              </label>
              <input
                id="dCode"
                required
                className={inputClassName}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
              />
            </div>
            <Button type="submit" variant="secondary" disabled={pending}>
              Turn off 2FA
            </Button>
          </form>
        </section>
      ) : null}

      <section className="rounded-xl border border-app-border/80 bg-app-muted/40 p-5 text-sm text-foreground/75">
        <p className="font-medium text-foreground/90">Lost your device?</p>
        <p className="mt-2">
          A clinic <strong className="font-medium text-foreground">ADMIN</strong> can
          clear your 2FA with{" "}
          <code className="rounded bg-app-muted px-1 py-0.5 font-mono text-xs">
            POST /users/:userId/two-factor/clear
          </code>{" "}
          so you can enroll again here. This does not reset your password.
        </p>
      </section>
    </div>
  );
}
