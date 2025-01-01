import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { vector } from 'drizzle-orm/pg-core';

console.log('Environment Variables:');
console.log('POSTGRES_URL:', process.env.POSTGRES_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('API_URL:', process.env.API_URL);

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
}); 

export const db = drizzle(pool);

export const vectorType = vector('vector', { dimensions: 1536 });
