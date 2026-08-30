/**
 * Titik masuk pengembangan lokal: menjalankan app Hono sebagai proses Node.
 * Di produksi, app yang sama dilayani lewat `netlify/functions/api.ts`.
 */
import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./app";

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`TIA API berjalan di http://localhost:${info.port}/api/v1`);
});
