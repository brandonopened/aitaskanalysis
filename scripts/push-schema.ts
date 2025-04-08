import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "../db/schema";
import { Client } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be set");
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();

  const db = drizzle(client, { schema });

  console.log("Creating tables...");

  // Create tables if they don't exist
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      description TEXT NOT NULL,
      priority VARCHAR(10) NOT NULL DEFAULT 'medium',
      ai_potential VARCHAR(20) NOT NULL DEFAULT 'pending',
      estimated_minutes INTEGER,
      estimated_minutes_with_ai INTEGER,
      coaching_tips TEXT,
      motivational_score INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      is_default BOOLEAN NOT NULL DEFAULT FALSE
    );
  `);

  console.log("Tables created successfully!");
  await client.end();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});