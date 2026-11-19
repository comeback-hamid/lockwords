ALTER TABLE "decks" ADD COLUMN IF NOT EXISTS "title_translation" text;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN IF NOT EXISTS "word_count" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "kai_messages" ADD COLUMN IF NOT EXISTS "deck_ids" uuid[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "kai_messages" ADD COLUMN IF NOT EXISTS "ready_deck_id" uuid;