import { Hono } from "hono";
import { badRequest, notFound } from "../lib/errors";
import { ADMIN, requireRole } from "../middleware/auth";
import * as reg from "../repositories/registration";
import * as learner from "../repositories/learner";
import { uuidParam } from "../validators/schemas";
import {
  formBody,
  formPatchBody,
  registrationBody,
  registrationListQuery,
  registrationPatchBody,
} from "../validators/registration";

const conflict = (c: Parameters<typeof notFound>[0], message: string) =>
  c.json({ error: { code: "CONFLICT", message } }, 409);

const tutup = (c: Parameters<typeof notFound>[0], message: string) =>
  c.json({ error: { code: "REGISTRATION_CLOSED", message } }, 409);

/** Kode 23505 = pelanggaran indeks unik; Drizzle menaruhnya di `cause`. */
function bentrokUnik(e: unknown): boolean {
  const kode = (v: unknown) =>
    typeof v === "object" && v !== null ? (v as { code?: string }).code : undefined;
  const sebab = typeof e === "object" && e !== null ? (e as { cause?: unknown }).cause : undefined;
  return kode(e) === "23505" || kode(sebab) === "23505";
}

/**
 * Apakah formulir sedang menerima kiriman.
 *
 * Dihitung di server dan tidak pernah dipercayakan ke tampilan: status terbit
 * saja tidak cukup, rentang waktunya juga harus sedang berjalan.
 */
function sedangDibuka(f: { status: string; opensAt: Date | null; closesAt: Date | null }) {
  if (f.status !== "terbit") return { buka: false, alasan: "Pendaftaran belum dibuka." };
  const kini = Date.now();
  if (f.opensAt && kini < f.opensAt.getTime()) {
    return { buka: false, alasan: "Pendaftaran belum dibuka." };
  }
  if (f.closesAt && kini > f.closesAt.getTime()) {
    return { buka: false, alasan: "Pendaftaran sudah ditutup." };
  }
  return { buka: true, alasan: "" };
}

/* --- Publik --------------------------------------------------------- */

export const daftarRoutes = new Hono();

/** Daftar program yang pendaftarannya terbit — untuk halaman /daftar. */
daftarRoutes.get("/", async (c) => {
  const rows = await reg.listPublicForms();
  return c.json({
    data: rows.map((f) => ({ ...f, ...sedangDibuka(f) })),
  });
});

daftarRoutes.get("/:slug", async (c) => {
  const [form] = await reg.findPublicFormBySlug(c.req.param("slug"));
  if (!form || form.status === "draf") return notFound(c, "Formulir pendaftaran tidak ditemukan.");
  return c.json({ data: { ...form, ...sedangDibuka(form) } });
});

daftarRoutes.post("/:slug", async (c) => {
  const [form] = await reg.findPublicFormBySlug(c.req.param("slug"));
  if (!form || form.status === "draf") return notFound(c, "Formulir pendaftaran tidak ditemukan.");

  const keadaan = sedangDibuka(form);
  if (!keadaan.buka) return tutup(c, keadaan.alasan);

  const p = registrationBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);

  try {
    await reg.createRegistration({
      ...p.data,
      formId: form.id,
      /* Bunyi pernyataan disimpan apa adanya: teksnya bisa berubah nanti,
       * sedangkan yang disetujui pendaftar adalah versi hari ini. */
      commitmentSnapshot: form.commitmentText,
    });
  } catch (e) {
    if (bentrokUnik(e)) {
      return conflict(c, "Email ini sudah terdaftar pada program tersebut.");
    }
    throw e;
  }

  /*
   * Tautan grup baru diberikan di sini — setelah kiriman benar-benar tercatat.
   * Hanya tautan yang sesuai jenis kelamin pendaftar yang dikirim.
   */
  const penuh = await reg.findForm(form.id);
  const tautanGrup = p.data.gender === "ikhwan" ? penuh?.waIkhwanUrl : penuh?.waAkhwatUrl;

  return c.json(
    {
      data: {
        ok: true,
        gender: p.data.gender,
        programName: form.programName,
        tautanGrup: tautanGrup ?? null,
      },
    },
    201,
  );
});

