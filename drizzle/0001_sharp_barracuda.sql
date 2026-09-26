CREATE TABLE `shared_kits` (
	`id` varchar(80) NOT NULL,
	`codigo` varchar(80) NOT NULL,
	`trabajo` varchar(160) NOT NULL,
	`equipo` varchar(80) NOT NULL,
	`fingerprint` varchar(1000) NOT NULL,
	`items` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shared_kits_id` PRIMARY KEY(`id`),
	CONSTRAINT `shared_kits_codigo_unique` UNIQUE(`codigo`),
	CONSTRAINT `shared_kits_fingerprint_unique` UNIQUE(`fingerprint`)
);
