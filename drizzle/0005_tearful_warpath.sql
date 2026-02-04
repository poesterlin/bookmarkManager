CREATE TABLE "shared_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"user_id" text,
	"token" text,
	"allow_writes" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenge_token" RENAME COLUMN "id" TO "token";--> statement-breakpoint
ALTER TABLE "challenge_token" DROP CONSTRAINT "challenge_token_unique";--> statement-breakpoint
ALTER TABLE "bookmarks" ADD COLUMN "from_share_id" text;--> statement-breakpoint
ALTER TABLE "shared_categories" ADD CONSTRAINT "shared_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "shared_categories" ADD CONSTRAINT "shared_categories_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "shared_categories" ADD CONSTRAINT "shared_categories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "no_douple_categories" ON "shared_categories" USING btree ("category_id","user_id");--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_from_share_id_shared_categories_id_fk" FOREIGN KEY ("from_share_id") REFERENCES "public"."shared_categories"("id") ON DELETE set null ON UPDATE cascade;