CREATE TABLE "chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid,
	"text" text NOT NULL,
	"embedding" vector(1536),
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "embeddingIndex";--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_idx" ON "chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "embeddingIndex" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "chunk";--> statement-breakpoint
ALTER TABLE "documents" DROP COLUMN "embeddings";