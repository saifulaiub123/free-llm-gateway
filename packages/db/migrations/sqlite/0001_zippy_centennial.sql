CREATE TABLE `api_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_by` integer,
	`modified_by` integer,
	`modified_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`user_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`name` text NOT NULL,
	`prefix` text NOT NULL,
	`last_used_at` integer,
	`revoked` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`modified_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_tokens_token_hash_unique` ON `api_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `api_tokens_created_by_idx` ON `api_tokens` (`created_by`);--> statement-breakpoint
CREATE INDEX `api_tokens_modified_by_idx` ON `api_tokens` (`modified_by`);--> statement-breakpoint
CREATE INDEX `api_tokens_user_id_idx` ON `api_tokens` (`user_id`);