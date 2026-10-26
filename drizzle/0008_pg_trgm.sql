-- search uses similarity() / word_similarity() and levenshtein_less_equal()
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
