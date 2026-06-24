ALTER TABLE "user_models" ADD COLUMN "provider_key_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_models" ADD CONSTRAINT "user_models_provider_key_id_user_provider_keys_id_fk" FOREIGN KEY ("provider_key_id") REFERENCES "public"."user_provider_keys"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_models_provider_key_id_idx" ON "user_models" USING btree ("provider_key_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_models_user_provider_model_idx" ON "user_models" USING btree ("user_id","provider_key_id","model_id");