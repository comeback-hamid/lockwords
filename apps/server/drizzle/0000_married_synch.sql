CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"is_guest" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
