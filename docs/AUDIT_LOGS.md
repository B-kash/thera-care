# Audit logs (FR-04)

## What is stored

Rows in `audit_logs` are **append-only** (application code creates them; no update/delete endpoints). Each row records: actor user id, action (`CREATE` / `UPDATE` / `DELETE`), entity type (patient, appointment, treatment note, exercise plan/item, progress record), entity id, optional JSON metadata (ids only — no clinical body text), client IP (truncated), user agent (truncated), timestamp.

## Who can read

`GET /audit-logs` is restricted to **`ADMIN`** in the API. Therapists and staff cannot list audit rows.

## Retention

There is **no automatic purge** in the app. For production, define a retention window (e.g. 12–24 months) and periodically archive or delete old rows via DB job or manual SQL, subject to your legal/clinical policy. Until then, treat the table as growing unbounded and monitor disk.
