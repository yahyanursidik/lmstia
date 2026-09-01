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

/* --- Pendaftaran mandiri: akun + pendaftaran + enrol sekaligus ------ */

export type DaftarMandiri = {
  formId: string;
  tahapanId: string | null;
  name: string;
  email: string;
  passwordHash: string;
  phone: string;
  gender: "ikhwan" | "akhwat";
  country: string | null;
  province: string | null;
  city: string | null;
  education: string | null;
  segment: string | null;
  reason: string | null;
  commitmentSnapshot: string;
};

/**
 * Membuat akun, mencatat pendaftaran, dan mendaftarkan peserta ke caturwulan
 * berjalan — dalam SATU pernyataan.
 *
 * Driver Neon berbasis HTTP tidak mendukung transaksi antar-pernyataan, jadi
 * menulisnya bertahap membuka kemungkinan keadaan separuh jadi: akun tanpa
 * pendaftaran, atau pendaftaran tanpa enrol. Satu pernyataan dengan CTE
 * atomik menurut definisinya, sehingga tidak ada keadaan antara yang perlu
 * dibersihkan manual.
 *
 * Enrol dilewati bila program belum punya caturwulan berjalan; akun dan
 * pendaftarannya tetap terbentuk, dan admin dapat mendaftarkannya kemudian.
 */
export async function daftarMandiri(d: DaftarMandiri) {
  const enrol = d.tahapanId
    ? sql`, enrol AS (
        INSERT INTO enrollments (user_id, tahapan_id, status)
        SELECT id, ${d.tahapanId}, 'registered' FROM pengguna
        RETURNING id
      )`
    : sql``;

  const hasil = await db.execute(sql`
    WITH pengguna AS (
      INSERT INTO users
        (name, email, role, password_hash, phone, country, province, city,
         education, segment, account_status, is_demo)
      VALUES
        (${d.name}, ${d.email}, 'student', ${d.passwordHash}, ${d.phone},
         ${d.country}, ${d.province}, ${d.city},
         ${d.education}::education_level, ${d.segment}, 'aktif', false)
      RETURNING id
    ),
    pendaftaran AS (
      INSERT INTO registrations
        (form_id, name, email, phone, gender, country, province, city,
         education, segment, reason, commitment_agreed, commitment_snapshot,
         user_id, status)
      SELECT ${d.formId}, ${d.name}, ${d.email}, ${d.phone}, ${d.gender}::gender,
             ${d.country}, ${d.province}, ${d.city}, ${d.education}::education_level,
             ${d.segment}, ${d.reason}, true, ${d.commitmentSnapshot},
             id, 'disetujui'
      FROM pengguna
      RETURNING id
    )${enrol}
    SELECT id AS user_id FROM pengguna
  `);

  const baris = (hasil as unknown as { rows?: { user_id: string }[] }).rows ??
    (hasil as unknown as { user_id: string }[]);
  return baris[0]?.user_id ?? null;
}

/** Caturwulan berjalan pada satu program — tujuan enrol otomatis. */
export const tahapanBerjalan = async (programId: string) => {
  const [row] = await db
    .select({ id: s.tahapan.id })
    .from(s.tahapan)
    .where(and(eq(s.tahapan.programId, programId), eq(s.tahapan.status, "running")))
    .limit(1);
  return row?.id ?? null;
};

/* --- Persetujuan oleh admin ---------------------------------------- */

export type HasilPersetujuan = {
  userId: string;
  akunBaru: boolean;
  enrolBaru: boolean;
};

/**
 * Menyetujui satu pendaftaran: memastikan pendaftar punya akun dan terdaftar
 * pada caturwulan berjalan.
 *
 * Sebelumnya persetujuan hanya membalik kolom status, sehingga pendaftar yang
 * "disetujui" tetap tidak punya akun dan tidak muncul di mana pun. Di sini
 * ketiganya — akun, enrolmen, dan status — ditulis dalam SATU pernyataan,
 * karena driver Neon berbasis HTTP tidak mendukung transaksi.
 *
 * Aman dipanggil berulang: akun dibuat hanya bila emailnya belum terpakai,
 * dan enrolmen memakai ON CONFLICT sehingga klik kedua tidak menggandakan
 * apa pun.
 */
export async function setujuiPendaftaran(
  registrationId: string,
  tahapanId: string | null,
  aktorId: string,
  passwordHash: string,
  catatan: string | null,
): Promise<HasilPersetujuan | null> {
  const hasil = await db.execute(sql`
    WITH p AS (
      SELECT * FROM registrations WHERE id = ${registrationId}
    ),
    /* Akun dibuat hanya bila email pendaftar belum dipakai siapa pun. Bila
       sudah ada, pendaftaran ini disambungkan ke akun tersebut. */
    akun_baru AS (
      INSERT INTO users
        (name, email, role, password_hash, phone, country, province, city,
         education, segment, account_status, is_demo)
      SELECT p.name, p.email, 'student', ${passwordHash}, p.phone,
             p.country, p.province, p.city, p.education, p.segment, 'aktif', false
      FROM p
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.email = p.email)
      RETURNING id
    ),
    /* Tepat satu baris: CTE membaca snapshot sebelum sisipan di atas, jadi
       kedua cabang tidak pernah menghasilkan baris bersamaan. */
    akun AS (
      SELECT id FROM akun_baru
      UNION ALL
      SELECT u.id FROM users u JOIN p ON p.email = u.email
    ),
    enrol AS (
      INSERT INTO enrollments (user_id, tahapan_id, status)
      SELECT (SELECT id FROM akun), ${tahapanId}::uuid, 'registered'
      WHERE ${tahapanId}::uuid IS NOT NULL
      ON CONFLICT (user_id, tahapan_id) DO NOTHING
      RETURNING id
    ),
    ubah AS (
      UPDATE registrations SET
        status = 'disetujui',
        user_id = (SELECT id FROM akun),
        note = ${catatan},
        reviewed_at = now(),
        reviewed_by = ${aktorId}
      WHERE id = ${registrationId}
      RETURNING id
    )
    SELECT (SELECT id FROM akun) AS user_id,
           EXISTS (SELECT 1 FROM akun_baru) AS akun_baru,
           EXISTS (SELECT 1 FROM enrol) AS enrol_baru,
           EXISTS (SELECT 1 FROM ubah) AS ada
  `);

  const baris = (hasil as unknown as { rows?: Record<string, unknown>[] }).rows ??
    (hasil as unknown as Record<string, unknown>[]);
  const r = baris[0];
  if (!r || !r.ada || !r.user_id) return null;
  return {
    userId: String(r.user_id),
    akunBaru: r.akun_baru === true,
    enrolBaru: r.enrol_baru === true,
  };
}
