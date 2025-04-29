CREATE UNIQUE INDEX "bookmark_tags_unique_idx" ON "bookmark_tags" USING btree ("bookmark_id","tag_id");--> statement-breakpoint
CREATE INDEX "bookmark_tags_bookmark_id_idx" ON "bookmark_tags" USING btree ("bookmark_id");--> statement-breakpoint
CREATE INDEX "bookmark_tags_tag_id_idx" ON "bookmark_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "bookmarks_composite" ON "bookmarks" USING btree ("user_id","deleted_at","category","is_favorite");--> statement-breakpoint
CREATE INDEX "bookmarks_user_id_idx" ON "bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bookmarks_category_idx" ON "bookmarks" USING btree ("category");--> statement-breakpoint
CREATE INDEX "bookmarks_deleted_at_idx" ON "bookmarks" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "bookmarks_is_favorite_idx" ON "bookmarks" USING btree ("is_favorite");--> statement-breakpoint
CREATE INDEX "categories_user_id_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "categories_name_idx" ON "categories" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_id_name_unique_idx" ON "categories" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tags_user_id_idx" ON "tags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tags_name_idx" ON "tags" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_id_name_unique_idx" ON "tags" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_idx" ON "user" USING btree ("email");