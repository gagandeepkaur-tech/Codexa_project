import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.pgSsl ? { rejectUnauthorized: false } : false
});

// Prevent backend server crash on idle Neon connection drops
pool.on("error", (err, client) => {
  console.error("Idle database pool connection notice:", err.message);
});

export async function checkDatabaseConnection() {
  const client = await pool.connect();

  try {
    await client.query(`
      ALTER TABLE problems
      ADD COLUMN IF NOT EXISTS target_branch VARCHAR(50) DEFAULT 'ALL',
      ADD COLUMN IF NOT EXISTS target_semester VARCHAR(20) DEFAULT 'ALL',
      ADD COLUMN IF NOT EXISTS target_batch VARCHAR(50) DEFAULT 'ALL',
      ADD COLUMN IF NOT EXISTS allow_faculty_edit BOOLEAN NOT NULL DEFAULT TRUE;
    `);
    await client.query(`
      ALTER TABLE courses
      ADD COLUMN IF NOT EXISTS roster_restricted BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS program VARCHAR(120) NOT NULL DEFAULT '';
    `);
    const result = await client.query("SELECT NOW() AS current_time");
    return result.rows[0];
  } finally {
    client.release();
  }
}

