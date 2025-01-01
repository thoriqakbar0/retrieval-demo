import { pgTable, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { vector } from "pgvector/drizzle-orm";

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  originalContent: text("original_content").notNull(),
  chunks: text("chunks").array().notNull(),
  embeddings: vector("embeddings", { dimensions: 1536 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    urlIdx: index("url_idx").on(table.url),
    embeddingsIdx: index("embeddings_idx").on(table.embeddings),
  }
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
