CREATE TABLE IF NOT EXISTS "cooldowns" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"key_id" integer,
	"model_id" integer,
	"until" timestamp with time zone NOT NULL,
	"reason" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cooldowns_key_id_idx" ON "cooldowns" USING btree ("key_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cooldowns_model_id_idx" ON "cooldowns" USING btree ("model_id");