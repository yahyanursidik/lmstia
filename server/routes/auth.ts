import { Hono } from "hono";
import { z } from "zod";
import { badRequest } from "../lib/errors";
import { requireAuth } from "../middleware/auth";
import { authenticate, createSession, destroySession } from "../services/auth";
import * as learner from "../repositories/learner";
import {
  alamatPemanggil,
  bersihkanPercobaan,
  catatPercobaanMasuk,
  sapuBerkala,
} from "../services/ratelimit";

const loginBody = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi").max(200),
});

export const authRoutes = new Hono();

authRoutes.post("/login", async (c) => {
  const parsed = loginBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(c, parsed.error);

  const { email, password } = parsed.data;
  const ip = alamatPemanggil((n) => c.req.header(n));

  await sapuBerkala();
  const batas = await catatPercobaanMasuk(ip, email);
  if (batas.ditolak) {
    const menit = Math.ceil(batas.sisaDetik / 60);
    return c.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `Terlalu banyak percobaan masuk. Coba lagi dalam ${menit} menit.`,
        },
      },
      429,
      { "Retry-After": String(batas.sisaDetik) },
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

  await bersihkanPercobaan(ip, email);
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
