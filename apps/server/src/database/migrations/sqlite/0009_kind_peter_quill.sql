CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`scope` text NOT NULL,
	`user_id` integer,
	`key` text NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `settings_scope_key_idx` ON `settings` (`scope`,`key`);--> statement-breakpoint
CREATE INDEX `settings_user_id_idx` ON `settings` (`user_id`);