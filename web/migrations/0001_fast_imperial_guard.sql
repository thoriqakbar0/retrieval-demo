ALTER TABLE "documents" RENAME COLUMN "embedding" TO "embeddings";--> statement-breakpoint
DROP INDEX "embeddingIndex";--> statement-breakpoint
CREATE INDEX "embeddingIndex" ON "documents" USING hnsw ("embeddings" vector_cosine_ops);