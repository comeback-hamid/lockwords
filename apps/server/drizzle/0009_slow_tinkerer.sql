ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "removed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "decks" ADD COLUMN IF NOT EXISTS "removed_at" timestamp with time zone;