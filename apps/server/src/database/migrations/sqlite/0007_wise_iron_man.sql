CREATE TABLE `model_runtime_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`user_id` integer NOT NULL,
	`model_id` integer NOT NULL,
	`success_count` integer DEFAULT 0 NOT NULL,
	`failure_count` integer DEFAULT 0 NOT NULL,
	`avg_latency_ms` real DEFAULT 0 NOT NULL,
	`last_success_at` integer,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `model_runtime_stats_user_model_idx` ON `model_runtime_stats` (`user_id`,`model_id`);