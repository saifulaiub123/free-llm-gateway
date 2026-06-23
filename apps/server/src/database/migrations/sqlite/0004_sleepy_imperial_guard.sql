CREATE TABLE `user_models` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_by` integer,
	`modified_by` integer,
	`modified_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`user_id` integer NOT NULL,
	`model_id` integer,
	`custom_provider_id` integer,
	`enabled` integer DEFAULT true NOT NULL,
	`is_custom` integer DEFAULT false NOT NULL,
	`overrides` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`model_id`) REFERENCES `models`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`custom_provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`modified_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `user_models_created_by_idx` ON `user_models` (`created_by`);--> statement-breakpoint
CREATE INDEX `user_models_modified_by_idx` ON `user_models` (`modified_by`);--> statement-breakpoint
CREATE INDEX `user_models_user_id_idx` ON `user_models` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_models_model_id_idx` ON `user_models` (`model_id`);