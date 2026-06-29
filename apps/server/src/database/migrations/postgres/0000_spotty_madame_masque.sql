CREATE TABLE IF NOT EXISTS "free_llm"."flm_api_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"modified_by" integer,
	"modified_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked" boolean DEFAULT false NOT NULL,
	CONSTRAINT "flm_api_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "free_llm"."flm_app_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"level" text NOT NULL,
	"status_code" integer,
	"message" text NOT NULL,
	"stack" text,
	"method" text,
	"url" text,
	"user_id" integer,
	"metadata" text,
	"resolved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "free_llm"."flm_cooldowns" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"key_id" integer,
	"model_id" integer,
	"until" timestamp with time zone NOT NULL,
	"reason" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "free_llm"."flm_model_runtime_stats" (
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
CREATE TABLE IF NOT EXISTS "free_llm"."flm_models" (
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
CREATE TABLE IF NOT EXISTS "free_llm"."flm_providers" (
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
	CONSTRAINT "flm_providers_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "free_llm"."flm_rate_limit_counters" (
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
CREATE TABLE IF NOT EXISTS "free_llm"."flm_refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"family_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"replaced_by_token_id" integer,
	"created_by_ip" text,
	"user_agent" text,
	CONSTRAINT "flm_refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "free_llm"."flm_request_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" integer NOT NULL,
	"strategy_id" integer,
	"provider_key_id" integer,
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
CREATE TABLE IF NOT EXISTS "free_llm"."flm_routing_strategies" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"modified_by" integer,
	"modified_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"config" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "free_llm"."flm_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scope" text NOT NULL,
	"user_id" integer,
	"key" text NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "free_llm"."flm_strategy_model_order" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"strategy_id" integer NOT NULL,
	"user_model_id" integer NOT NULL,
	"position" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "free_llm"."flm_user_models" (
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
	"provider_key_id" integer,
	"enabled" boolean DEFAULT true NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"overrides" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "free_llm"."flm_user_provider_keys" (
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
CREATE TABLE IF NOT EXISTS "free_llm"."flm_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"modified_by" integer,
	"modified_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	CONSTRAINT "flm_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_api_tokens" ADD CONSTRAINT "flm_api_tokens_user_id_flm_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "free_llm"."flm_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_api_tokens" ADD CONSTRAINT "api_tokens_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "free_llm"."flm_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_api_tokens" ADD CONSTRAINT "api_tokens_modified_by_fk" FOREIGN KEY ("modified_by") REFERENCES "free_llm"."flm_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_models" ADD CONSTRAINT "flm_models_provider_id_flm_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "free_llm"."flm_providers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_refresh_tokens" ADD CONSTRAINT "flm_refresh_tokens_user_id_flm_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "free_llm"."flm_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_routing_strategies" ADD CONSTRAINT "flm_routing_strategies_user_id_flm_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "free_llm"."flm_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_routing_strategies" ADD CONSTRAINT "routing_strategies_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "free_llm"."flm_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_routing_strategies" ADD CONSTRAINT "routing_strategies_modified_by_fk" FOREIGN KEY ("modified_by") REFERENCES "free_llm"."flm_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_strategy_model_order" ADD CONSTRAINT "flm_strategy_model_order_strategy_id_flm_routing_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "free_llm"."flm_routing_strategies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_user_models" ADD CONSTRAINT "flm_user_models_user_id_flm_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "free_llm"."flm_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_user_models" ADD CONSTRAINT "flm_user_models_model_id_flm_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "free_llm"."flm_models"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_user_models" ADD CONSTRAINT "flm_user_models_custom_provider_id_flm_providers_id_fk" FOREIGN KEY ("custom_provider_id") REFERENCES "free_llm"."flm_providers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_user_models" ADD CONSTRAINT "flm_user_models_provider_key_id_flm_user_provider_keys_id_fk" FOREIGN KEY ("provider_key_id") REFERENCES "free_llm"."flm_user_provider_keys"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_user_models" ADD CONSTRAINT "user_models_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "free_llm"."flm_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_user_models" ADD CONSTRAINT "user_models_modified_by_fk" FOREIGN KEY ("modified_by") REFERENCES "free_llm"."flm_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_user_provider_keys" ADD CONSTRAINT "flm_user_provider_keys_user_id_flm_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "free_llm"."flm_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_user_provider_keys" ADD CONSTRAINT "flm_user_provider_keys_provider_id_flm_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "free_llm"."flm_providers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_user_provider_keys" ADD CONSTRAINT "user_provider_keys_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "free_llm"."flm_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_user_provider_keys" ADD CONSTRAINT "user_provider_keys_modified_by_fk" FOREIGN KEY ("modified_by") REFERENCES "free_llm"."flm_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_users" ADD CONSTRAINT "users_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "free_llm"."flm_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "free_llm"."flm_users" ADD CONSTRAINT "users_modified_by_fk" FOREIGN KEY ("modified_by") REFERENCES "free_llm"."flm_users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_tokens_created_by_idx" ON "free_llm"."flm_api_tokens" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_tokens_modified_by_idx" ON "free_llm"."flm_api_tokens" USING btree ("modified_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_tokens_user_id_idx" ON "free_llm"."flm_api_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "app_logs_level_created_idx" ON "free_llm"."flm_app_logs" USING btree ("level","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cooldowns_key_id_idx" ON "free_llm"."flm_cooldowns" USING btree ("key_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cooldowns_model_id_idx" ON "free_llm"."flm_cooldowns" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "model_runtime_stats_user_model_idx" ON "free_llm"."flm_model_runtime_stats" USING btree ("user_id","model_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "models_provider_model_idx" ON "free_llm"."flm_models" USING btree ("provider_id","model_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rate_limit_counters_scope_idx" ON "free_llm"."flm_rate_limit_counters" USING btree ("user_id","key_id","model_id","window");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "free_llm"."flm_refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refresh_tokens_family_id_idx" ON "free_llm"."flm_refresh_tokens" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "request_logs_user_created_idx" ON "free_llm"."flm_request_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "routing_strategies_created_by_idx" ON "free_llm"."flm_routing_strategies" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "routing_strategies_modified_by_idx" ON "free_llm"."flm_routing_strategies" USING btree ("modified_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "routing_strategies_user_id_idx" ON "free_llm"."flm_routing_strategies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "settings_scope_key_idx" ON "free_llm"."flm_settings" USING btree ("scope","key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "settings_user_id_idx" ON "free_llm"."flm_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "strategy_model_order_strategy_id_idx" ON "free_llm"."flm_strategy_model_order" USING btree ("strategy_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_models_created_by_idx" ON "free_llm"."flm_user_models" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_models_modified_by_idx" ON "free_llm"."flm_user_models" USING btree ("modified_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_models_user_id_idx" ON "free_llm"."flm_user_models" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_models_model_id_idx" ON "free_llm"."flm_user_models" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_models_provider_key_id_idx" ON "free_llm"."flm_user_models" USING btree ("provider_key_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_models_user_provider_model_idx" ON "free_llm"."flm_user_models" USING btree ("user_id","provider_key_id","model_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_provider_keys_created_by_idx" ON "free_llm"."flm_user_provider_keys" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_provider_keys_modified_by_idx" ON "free_llm"."flm_user_provider_keys" USING btree ("modified_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_provider_keys_user_id_idx" ON "free_llm"."flm_user_provider_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_provider_keys_provider_id_idx" ON "free_llm"."flm_user_provider_keys" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_created_by_idx" ON "free_llm"."flm_users" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_modified_by_idx" ON "free_llm"."flm_users" USING btree ("modified_by");