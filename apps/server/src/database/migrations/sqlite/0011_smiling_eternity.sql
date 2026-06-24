ALTER TABLE `user_models` ADD `provider_key_id` integer REFERENCES user_provider_keys(id);--> statement-breakpoint
CREATE INDEX `user_models_provider_key_id_idx` ON `user_models` (`provider_key_id`);--> statement-breakpoint
CREATE INDEX `user_models_user_provider_model_idx` ON `user_models` (`user_id`,`provider_key_id`,`model_id`);--> statement-breakpoint
/*
 SQLite does not support "Creating foreign key on existing column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/