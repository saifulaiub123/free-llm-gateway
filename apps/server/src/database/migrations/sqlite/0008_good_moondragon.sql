CREATE TABLE `routing_strategies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_by` integer,
	`modified_by` integer,
	`modified_at` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`config` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`modified_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `strategy_model_order` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`strategy_id` integer NOT NULL,
	`user_model_id` integer NOT NULL,
	`position` integer NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`strategy_id`) REFERENCES `routing_strategies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `routing_strategies_created_by_idx` ON `routing_strategies` (`created_by`);--> statement-breakpoint
CREATE INDEX `routing_strategies_modified_by_idx` ON `routing_strategies` (`modified_by`);--> statement-breakpoint
CREATE INDEX `routing_strategies_user_id_idx` ON `routing_strategies` (`user_id`);--> statement-breakpoint
CREATE INDEX `strategy_model_order_strategy_id_idx` ON `strategy_model_order` (`strategy_id`);