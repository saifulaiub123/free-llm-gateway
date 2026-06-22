CREATE TABLE IF NOT EXISTS "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scope" text NOT NULL,
	"user_id" integer,
	"key" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "settings_scope_key_idx" ON "settings" USING btree ("scope","key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "settings_user_id_idx" ON "settings" USING btree ("user_id");