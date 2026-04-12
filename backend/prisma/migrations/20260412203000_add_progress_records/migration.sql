-- CreateTable
CREATE TABLE "progress_records" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "pain_level" INTEGER NOT NULL,
    "mobility_score" INTEGER,
    "notes" TEXT,
    "recorded_on" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "progress_records_patient_id_recorded_on_idx" ON "progress_records"("patient_id", "recorded_on");

-- AddForeignKey
ALTER TABLE "progress_records" ADD CONSTRAINT "progress_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_records" ADD CONSTRAINT "progress_records_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
