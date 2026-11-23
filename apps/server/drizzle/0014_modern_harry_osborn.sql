CREATE TABLE "card_pictures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "picture_hint" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "picture_id" uuid;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "pictures_status" text DEFAULT 'none' NOT NULL;