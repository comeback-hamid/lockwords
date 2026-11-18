CREATE TABLE "word_packs" (
	"language" text PRIMARY KEY NOT NULL,
	"pages" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "word_test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"language" text NOT NULL,
	"version" integer NOT NULL,
	"words" integer NOT NULL,
	"raw" integer NOT NULL,
	"lo" integer NOT NULL,
	"hi" integer NOT NULL,
	"r50" integer NOT NULL,
	"g" real NOT NULL,
	"real_known" integer NOT NULL,
	"fakes" integer NOT NULL,
	"fn" integer NOT NULL,
	"pages" text NOT NULL,
	"reliable" boolean NOT NULL,
	"ticks" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "word_test_results" ADD CONSTRAINT "word_test_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;