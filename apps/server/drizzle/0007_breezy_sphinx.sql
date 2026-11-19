ALTER TABLE "decks" ADD COLUMN "title_translation" text;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN "word_count" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "kai_messages" ADD COLUMN "deck_ids" uuid[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "kai_messages" ADD COLUMN "ready_deck_id" uuid;