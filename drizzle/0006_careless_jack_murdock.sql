DROP INDEX "categories_user_id_name_unique_idx";--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "parent_id" text;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_id_name_parent_unique_idx" ON "categories" USING btree ("user_id","name","parent_id");