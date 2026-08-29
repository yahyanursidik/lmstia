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
