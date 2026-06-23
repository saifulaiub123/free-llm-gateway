CREATE TABLE IF NOT EXISTS "request_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" integer NOT NULL,
	"strategy_id" integer,
	"requested_model" text NOT NULL,
	"routed_provider" text,
	"routed_model" text,
	"fallback_attempts" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_estimate" double precision DEFAULT 0 NOT NULL,
	"cost_saved" double precision DEFAULT 0 NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "request_logs_user_created_idx" ON "request_logs" USING btree ("user_id","created_at");