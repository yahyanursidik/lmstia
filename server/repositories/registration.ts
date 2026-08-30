import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db/client";
import * as s from "../db/schema";

/** Repository pendaftaran: formulir per program dan kiriman pendaftar. */

/**
 * Kolom formulir yang aman dibaca publik.
 *
 * `waIkhwanUrl` dan `waAkhwatUrl` sengaja TIDAK ada di sini. Tautan undangan
 * grup adalah imbalan setelah mendaftar; bila ikut pada konfigurasi publik,
 * siapa pun dapat memanennya tanpa pernah mengisi formulir.
 */
const kolomPublik = {
  id: s.registrationForms.id,
  slug: s.registrationForms.slug,
  title: s.registrationForms.title,
  headline: s.registrationForms.headline,
  description: s.registrationForms.description,
  commitmentText: s.registrationForms.commitmentText,
  opensAt: s.registrationForms.opensAt,
  closesAt: s.registrationForms.closesAt,
  status: s.registrationForms.status,
  programId: s.registrationForms.programId,
  programName: s.programs.name,
};

/* --- Formulir ------------------------------------------------------ */

export const listForms = () =>
  db
    .select({
      id: s.registrationForms.id,
      programId: s.registrationForms.programId,
      programName: s.programs.name,
      slug: s.registrationForms.slug,
      title: s.registrationForms.title,
      headline: s.registrationForms.headline,
      description: s.registrationForms.description,
      commitmentText: s.registrationForms.commitmentText,
      waIkhwanUrl: s.registrationForms.waIkhwanUrl,
      waAkhwatUrl: s.registrationForms.waAkhwatUrl,
      opensAt: s.registrationForms.opensAt,
      closesAt: s.registrationForms.closesAt,
      status: s.registrationForms.status,
      pendaftar: sql<number>`(
        select count(*) from ${s.registrations}
        where ${s.registrations.formId} = ${s.registrationForms.id}
      )::int`,
    })
    .from(s.registrationForms)
    .innerJoin(s.programs, eq(s.programs.id, s.registrationForms.programId))
    .orderBy(desc(s.registrationForms.createdAt));

export const findForm = (id: string) =>
  db.query.registrationForms.findFirst({ where: eq(s.registrationForms.id, id) });

/** Formulir untuk halaman publik — tanpa tautan grup. */
export const findPublicFormBySlug = (slug: string) =>
  db
    .select(kolomPublik)
    .from(s.registrationForms)
    .innerJoin(s.programs, eq(s.programs.id, s.registrationForms.programId))
    .where(eq(s.registrationForms.slug, slug));

/** Formulir yang tautannya boleh dibuka publik. */
export const listPublicForms = () =>
  db
    .select(kolomPublik)
    .from(s.registrationForms)
    .innerJoin(s.programs, eq(s.programs.id, s.registrationForms.programId))
    .where(eq(s.registrationForms.status, "terbit"))
    .orderBy(desc(s.registrationForms.createdAt));

export const createForm = (v: typeof s.registrationForms.$inferInsert) =>
  db.insert(s.registrationForms).values(v).returning();

export const updateForm = (id: string, v: Partial<typeof s.registrationForms.$inferInsert>) =>
  db
    .update(s.registrationForms)
    .set({ ...v, updatedAt: new Date() })
    .where(eq(s.registrationForms.id, id))
    .returning();

export const deleteForm = (id: string) =>
  db.delete(s.registrationForms).where(eq(s.registrationForms.id, id)).returning({ id: s.registrationForms.id });

/* --- Kiriman pendaftaran ------------------------------------------- */

export const createRegistration = (v: typeof s.registrations.$inferInsert) =>
  db.insert(s.registrations).values(v).returning({ id: s.registrations.id });

export type FilterPendaftaran = {
  formId?: string;
  programId?: string;
  status?: "menunggu" | "disetujui" | "ditolak";
  gender?: "ikhwan" | "akhwat";
  q?: string;
};

function syarat(f: FilterPendaftaran) {
  const w = [];
  if (f.formId) w.push(eq(s.registrations.formId, f.formId));
  if (f.programId) w.push(eq(s.registrationForms.programId, f.programId));
  if (f.status) w.push(eq(s.registrations.status, f.status));
  if (f.gender) w.push(eq(s.registrations.gender, f.gender));

  const q = f.q?.trim();
  if (q) {
    const pola = `%${q.replace(/[%_\\]/g, (m) => "\\" + m)}%`;
    w.push(
      or(
        ilike(s.registrations.name, pola),
        ilike(s.registrations.email, pola),
        ilike(s.registrations.phone, pola),
        ilike(s.registrations.city, pola),
      )!,
    );
  }
  return w.length ? and(...w) : undefined;
}

const kolomPendaftar = {
  id: s.registrations.id,
  formId: s.registrations.formId,
  formTitle: s.registrationForms.title,
  programName: s.programs.name,
  name: s.registrations.name,
  email: s.registrations.email,
  phone: s.registrations.phone,
  gender: s.registrations.gender,
  country: s.registrations.country,
  province: s.registrations.province,
  city: s.registrations.city,
  education: s.registrations.education,
  segment: s.registrations.segment,
  reason: s.registrations.reason,
  commitmentAgreed: s.registrations.commitmentAgreed,
  status: s.registrations.status,
  note: s.registrations.note,
  userId: s.registrations.userId,
  submittedAt: s.registrations.submittedAt,
  reviewedAt: s.registrations.reviewedAt,
};

export async function listRegistrationsPaged(f: FilterPendaftaran, page: number, perPage: number) {
  const where = syarat(f);
  const dasar = () =>
    db
      .select(kolomPendaftar)
      .from(s.registrations)
      .innerJoin(s.registrationForms, eq(s.registrationForms.id, s.registrations.formId))
      .innerJoin(s.programs, eq(s.programs.id, s.registrationForms.programId));

  const [rows, [{ total }]] = await Promise.all([
    dasar()
      .where(where)
      .orderBy(desc(s.registrations.submittedAt))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(s.registrations)
      .innerJoin(s.registrationForms, eq(s.registrationForms.id, s.registrations.formId))
      .where(where),
  ]);
  return { rows, total };
}

export const findRegistration = (id: string) =>
  db
    .select(kolomPendaftar)
    .from(s.registrations)
    .innerJoin(s.registrationForms, eq(s.registrationForms.id, s.registrations.formId))
    .innerJoin(s.programs, eq(s.programs.id, s.registrationForms.programId))
    .where(eq(s.registrations.id, id));

export const updateRegistration = (
  id: string,
  v: Partial<typeof s.registrations.$inferInsert>,
) => db.update(s.registrations).set(v).where(eq(s.registrations.id, id)).returning({ id: s.registrations.id });

export const deleteRegistration = (id: string) =>
  db.delete(s.registrations).where(eq(s.registrations.id, id)).returning({ id: s.registrations.id });

/** Rekap per status untuk satu formulir, dipakai di kartu ringkasan admin. */
export const registrationCounts = (formId?: string) =>
  db
    .select({
      status: s.registrations.status,
      gender: s.registrations.gender,
      n: sql<number>`count(*)::int`,
    })
    .from(s.registrations)
    .where(formId ? eq(s.registrations.formId, formId) : undefined)
    .groupBy(s.registrations.status, s.registrations.gender);
