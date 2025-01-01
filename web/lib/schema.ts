import { pgTable, text, uuid, timestamp, index, vector, integer, foreignKey } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { db } from "./db";

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
    index("url_idx").on(table.url),
]);

export const chunks = pgTable("chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documents.id, { onDelete: 'cascade' }),
  text: text("text").notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
    index("document_idx").on(table.documentId),
    index('embeddingIndex').using('hnsw', table.embedding.op('vector_cosine_ops')),
]);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export type Chunk = typeof chunks.$inferSelect;
export type NewChunk = typeof chunks.$inferInsert;

export async function getTotalDocuments() {
  const result = await db.select({ 
    count: sql<number>`count(*)` 
  }).from(documents);
  return result[0].count;
}
