CREATE TABLE `providers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`key` text NOT NULL,
	`display_name` text NOT NULL,
	`base_url` text NOT NULL,
	`models_endpoint` text,
	`adapter_type` text NOT NULL,
	`supports_streaming` integer DEFAULT true NOT NULL,
	`supports_tools` integer DEFAULT false NOT NULL,
	`supports_vision` integer DEFAULT false NOT NULL,
	`supports_embeddings` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_provider_keys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_by` integer,
	`modified_by` integer,
	`modified_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`user_id` integer NOT NULL,
	`provider_id` integer NOT NULL,
	`encrypted_key` text NOT NULL,
	`label` text,
	`status` text DEFAULT 'healthy' NOT NULL,
	`last_checked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`modified_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `providers_key_unique` ON `providers` (`key`);--> statement-breakpoint
CREATE INDEX `user_provider_keys_created_by_idx` ON `user_provider_keys` (`created_by`);--> statement-breakpoint
CREATE INDEX `user_provider_keys_modified_by_idx` ON `user_provider_keys` (`modified_by`);--> statement-breakpoint
CREATE INDEX `user_provider_keys_user_id_idx` ON `user_provider_keys` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_provider_keys_provider_id_idx` ON `user_provider_keys` (`provider_id`);