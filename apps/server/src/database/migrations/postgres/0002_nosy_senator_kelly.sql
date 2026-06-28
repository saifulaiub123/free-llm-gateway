CREATE TABLE IF NOT EXISTS "providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"key" text NOT NULL,
	"display_name" text NOT NULL,
	"base_url" text NOT NULL,
	"models_endpoint" text,
	"adapter_type" text NOT NULL,
	"supports_streaming" boolean DEFAULT true NOT NULL,
	"supports_tools" boolean DEFAULT false NOT NULL,
	"supports_vision" boolean DEFAULT false NOT NULL,
	"supports_embeddings" boolean DEFAULT false NOT NULL,
	CONSTRAINT "providers_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_provider_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"modified_by" integer,
	"modified_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"user_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"encrypted_key" text NOT NULL,
	"label" text,
	"status" text DEFAULT 'healthy' NOT NULL,
	"last_checked_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_provider_keys" ADD CONSTRAINT "user_provider_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_provider_keys" ADD CONSTRAINT "user_provider_keys_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_provider_keys" ADD CONSTRAINT "user_provider_keys_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_provider_keys" ADD CONSTRAINT "user_provider_keys_modified_by_fk" FOREIGN KEY ("modified_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_provider_keys_created_by_idx" ON "user_provider_keys" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_provider_keys_modified_by_idx" ON "user_provider_keys" USING btree ("modified_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_provider_keys_user_id_idx" ON "user_provider_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_provider_keys_provider_id_idx" ON "user_provider_keys" USING btree ("provider_id");