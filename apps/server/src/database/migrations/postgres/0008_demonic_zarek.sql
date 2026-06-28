CREATE TABLE IF NOT EXISTS "routing_strategies" (
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
CREATE TABLE IF NOT EXISTS "strategy_model_order" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"strategy_id" integer NOT NULL,
	"user_model_id" integer NOT NULL,
	"position" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "routing_strategies" ADD CONSTRAINT "routing_strategies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "routing_strategies" ADD CONSTRAINT "routing_strategies_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "routing_strategies" ADD CONSTRAINT "routing_strategies_modified_by_fk" FOREIGN KEY ("modified_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "strategy_model_order" ADD CONSTRAINT "strategy_model_order_strategy_id_routing_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "routing_strategies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "routing_strategies_created_by_idx" ON "routing_strategies" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "routing_strategies_modified_by_idx" ON "routing_strategies" USING btree ("modified_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "routing_strategies_user_id_idx" ON "routing_strategies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "strategy_model_order_strategy_id_idx" ON "strategy_model_order" USING btree ("strategy_id");