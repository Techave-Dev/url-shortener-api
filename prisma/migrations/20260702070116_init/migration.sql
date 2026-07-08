-- CreateTable
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" BIGSERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "urls" (
    "id" BIGSERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "original_url" TEXT NOT NULL,
    "user_id" BIGINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "urls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "click_events" (
    "id" BIGSERIAL NOT NULL,
    "url_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT NOT NULL DEFAULT 'direct',
    "user_agent" TEXT NOT NULL,

    CONSTRAINT "click_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "urls_slug_key" ON "urls"("slug");

-- CreateIndex
CREATE INDEX "urls_slug_idx" ON "urls"("slug");

-- CreateIndex
CREATE INDEX "click_events_url_id_idx" ON "click_events"("url_id");

-- CreateIndex
CREATE INDEX "click_events_created_at_idx" ON "click_events"("created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "urls" ADD CONSTRAINT "urls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "click_events" ADD CONSTRAINT "click_events_url_id_fkey" FOREIGN KEY ("url_id") REFERENCES "urls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
