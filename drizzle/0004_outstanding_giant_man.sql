CREATE TABLE "challenge_token" (
	"id" text NOT NULL,
	"user_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "challenge_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "challenge_token" ADD CONSTRAINT "challenge_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;