import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@db/schema";

// The DATABASE_URL environment variable is set by Replit
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create a SQL client with neon
const sql = neon(connectionString);

// Create a drizzle client
export const db = drizzle(sql, { schema });