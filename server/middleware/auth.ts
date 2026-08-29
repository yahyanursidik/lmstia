import type { Context, Next } from "hono";
import { resolveSession, type SessionUser } from "../services/auth";
import type { Role } from "../validators/schemas";

/**
 * Authorization is decided here, on the server (10-AUTH-RBAC.md).
 *
 * The client sends only an opaque bearer token. The role is read from the
 * user's database row on every request — never from the request itself — so a
 * forged header cannot escalate privileges.
 */

export type AuthUser = SessionUser;

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser | null;
    token: string | null;
  }
}

function bearer(c: Context): string | null {
  const h = c.req.header("authorization");
  if (!h) return null;
  const [scheme, value] = h.split(" ");
  return scheme?.toLowerCase() === "bearer" && value ? value : null;
}

export async function identify(c: Context, next: Next) {
  const token = bearer(c);
  c.set("token", token);
  c.set("user", token ? await resolveSession(token) : null);
  return next();
}

export function requireAuth() {
  return async (c: Context, next: Next) => {
    if (!c.get("user")) {
      return c.json(
        { error: { code: "UNAUTHORIZED", message: "Sesi tidak valid atau sudah berakhir. Silakan masuk kembali." } },
        401,
      );
    }
    return next();
  };
}

export function requireRole(...allowed: Role[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    if (!user) {
      return c.json(
        { error: { code: "UNAUTHORIZED", message: "Sesi tidak valid atau sudah berakhir. Silakan masuk kembali." } },
        401,
      );
    }
    if (!allowed.includes(user.role)) {
      return c.json(
        { error: { code: "FORBIDDEN", message: "Peran Anda tidak memiliki akses ke sumber daya ini." } },
        403,
      );
    }
    return next();
  };
}

export const STAFF: Role[] = ["instructor", "academic_admin", "super_admin"];
export const ADMIN: Role[] = ["academic_admin", "super_admin"];
