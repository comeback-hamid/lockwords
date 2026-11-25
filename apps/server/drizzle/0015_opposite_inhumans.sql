CREATE TABLE "widget_plans" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"slots" jsonb NOT NULL,
	"looks" jsonb NOT NULL,
	"counted_until" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "widget_plans" ADD CONSTRAINT "widget_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;