CREATE TABLE "homepage_config" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"spotlight_config" jsonb DEFAULT '{"slots":[{"projectId":"","desktop":{"src":"","alt":"","focalPosition":"center"}},{"projectId":"","desktop":{"src":"","alt":"","focalPosition":"center"}},{"projectId":"","desktop":{"src":"","alt":"","focalPosition":"center"}},{"projectId":"","desktop":{"src":"","alt":"","focalPosition":"center"}}]}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "homepage_config_singleton" CHECK ("homepage_config"."id" = 1)
);
