import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL in .env");
}

export const pool = new Pool({
  connectionString: databaseUrl,
});

export async function query<T = any>(text: string, params?: any[]) {
  return pool.query<T>(text, params);
}
