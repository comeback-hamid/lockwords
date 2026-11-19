ALTER TABLE "decks" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'topic' NOT NULL;--> statement-breakpoint
ALTER TABLE "kai_messages" ADD COLUMN IF NOT EXISTS "word" jsonb;