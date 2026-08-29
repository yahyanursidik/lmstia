import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL belum diset. Salin .env.example menjadi .env lalu isi connection string Neon.",
  );
}

// neon-http keeps this serverless-friendly; the browser never sees this module.
export const db = drizzle(neon(url), { schema });
export { schema };
