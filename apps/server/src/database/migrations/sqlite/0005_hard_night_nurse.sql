CREATE TABLE `rate_limit_counters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`user_id` integer NOT NULL,
	`provider_id` integer NOT NULL,
	`model_id` integer NOT NULL,
	`key_id` integer NOT NULL,
	`window` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`window_start` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limit_counters_scope_idx` ON `rate_limit_counters` (`user_id`,`key_id`,`model_id`,`window`);