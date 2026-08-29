/**
 * Drops every object in the public schema, then lets migrations rebuild it.
 * Development only — refuses to run when NODE_ENV=production.
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

if (process.env.NODE_ENV === "production") {
  console.error("Ditolak: reset skema tidak boleh dijalankan di production.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL!);

const main = async () => {
  await sql`DROP SCHEMA public CASCADE`;
  await sql`CREATE SCHEMA public`;
  await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
  console.log("Skema public dikosongkan.");
};

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
