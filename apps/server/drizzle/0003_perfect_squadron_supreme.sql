ALTER TABLE "cards" ADD COLUMN "due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "known" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "hard" boolean DEFAULT false NOT NULL;