import { Hono } from "hono";
import { z } from "zod";
import { badRequest } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { authenticate, createSession, destroySession } from "../services/auth";
import * as learner from "../repositories/learner";

const loginBody = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi").max(200),
});

/**
 * Simple in-memory rate limit on the login endpoint (10-AUTH-RBAC.md:
 * "Rate limit endpoint auth"). Per-process only — a multi-instance deploy
 * needs Redis or the platform's own limiter.
 */
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { n: number; resetAt: number }>();

function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now > rec.resetAt) {
    attempts.set(key, { n: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.n += 1;
  return rec.n > MAX_ATTEMPTS;
}

function clearAttempts(key: string) {
  attempts.delete(key);
}

export const authRoutes = new Hono();

authRoutes.post("/login", async (c) => {
  const parsed = loginBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(c, parsed.error);

  const { email, password } = parsed.data;
  const key = `${c.req.header("x-forwarded-for") ?? "local"}:${email.toLowerCase()}`;

  if (tooManyAttempts(key)) {
    return c.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Terlalu banyak percobaan masuk. Coba lagi dalam beberapa menit.",
        },
      },
      429,
    );
  }

  const user = await authenticate(email, password);
  if (!user) {
    // Same message for unknown email and wrong password — no account enumeration.
    return c.json(
      { error: { code: "INVALID_CREDENTIALS", message: "Email atau kata sandi salah." } },
      401,
    );
  }

  clearAttempts(key);
  const { token, expiresAt } = await createSession(user.id);
  await learner.writeAudit(user.id, "auth.login", "user", user.id);

  return c.json({ data: { token, expiresAt, user } });
});

authRoutes.post("/logout", requireAuth(), async (c) => {
  const token = c.get("token");
  const user = c.get("user")!;
  if (token) await destroySession(token);
  await learner.writeAudit(user.id, "auth.logout", "user", user.id);
  return c.body(null, 204);
});

/** Used by the client on boot to re-hydrate a stored session. */
authRoutes.get("/me", requireAuth(), (c) => c.json({ data: c.get("user") }));
