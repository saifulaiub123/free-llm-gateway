CREATE TABLE IF NOT EXISTS "model_runtime_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" integer NOT NULL,
	"model_id" integer NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"avg_latency_ms" double precision DEFAULT 0 NOT NULL,
	"last_success_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "model_runtime_stats_user_model_idx" ON "model_runtime_stats" USING btree ("user_id","model_id");