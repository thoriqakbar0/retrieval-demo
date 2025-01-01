import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { vector } from 'pgvector/drizzle-orm';

// Create the connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize Drizzle ORM
export const db = drizzle(pool);

// Define vector type for pgvector
export const vectorType = vector('vector');
