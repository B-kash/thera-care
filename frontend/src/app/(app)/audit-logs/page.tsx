"use client";

import { isAdminRole } from "@/components/mutate-only";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { TableShell } from "@/components/ui/table-shell";
import { apiFetchJson } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useCallback, useEffect, useState } from "react";

type AuditRow = {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { email: string; displayName: string | null };
};

export default function AuditLogsPage() {
  const { user, ready } = useAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!ready || !isAdminRole(user?.role)) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetchJson<AuditRow[]>("/audit-logs?take=100");
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
        <PageHeader title="Audit logs" />
        <Alert>Only administrators can view audit logs.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit logs"
        description="Append-only trail of clinical and domain mutations (who, what, when). Filter via query API; newest 100 rows shown here."
        actions={
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {error ? <Alert>{error}</Alert> : null}

      {loading ? (
        <p className="text-sm text-foreground/60">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-foreground/70">No audit entries yet.</p>
      ) : (
        <TableShell>
          <thead className="border-b border-app-border bg-app-muted">
            <tr>
              <th className="px-3 py-2 font-medium">When</th>
              <th className="px-3 py-2 font-medium">Actor</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">Entity</th>
              <th className="px-3 py-2 font-medium">Id</th>
              <th className="hidden px-3 py-2 font-medium lg:table-cell">
                IP
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-app-border/80 align-top last:border-0"
              >
                <td className="whitespace-nowrap px-3 py-2 text-xs text-foreground/90 sm:text-sm">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="max-w-[10rem] truncate px-3 py-2 text-xs text-foreground/90 sm:text-sm">
                  {r.actor.displayName ?? r.actor.email}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm">
                  {r.action}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm">
                  {r.entityType}
                </td>
                <td className="max-w-[8rem] truncate px-3 py-2 font-mono text-xs text-foreground/80">
                  {r.entityId}
                </td>
                <td className="hidden max-w-[8rem] truncate px-3 py-2 font-mono text-xs text-foreground/70 lg:table-cell">
                  {r.ip ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
