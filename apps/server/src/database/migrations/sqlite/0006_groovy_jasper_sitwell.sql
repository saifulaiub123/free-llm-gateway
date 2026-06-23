CREATE TABLE `cooldowns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`key_id` integer,
	`model_id` integer,
	`until` integer NOT NULL,
	`reason` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `cooldowns_key_id_idx` ON `cooldowns` (`key_id`);--> statement-breakpoint
CREATE INDEX `cooldowns_model_id_idx` ON `cooldowns` (`model_id`);