CREATE TABLE IF NOT EXISTS "models" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"provider_id" integer NOT NULL,
	"model_id" text NOT NULL,
	"display_name" text NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"intelligence_score" double precision DEFAULT 0 NOT NULL,
	"speed_tier" text DEFAULT 'medium' NOT NULL,
	"input_cost_per_1m" double precision DEFAULT 0 NOT NULL,
	"output_cost_per_1m" double precision DEFAULT 0 NOT NULL,
	"context_window" integer,
	"capabilities" text NOT NULL,
	"stability_baseline" double precision DEFAULT 0.9 NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "models" ADD CONSTRAINT "models_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "models_provider_model_idx" ON "models" USING btree ("provider_id","model_id");