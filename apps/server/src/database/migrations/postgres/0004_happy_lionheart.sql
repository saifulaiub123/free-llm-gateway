CREATE TABLE IF NOT EXISTS "user_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"modified_by" integer,
	"modified_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"user_id" integer NOT NULL,
	"model_id" integer,
	"custom_provider_id" integer,
	"enabled" boolean DEFAULT true NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"overrides" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_models" ADD CONSTRAINT "user_models_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_models" ADD CONSTRAINT "user_models_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_models" ADD CONSTRAINT "user_models_custom_provider_id_providers_id_fk" FOREIGN KEY ("custom_provider_id") REFERENCES "providers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_models" ADD CONSTRAINT "user_models_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_models" ADD CONSTRAINT "user_models_modified_by_fk" FOREIGN KEY ("modified_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_models_created_by_idx" ON "user_models" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_models_modified_by_idx" ON "user_models" USING btree ("modified_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_models_user_id_idx" ON "user_models" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_models_model_id_idx" ON "user_models" USING btree ("model_id");