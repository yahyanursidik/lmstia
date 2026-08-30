import { Hono } from "hono";
import { badRequest, notFound } from "../lib/errors";
import { ADMIN, requireRole } from "../middleware/auth";
import * as learner from "../repositories/learner";
import { uuidParam } from "../validators/schemas";
import { suggestQuery, userListQuery, userPatchBody } from "../validators/users";

/**
 * Manajemen pengguna.
 *
 * Seluruh rute di sini memaparkan data pribadi peserta — nomor WhatsApp,
 * domisili, pendidikan. Karena itu aksesnya dibatasi ke academic_admin dan
 * super_admin saja; pengajar tidak termasuk (10-AUTH-RBAC.md).
 */
export const userRoutes = new Hono().use("*", requireRole(...ADMIN));

const forbidden = (c: Parameters<typeof notFound>[0], message: string) =>
  c.json({ error: { code: "FORBIDDEN", message } }, 403);

const conflict = (c: Parameters<typeof notFound>[0], message: string) =>
  c.json({ error: { code: "CONFLICT", message } }, 409);

/**
 * Postgres menandai pelanggaran indeks unik dengan kode 23505. Drizzle
 * membungkus galat driver dalam `DrizzleQueryError`, sehingga kode aslinya
 * berada di `cause` — keduanya diperiksa agar tidak bergantung pada versi.
 */
function emailBentrok(e: unknown): boolean {
  const kode = (v: unknown) =>
    typeof v === "object" && v !== null ? (v as { code?: string }).code : undefined;
  const sebab = typeof e === "object" && e !== null ? (e as { cause?: unknown }).cause : undefined;
  return kode(e) === "23505" || kode(sebab) === "23505";
}

userRoutes.get("/", async (c) => {
  const p = userListQuery.safeParse(c.req.query());
  if (!p.success) return badRequest(c, p.error);

  const { page, perPage, ...filter } = p.data;
  const { rows, total } = await learner.listUsersPaged(filter, page, perPage);

  return c.json({
    data: rows,
    meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
  });
});

/** Saran untuk kotak pencarian; sengaja ringkas dan tanpa data pribadi. */
userRoutes.get("/suggest", async (c) => {
  const p = suggestQuery.safeParse(c.req.query());
  if (!p.success) return badRequest(c, p.error);
  return c.json({ data: await learner.suggestUsers(p.data.q, p.data.limit) });
});

userRoutes.get("/:id", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);

  const [user] = await learner.findUserDetail(id.data.id);
  if (!user) return notFound(c, "Pengguna tidak ditemukan.");

  return c.json({ data: { ...user, enrollments: await learner.listUserEnrollments(user.id) } });
});

userRoutes.patch("/:id", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);

  const p = userPatchBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);

  const aktor = c.get("user")!;
  const [target] = await learner.findUserDetail(id.data.id);
  if (!target) return notFound(c, "Pengguna tidak ditemukan.");

  const { role, accountStatus } = p.data;

  /*
   * Hanya super admin yang boleh menyentuh peran super admin — baik memberi
   * maupun mencabut. Tanpa aturan ini, seorang academic_admin dapat menaikkan
   * dirinya sendiri dan seluruh pembatasan peran menjadi tidak berarti.
   */
  if (aktor.role !== "super_admin" && (role === "super_admin" || target.role === "super_admin")) {
    return forbidden(c, "Hanya super admin yang dapat mengubah peran super admin.");
  }

  /* Super admin aktif terakhir harus tetap ada, kalau tidak portal terkunci. */
  const menurunkan = role !== undefined && role !== "super_admin";
  const menonaktifkan = accountStatus !== undefined && accountStatus !== "aktif";
  if (
    target.role === "super_admin" &&
    target.accountStatus === "aktif" &&
    (menurunkan || menonaktifkan) &&
    (await learner.countSuperAdmins()) <= 1
  ) {
    return conflict(c, "Ini super admin aktif terakhir; peran dan statusnya tidak dapat diubah.");
  }

  if (aktor.id === target.id && menonaktifkan) {
    return forbidden(c, "Anda tidak dapat menonaktifkan akun Anda sendiri.");
  }

  try {
    const [row] = await learner.updateUser(id.data.id, p.data);
    await learner.writeAudit(aktor.id, "user.update", "user", id.data.id);
    return c.json({ data: row });
  } catch (e) {
    if (emailBentrok(e)) return conflict(c, "Alamat email itu sudah dipakai pengguna lain.");
    throw e;
  }
});

userRoutes.delete("/:id", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);

  const aktor = c.get("user")!;
  if (aktor.id === id.data.id) return forbidden(c, "Anda tidak dapat menghapus akun Anda sendiri.");

  const [target] = await learner.findUserDetail(id.data.id);
  if (!target) return notFound(c, "Pengguna tidak ditemukan.");

  if (target.role === "super_admin" && aktor.role !== "super_admin") {
    return forbidden(c, "Hanya super admin yang dapat menghapus super admin.");
  }
  if (target.role === "super_admin" && (await learner.countSuperAdmins()) <= 1) {
    return conflict(c, "Ini super admin aktif terakhir dan tidak dapat dihapus.");
  }

  /*
   * Menghapus pengguna ikut menghapus pendaftaran, progres materi, dan nilai
   * miliknya lewat ON DELETE CASCADE. Konfirmasi dilakukan di sisi klien.
   */
  await learner.deleteUser(id.data.id);
  await learner.writeAudit(aktor.id, "user.delete", "user", id.data.id);
  return c.body(null, 204);
});
