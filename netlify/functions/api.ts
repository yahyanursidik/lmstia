import type { Config, Context } from "@netlify/functions";
import app from "../../server/app";

/**
 * API TIA sebagai Netlify Function.
 *
 * Netlify hanya menyajikan berkas statis; app Hono perlu tempat berjalan.
 * Fungsi ini memakai app yang sama persis dengan pengembangan lokal, jadi
 * tidak ada rute yang terduplikasi atau berbeda perilaku antar-lingkungan.
 *
 * Neon diakses lewat driver HTTP (`@neondatabase/serverless`), yang memang
 * dirancang untuk lingkungan serverless tanpa koneksi persisten.
 */
export default async function handler(request: Request, _context: Context) {
  const url = new URL(request.url);

  /*
   * Netlify meneruskan permintaan ke path fungsinya. Hono memakai
   * basePath `/api/v1`, jadi awalan path fungsi dikembalikan ke `/api`
   * sebelum diserahkan — supaya pencocokan rute identik dengan lokal.
   */
  const prefix = "/.netlify/functions/api";
  if (url.pathname.startsWith(prefix)) {
    url.pathname = "/api" + url.pathname.slice(prefix.length);
  }

  return app.fetch(new Request(url, request));
}

export const config: Config = {
  // Semua jalur /api/* ditangani di sini, tanpa perlu aturan redirect terpisah.
  path: "/api/*",
};
