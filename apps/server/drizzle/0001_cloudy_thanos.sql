CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"learning_language" text NOT NULL,
	"native_language" text NOT NULL,
	"level" text NOT NULL,
	"known_words" integer,
	"cefr" text,
	"goal" text NOT NULL,
	"goal_other" text,
	"interests" text[] NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
