CREATE TABLE `records` (`id` text PRIMARY KEY NOT NULL, `value` text NOT NULL);
--> statement-breakpoint
CREATE TABLE `sessions` (`id` text PRIMARY KEY NOT NULL, `name` text NOT NULL, `expires` integer NOT NULL);
