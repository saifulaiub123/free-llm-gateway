CREATE TABLE `models` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`provider_id` integer NOT NULL,
	`model_id` text NOT NULL,
	`display_name` text NOT NULL,
	`is_free` integer DEFAULT false NOT NULL,
	`intelligence_score` real DEFAULT 0 NOT NULL,
	`speed_tier` text DEFAULT 'medium' NOT NULL,
	`input_cost_per_1m` real DEFAULT 0 NOT NULL,
	`output_cost_per_1m` real DEFAULT 0 NOT NULL,
	`context_window` integer,
	`capabilities` text NOT NULL,
	`stability_baseline` real DEFAULT 0.9 NOT NULL,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `models_provider_model_idx` ON `models` (`provider_id`,`model_id`);