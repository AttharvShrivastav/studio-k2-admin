CREATE TYPE "public"."contact_submission_status" AS ENUM('new', 'read');--> statement-breakpoint
CREATE TABLE "contact_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"status" "contact_submission_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"address" text NOT NULL,
	"email" text NOT NULL,
	CONSTRAINT "site_settings_singleton" CHECK ("site_settings"."id" = 1)
);
--> statement-breakpoint
INSERT INTO "site_settings" ("id", "address", "email")
VALUES (
  1,
  E'WB-53, Sch. No. 94, Next to New\nGreen Field Public School,\nNear Bombay Hospital,\nIndore-452010,M.P.',
  'contact@studiok2.co.in'
);
--> statement-breakpoint
CREATE INDEX "contact_submissions_created_at_idx" ON "contact_submissions" USING btree ("created_at");
