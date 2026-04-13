-- Default tenant for single-clinic backfill (stable id for migrations / scripts).
-- Login/register use tenantSlug "default" unless another slug is introduced.

CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

INSERT INTO "tenants" ("id", "name", "slug", "created_at", "updated_at")
VALUES (
    '00000000-0000-4000-8000-000000000001',
    'Default clinic',
    'default',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

ALTER TABLE "users" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "patients" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "appointments" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "treatment_notes" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "exercise_plans" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "exercise_items" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "progress_records" ADD COLUMN "tenant_id" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN "tenant_id" TEXT;

UPDATE "users" SET "tenant_id" = '00000000-0000-4000-8000-000000000001';

UPDATE "patients" SET "tenant_id" = COALESCE(
    (SELECT "u"."tenant_id" FROM "users" AS "u" WHERE "u"."id" = "patients"."created_by_user_id"),
    '00000000-0000-4000-8000-000000000001'
);

UPDATE "appointments" SET "tenant_id" = (
    SELECT "p"."tenant_id" FROM "patients" AS "p" WHERE "p"."id" = "appointments"."patient_id"
);

UPDATE "treatment_notes" SET "tenant_id" = (
    SELECT "p"."tenant_id" FROM "patients" AS "p" WHERE "p"."id" = "treatment_notes"."patient_id"
);

UPDATE "exercise_plans" SET "tenant_id" = (
    SELECT "p"."tenant_id" FROM "patients" AS "p" WHERE "p"."id" = "exercise_plans"."patient_id"
);

UPDATE "exercise_items" SET "tenant_id" = (
    SELECT "ep"."tenant_id" FROM "exercise_plans" AS "ep" WHERE "ep"."id" = "exercise_items"."exercise_plan_id"
);

UPDATE "progress_records" SET "tenant_id" = (
    SELECT "p"."tenant_id" FROM "patients" AS "p" WHERE "p"."id" = "progress_records"."patient_id"
);

DROP INDEX IF EXISTS "progress_records_patient_id_recorded_on_idx";

UPDATE "audit_logs" SET "tenant_id" = (
    SELECT "u"."tenant_id" FROM "users" AS "u" WHERE "u"."id" = "audit_logs"."actor_user_id"
);

ALTER TABLE "users" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "patients" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "appointments" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "treatment_notes" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "exercise_plans" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "exercise_items" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "progress_records" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "tenant_id" SET NOT NULL;

ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "patients" ADD CONSTRAINT "patients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "treatment_notes" ADD CONSTRAINT "treatment_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exercise_plans" ADD CONSTRAINT "exercise_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exercise_items" ADD CONSTRAINT "exercise_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "progress_records" ADD CONSTRAINT "progress_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX IF EXISTS "users_email_key";

CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

CREATE INDEX "patients_tenant_id_idx" ON "patients"("tenant_id");
CREATE INDEX "patients_tenant_id_created_at_idx" ON "patients"("tenant_id", "created_at");

CREATE INDEX "appointments_tenant_id_idx" ON "appointments"("tenant_id");
CREATE INDEX "appointments_tenant_id_starts_at_idx" ON "appointments"("tenant_id", "starts_at");

CREATE INDEX "treatment_notes_tenant_id_idx" ON "treatment_notes"("tenant_id");
CREATE INDEX "treatment_notes_tenant_id_created_at_idx" ON "treatment_notes"("tenant_id", "created_at");

CREATE INDEX "exercise_plans_tenant_id_idx" ON "exercise_plans"("tenant_id");

CREATE INDEX "exercise_items_tenant_id_idx" ON "exercise_items"("tenant_id");

CREATE INDEX "progress_records_tenant_id_idx" ON "progress_records"("tenant_id");
CREATE INDEX "progress_records_tenant_id_patient_id_recorded_on_idx" ON "progress_records"("tenant_id", "patient_id", "recorded_on");

CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at" DESC);
