-- CreateTable
CREATE TABLE "exercise_plans" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "author_user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_items" (
    "id" TEXT NOT NULL,
    "exercise_plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instructions" TEXT,
    "sets" INTEGER,
    "reps" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "exercise_plans" ADD CONSTRAINT "exercise_plans_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_plans" ADD CONSTRAINT "exercise_plans_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_items" ADD CONSTRAINT "exercise_items_exercise_plan_id_fkey" FOREIGN KEY ("exercise_plan_id") REFERENCES "exercise_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
