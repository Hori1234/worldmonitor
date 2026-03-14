CREATE TABLE `news_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`title` text NOT NULL,
	`content` text,
	`published_at` integer NOT NULL,
	`read` integer DEFAULT false,
	`saved_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `object_states` (
	`key` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trade_data` (
	`id` text PRIMARY KEY NOT NULL,
	`region` text NOT NULL,
	`commodity` text NOT NULL,
	`volume` integer NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`last_updated` integer NOT NULL
);
