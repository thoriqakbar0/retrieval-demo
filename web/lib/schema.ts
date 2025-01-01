import { pgTable, text, uuid, timestamp, index, vector } from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  originalContent: text("original_content").notNull(),
  chunks: text("chunks").array().notNull(),
  embeddings: vector('embeddings', { dimensions: 1536 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
    index("url_idx").on(table.url),
    index('embeddingIndex').using('hnsw', table.embeddings.op('vector_cosine_ops')),
]);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
