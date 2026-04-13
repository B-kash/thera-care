"use client";

import { isAdminRole } from "@/components/mutate-only";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { TableShell } from "@/components/ui/table-shell";
import { formFieldClassName } from "@/lib/form-classes";
import { apiFetchJson } from "@/lib/api";
import type { UserRole } from "@/providers/auth-provider";
import { useAuth } from "@/providers/auth-provider";
import { useCallback, useEffect, useState } from "react";

const inputClassName = `mt-1 ${formFieldClassName}`;

type UserRow = {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type Panel =
  | { kind: "create" }
  | { kind: "edit"; row: UserRow };

const roles: UserRole[] = ["ADMIN", "THERAPIST", "STAFF"];

export default function UsersAdminPage() {
  const { user, ready } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!ready || !isAdminRole(user?.role)) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetchJson<UserRow[]>("/users?take=100");
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [ready, user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!ready) {
    return <p className="text-sm text-foreground/60">Loading…</p>;
  }

  if (!isAdminRole(user?.role)) {
    return (
      <div className="space-y-4">
        <PageHeader title="Users" />
        <Alert>Only administrators can manage users.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Create accounts, assign roles, and deactivate access. Public self-service registration follows ALLOW_PUBLIC_REGISTER on the API."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void load()}>
              Refresh
            </Button>
            <Button type="button" onClick={() => setPanel({ kind: "create" })}>
              Add user
            </Button>
          </div>
        }
      />

      {error ? <Alert>{error}</Alert> : null}

      {loading ? (
        <p className="text-sm text-foreground/60">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-foreground/70">No users yet.</p>
      ) : (
        <TableShell>
          <thead className="border-b border-app-border bg-app-muted">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Role</th>
              <th className="px-3 py-2 text-left font-medium">Active</th>
              <th className="px-3 py-2 text-left font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-app-border/80 align-middle last:border-0"
              >
                <td className="px-3 py-2 text-sm">{r.email}</td>
                <td className="max-w-[10rem] truncate px-3 py-2 text-sm">
                  {r.displayName ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-sm">{r.role}</td>
                <td className="px-3 py-2 text-sm">{r.active ? "Yes" : "No"}</td>
                <td className="px-3 py-2 text-right">
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-xs"
                    onClick={() => setPanel({ kind: "edit", row: r })}
                  >
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      {panel ? (
        <UserPanel
          panel={panel}
          saving={saving}
          onClose={() => setPanel(null)}
          onSaved={async () => {
            setPanel(null);
            await load();
          }}
          onError={setError}
          onSaving={setSaving}
        />
      ) : null}
    </div>
  );
}

function UserPanel({
  panel,
  saving,
  onClose,
  onSaved,
  onError,
  onSaving,
}: {
  panel: Panel;
  saving: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (msg: string | null) => void;
  onSaving: (v: boolean) => void;
}) {
  const [email, setEmail] = useState(
    panel.kind === "edit" ? panel.row.email : "",
  );
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState(
    panel.kind === "edit" ? (panel.row.displayName ?? "") : "",
  );
  const [role, setRole] = useState<UserRole>(
    panel.kind === "edit" ? panel.row.role : "THERAPIST",
  );
  const [active, setActive] = useState(
    panel.kind === "edit" ? panel.row.active : true,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    onSaving(true);
    try {
      if (panel.kind === "create") {
        if (!password || password.length < 8) {
          onError("Password must be at least 8 characters.");
          return;
        }
        await apiFetchJson<UserRow>("/users", {
          method: "POST",
          body: JSON.stringify({
            email: email.trim(),
            password,
            displayName: displayName.trim() || undefined,
            role,
            active,
          }),
        });
      } else {
        const body: Record<string, unknown> = {
          displayName: displayName.trim() || null,
          role,
          active,
        };
        if (password.length > 0) {
          if (password.length < 8) {
            onError("New password must be at least 8 characters.");
            return;
          }
          body.password = password;
        }
        await apiFetchJson<UserRow>(`/users/${panel.row.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }
      await onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Request failed");
    } finally {
      onSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        className="max-h-[min(90vh,40rem)] w-full max-w-md overflow-y-auto rounded-xl border border-app-border/80 bg-app-elevated p-5 shadow-xl"
        role="dialog"
        aria-labelledby="user-panel-title"
      >
        <h2
          id="user-panel-title"
          className="text-lg font-semibold text-foreground"
        >
          {panel.kind === "create" ? "Add user" : "Edit user"}
        </h2>
        <form className="mt-4 space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div>
            <label
              htmlFor="u-email"
              className="block text-xs font-medium text-foreground/80"
            >
              Email
            </label>
            <input
              id="u-email"
              type="email"
              required
              disabled={panel.kind === "edit"}
              className={inputClassName}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="u-password"
              className="block text-xs font-medium text-foreground/80"
            >
              {panel.kind === "create" ? "Password" : "New password (optional)"}
            </label>
            <input
              id="u-password"
              type="password"
              autoComplete="new-password"
              required={panel.kind === "create"}
              className={inputClassName}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="u-display"
              className="block text-xs font-medium text-foreground/80"
            >
              Display name
            </label>
            <input
              id="u-display"
              className={inputClassName}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="u-role"
              className="block text-xs font-medium text-foreground/80"
            >
              Role
            </label>
            <select
              id="u-role"
              className={inputClassName}
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground/90">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Active (can sign in)
          </label>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
