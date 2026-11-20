CREATE TABLE "kai_scripts" (
	"language" text PRIMARY KEY NOT NULL,
	"lines" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
