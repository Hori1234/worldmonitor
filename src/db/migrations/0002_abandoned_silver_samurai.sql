CREATE TABLE `opensky_plane_positions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`icao24` text NOT NULL,
	`time_position` integer,
	`last_contact` integer NOT NULL,
	`longitude` real,
	`latitude` real,
	`baro_altitude` real,
	`on_ground` integer NOT NULL,
	`velocity` real,
	`true_track` real,
	`vertical_rate` real,
	`sensors` text,
	`geo_altitude` real,
	`squawk` text,
	`spi` integer NOT NULL,
	`position_source` integer NOT NULL,
	`category` integer NOT NULL,
	FOREIGN KEY (`icao24`) REFERENCES `opensky_planes`(`icao24`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `opensky_planes` (
	`icao24` text PRIMARY KEY NOT NULL,
	`callsign` text,
	`origin_country` text NOT NULL,
	`counter_hits` integer DEFAULT 0 NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