/* --- Admin ---------------------------------------------------------- */

export const registrationAdminRoutes = new Hono().use("*", requireRole(...ADMIN));

registrationAdminRoutes.get("/forms", async (c) => c.json({ data: await reg.listForms() }));

registrationAdminRoutes.post("/forms", async (c) => {
  const p = formBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  try {
    const [row] = await reg.createForm(p.data);
    await learner.writeAudit(c.get("user")!.id, "registration_form.create", "registration_form", row.id);
    return c.json({ data: row }, 201);
  } catch (e) {
    if (bentrokUnik(e)) return conflict(c, "Tautan itu sudah dipakai formulir lain.");
    throw e;
  }
});

registrationAdminRoutes.patch("/forms/:id", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);

  const p = formPatchBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);

  /*
   * Rentang waktu diperiksa terhadap gabungan nilai lama dan baru: mengubah
   * satu ujung saja tetap bisa membuat rentangnya terbalik.
   */
  const lama = await reg.findForm(id.data.id);
  if (!lama) return notFound(c, "Formulir tidak ditemukan.");
  const buka = p.data.opensAt !== undefined ? p.data.opensAt : lama.opensAt;
  const tutupPada = p.data.closesAt !== undefined ? p.data.closesAt : lama.closesAt;
  if (buka && tutupPada && tutupPada <= buka) {
    return badRequest(c, {
      issues: [{ path: ["closesAt"], message: "Waktu tutup harus setelah waktu buka" }],
    } as never);
  }

  try {
    const [row] = await reg.updateForm(id.data.id, p.data);
    await learner.writeAudit(c.get("user")!.id, "registration_form.update", "registration_form", row.id);
    return c.json({ data: row });
  } catch (e) {
    if (bentrokUnik(e)) return conflict(c, "Tautan itu sudah dipakai formulir lain.");
    throw e;
  }
});

registrationAdminRoutes.delete("/forms/:id", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);
  const [row] = await reg.deleteForm(id.data.id);
  if (!row) return notFound(c, "Formulir tidak ditemukan.");
  await learner.writeAudit(c.get("user")!.id, "registration_form.delete", "registration_form", id.data.id);
  return c.body(null, 204);
});

registrationAdminRoutes.get("/", async (c) => {
  const p = registrationListQuery.safeParse(c.req.query());
  if (!p.success) return badRequest(c, p.error);
  const { page, perPage, ...filter } = p.data;
  const { rows, total } = await reg.listRegistrationsPaged(filter, page, perPage);
  return c.json({
    data: rows,
    meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
  });
});

registrationAdminRoutes.get("/rekap", async (c) => {
  const formId = c.req.query("formId");
  return c.json({ data: await reg.registrationCounts(formId || undefined) });
});

registrationAdminRoutes.get("/:id", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);
  const [row] = await reg.findRegistration(id.data.id);
  return row ? c.json({ data: row }) : notFound(c, "Pendaftaran tidak ditemukan.");
});

registrationAdminRoutes.patch("/:id", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);

  const p = registrationPatchBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);

  const aktor = c.get("user")!;
  const [row] = await reg.updateRegistration(id.data.id, {
    ...p.data,
    ...(p.data.status ? { reviewedAt: new Date(), reviewedBy: aktor.id } : {}),
  });
  if (!row) return notFound(c, "Pendaftaran tidak ditemukan.");
  await learner.writeAudit(aktor.id, "registration.review", "registration", row.id);
  return c.json({ data: row });
});

registrationAdminRoutes.delete("/:id", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);
  const [row] = await reg.deleteRegistration(id.data.id);
  if (!row) return notFound(c, "Pendaftaran tidak ditemukan.");
  await learner.writeAudit(c.get("user")!.id, "registration.delete", "registration", id.data.id);
  return c.body(null, 204);
});
