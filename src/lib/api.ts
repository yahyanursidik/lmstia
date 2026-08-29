/**
 * Thin fetch wrapper for the TIA API.
 *
 * The browser holds only an opaque bearer token — never a role, never database
 * credentials. Every authorization decision happens server-side.
 */

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8787/api/v1";
const TOKEN_KEY = "tia.session";

export type ApiErrorShape = { code: string; message: string; details?: unknown };

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(status: number, e: ApiErrorShape) {
    super(e.message);
    this.name = "ApiError";
    this.status = status;
    this.code = e.code;
    this.details = e.details;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode — session lives in memory for this tab only */
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    // Network-level failure: the API is probably not running.
    throw new ApiError(0, {
      code: "NETWORK",
      message: "Tidak dapat terhubung ke server. Pastikan API berjalan (npm run api).",
    });
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error ?? { code: "UNKNOWN", message: "Terjadi kesalahan yang tidak diketahui." },
    );
  }
  return body?.data as T;
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) =>
    request<T>(p, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(p: string, body?: unknown) =>
    request<T>(p, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(p: string) => request<T>(p, { method: "DELETE" }),
};
