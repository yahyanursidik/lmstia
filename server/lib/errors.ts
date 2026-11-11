import type { Context } from "hono";
import { ZodError } from "zod";

/** One error shape for the whole API (09-API-ARCHITECTURE.md: consistent errors). */
export type ApiError = { error: { code: string; message: string; details?: unknown } };

export function badRequest(c: Context, e: ZodError) {
  return c.json<ApiError>(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Permintaan tidak valid.",
        details: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    },
    400,
  );
}

export function notFound(c: Context, message = "Data tidak ditemukan.") {
  return c.json<ApiError>({ error: { code: "NOT_FOUND", message } }, 404);
}

export function serverError(c: Context, err: unknown) {
  console.error("[api]", err);
  return c.json<ApiError>({ error: { code: "INTERNAL", message: "Terjadi kesalahan pada server." } }, 500);
}

/**
 * Bentrok keadaan: data sudah ada, atau permintaannya bertabrakan dengan
 * sesuatu yang sudah tercatat. Dipakai bersama oleh beberapa rute, jadi
 * tinggal di sini alih-alih diulang di tiap berkas.
 */
export function conflict(c: Context, message: string, details?: unknown) {
  return c.json<ApiError>({ error: { code: "CONFLICT", message, details } }, 409);
}

export function forbidden(c: Context, message = "Anda tidak berhak melakukan ini.") {
  return c.json<ApiError>({ error: { code: "FORBIDDEN", message } }, 403);
}

/**
 * Kode 23505 = pelanggaran indeks unik; 23514 = pelanggaran CHECK.
 * Drizzle membungkus galat driver, sehingga kodenya bisa berada di `cause`
 * dan bukan di galat terluar — memeriksa salah satunya saja akan meleset.
 */
export function kodePg(e: unknown, kode: string): boolean {
  const ambil = (v: unknown) =>
    typeof v === "object" && v !== null ? (v as { code?: string }).code : undefined;
  const sebab = typeof e === "object" && e !== null ? (e as { cause?: unknown }).cause : undefined;
  return ambil(e) === kode || ambil(sebab) === kode;
}

export const bentrokUnik = (e: unknown) => kodePg(e, "23505");
export const langgarCheck = (e: unknown) => kodePg(e, "23514");
