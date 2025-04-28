CREATE TABLE IF NOT EXISTS "bookmark_tags" (
	"bookmark_id" text NOT NULL,
	"tag_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bookmarks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"favicon" text,
	"theme" text,
	"category" text,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tags" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"created_at" timestamp with time zone NOT NULL,
	"last_login" timestamp with time zone,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookmark_tags_bookmark_id_bookmarks_id_fk') THEN
        ALTER TABLE "bookmark_tags" ADD CONSTRAINT "bookmark_tags_bookmark_id_bookmarks_id_fk" 
        FOREIGN KEY ("bookmark_id") REFERENCES "public"."bookmarks"("id") 
        ON DELETE cascade ON UPDATE cascade;
    END IF;
END
$$; --> statement-breakpoint

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookmark_tags_tag_id_tags_id_fk') THEN
        ALTER TABLE "bookmark_tags" ADD CONSTRAINT "bookmark_tags_tag_id_tags_id_fk" 
        FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") 
        ON DELETE cascade ON UPDATE cascade;
    END IF;
END
$$; --> statement-breakpoint

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookmarks_category_categories_id_fk') THEN
        ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_category_categories_id_fk" 
        FOREIGN KEY ("category") REFERENCES "public"."categories"("id") 
        ON DELETE cascade ON UPDATE cascade;
    END IF;
END
$$; --> statement-breakpoint

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookmarks_user_id_user_id_fk') THEN
        ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") 
        ON DELETE cascade ON UPDATE cascade;
    END IF;
END
$$; --> statement-breakpoint

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_user_id_user_id_fk') THEN
        ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") 
        ON DELETE cascade ON UPDATE cascade;
    END IF;
END
$$; --> statement-breakpoint

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_user_id_user_id_fk') THEN
        ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") 
        ON DELETE cascade ON UPDATE cascade;
    END IF;
END
$$; --> statement-breakpoint

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tags_user_id_user_id_fk') THEN
        ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") 
        ON DELETE cascade ON UPDATE cascade;
    END IF;
END
$$;
