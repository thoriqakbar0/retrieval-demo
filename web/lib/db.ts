import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { vector } from 'drizzle-orm/pg-core';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
}); 

export const db = drizzle(pool);

export const vectorType = vector('vector', { dimensions: 1536 });
