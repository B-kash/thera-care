-- CreateEnum
CREATE TYPE "EmailAuthTokenPurpose" AS ENUM ('PASSWORD_RESET', 'MAGIC_LINK');

-- CreateTable
CREATE TABLE "email_auth_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "purpose" "EmailAuthTokenPurpose" NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_auth_tokens_user_id_purpose_idx" ON "email_auth_tokens"("user_id", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "email_auth_tokens_token_hash_key" ON "email_auth_tokens"("token_hash");

-- AddForeignKey
ALTER TABLE "email_auth_tokens" ADD CONSTRAINT "email_auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
