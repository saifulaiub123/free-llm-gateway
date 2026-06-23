CREATE TABLE `request_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`user_id` integer NOT NULL,
	`strategy_id` integer,
	`requested_model` text NOT NULL,
	`routed_provider` text,
	`routed_model` text,
	`fallback_attempts` integer DEFAULT 0 NOT NULL,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`cost_estimate` real DEFAULT 0 NOT NULL,
	`cost_saved` real DEFAULT 0 NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `request_logs_user_created_idx` ON `request_logs` (`user_id`,`created_at`);