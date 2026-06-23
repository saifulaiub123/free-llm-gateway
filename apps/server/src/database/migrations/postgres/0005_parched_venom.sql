CREATE TABLE IF NOT EXISTS "rate_limit_counters" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"model_id" integer NOT NULL,
	"key_id" integer NOT NULL,
	"window" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limit_counters_scope_idx" ON "rate_limit_counters" USING btree ("user_id","key_id","model_id","window");