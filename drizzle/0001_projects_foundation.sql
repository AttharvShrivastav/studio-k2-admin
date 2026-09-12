CREATE TYPE "public"."project_category" AS ENUM('built', 'unbuilt');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."project_template_type" AS ENUM('template-1', 'template-2', 'template-3', 'template-4');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"category" "project_category" NOT NULL,
	"status" "project_status" DEFAULT 'active' NOT NULL,
	"template_type" "project_template_type" NOT NULL,
	"location" text,
	"area" text,
	"year" text,
	"browser_order" integer DEFAULT 0 NOT NULL,
	"browser_image" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"hero" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"theme_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"template_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"gallery_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"footer_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"seo_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "projects_browser_order_non_negative" CHECK ("projects"."browser_order" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_unique" ON "projects" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "projects_status_browser_order_idx" ON "projects" USING btree ("status","browser_order");