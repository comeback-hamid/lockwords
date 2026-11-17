-- Rows saved before the links existed may point to a user with no row. Make those user rows first (as guests).
INSERT INTO "users" ("id", "is_guest") SELECT "user_id", true FROM "profiles" ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "users" ("id", "is_guest") SELECT DISTINCT "user_id", true FROM "decks" ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "decks" ADD CONSTRAINT "decks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;