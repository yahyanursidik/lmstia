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
  /* Harga ikut publik — itu yang dipakai pendaftar memutuskan. Nomor
     rekening TIDAK, sama alasannya dengan tautan grup: ia diberikan setelah
     pendaftaran tercatat, bukan dipajang untuk dipanen. */
  isPaid: s.registrationForms.isPaid,
  feeAmount: s.registrationForms.feeAmount,
  paymentDueDays: s.registrationForms.paymentDueDays,
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
      isPaid: s.registrationForms.isPaid,
      feeAmount: s.registrationForms.feeAmount,
      bankName: s.registrationForms.bankName,
      bankAccountNumber: s.registrationForms.bankAccountNumber,
      bankAccountHolder: s.registrationForms.bankAccountHolder,
      paymentNote: s.registrationForms.paymentNote,
      paymentDueDays: s.registrationForms.paymentDueDays,
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
  paymentStatus: s.registrations.paymentStatus,
  feeAmount: s.registrations.feeAmount,
  paymentNote: s.registrations.paymentNote,
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
  /** Disalin dari formulir saat mendaftar; null untuk program gratis. */
  feeAmount: number | null;
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
         user_id, status, fee_amount, payment_status)
      SELECT ${d.formId}, ${d.name}, ${d.email}, ${d.phone}, ${d.gender}::gender,
             ${d.country}, ${d.province}, ${d.city}, ${d.education}::education_level,
             ${d.segment}, ${d.reason}, true, ${d.commitmentSnapshot},
             id, 'disetujui', ${d.feeAmount},
             /* Program gratis langsung 'dibebaskan': tidak ada yang perlu
                ditagih, dan membiarkannya 'belum_bayar' akan membuat rekap
                menampilkan tunggakan yang tidak pernah ada. */
             (CASE WHEN ${d.feeAmount}::int IS NULL THEN 'dibebaskan' ELSE 'belum_bayar' END)::payment_status
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
        /* Biaya disalin dari formulir hanya bila belum pernah terisi:
           pendaftaran lama dibuat sebelum ada kolom ini, sedangkan yang baru
           sudah membawa angka yang disepakati saat mendaftar. */
        fee_amount = COALESCE(fee_amount, (
          SELECT f.fee_amount FROM registration_forms f
          WHERE f.id = (SELECT form_id FROM p) AND f.is_paid
        )),
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

/* --- Pembayaran ----------------------------------------------------- */

/** Bukti transfer terakhir satu pendaftaran, beserta data berkasnya. */
export const buktiTerakhir = (registrationId: string) =>
  db
    .select({
      id: s.paymentProofs.id,
      fileName: s.paymentProofs.fileName,
      contentType: s.paymentProofs.contentType,
      sizeBytes: s.paymentProofs.sizeBytes,
      storage: s.paymentProofs.storage,
      dataBase64: s.paymentProofs.dataBase64,
      objectKey: s.paymentProofs.objectKey,
      uploadedAt: s.paymentProofs.uploadedAt,
    })
    .from(s.paymentProofs)
    .where(eq(s.paymentProofs.registrationId, registrationId))
    .orderBy(desc(s.paymentProofs.uploadedAt))
    .limit(1);

/**
 * Mencatat bukti transfer dan menaikkan status pendaftaran sekaligus.
 *
 * Satu pernyataan: unggahan yang tercatat tanpa status yang ikut berubah
 * akan terlihat seperti belum membayar, dan pendaftar tidak punya cara
 * mengetahui bahwa berkasnya sudah sampai.
 *
 * Bukti lama dihapus, bukan ditumpuk. Yang berlaku selalu kiriman terakhir,
 * dan menyimpan seluruh percobaan hanya membuat basis data membengkak oleh
 * berkas yang tidak akan pernah dilihat siapa pun.
 */
export async function simpanBukti(v: {
  registrationId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  storage: string;
  dataBase64: string | null;
  objectKey: string | null;
}) {
  const hasil = await db.execute(sql`
    WITH buang AS (
      DELETE FROM payment_proofs WHERE registration_id = ${v.registrationId}
    ),
    simpan AS (
      INSERT INTO payment_proofs
        (registration_id, file_name, content_type, size_bytes, storage, data_base64, object_key)
      VALUES (${v.registrationId}, ${v.fileName}, ${v.contentType}, ${v.sizeBytes},
              ${v.storage}, ${v.dataBase64}, ${v.objectKey})
      RETURNING id
    ),
    ubah AS (
      UPDATE registrations
      SET payment_status = 'menunggu_verifikasi', paid_at = now()
      WHERE id = ${v.registrationId}
      RETURNING id
    )
    SELECT (SELECT id FROM simpan) AS proof_id, EXISTS (SELECT 1 FROM ubah) AS ada
  `);
  const baris = (hasil as unknown as { rows?: Record<string, unknown>[] }).rows ??
    (hasil as unknown as Record<string, unknown>[]);
  const r = baris[0];
  return r?.ada ? String(r.proof_id) : null;
}

/** Memperbarui keputusan pembayaran oleh admin. */
export const putuskanPembayaran = (
  id: string,
  v: {
    paymentStatus: "belum_bayar" | "menunggu_verifikasi" | "lunas" | "dibebaskan" | "ditolak";
    paymentNote: string | null;
    verifiedBy: string;
  },
) =>
  db
    .update(s.registrations)
    .set({
      paymentStatus: v.paymentStatus,
      paymentNote: v.paymentNote,
      paymentVerifiedAt: new Date(),
      paymentVerifiedBy: v.verifiedBy,
    })
    .where(eq(s.registrations.id, id))
    .returning({ id: s.registrations.id, paymentStatus: s.registrations.paymentStatus });

/** Rekap pembayaran satu formulir: jumlah dan nilai per status. */
export const rekapPembayaran = (formId?: string) =>
  db
    .select({
      status: s.registrations.paymentStatus,
      n: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${s.registrations.feeAmount}), 0)::int`,
    })
    .from(s.registrations)
    .where(formId ? eq(s.registrations.formId, formId) : undefined)
    .groupBy(s.registrations.paymentStatus);

/**
 * Tagihan milik satu pengguna.
 *
 * Dicari lewat `registrations.user_id`, bukan lewat email: email pada
 * pendaftaran adalah salinan saat mendaftar dan boleh berbeda setelah
 * penggunanya mengubah alamatnya, sedangkan tautan ke akun tidak berubah.
 *
 * Nomor rekening ikut di sini karena pemanggilnya sudah terbukti pemilik
 * pendaftaran — berbeda dengan konfigurasi publik formulir, yang terbuka
 * bagi siapa saja.
 */
export const tagihanPengguna = (userId: string) =>
  db
    .select({
      id: s.registrations.id,
      programName: s.programs.name,
      formTitle: s.registrationForms.title,
      feeAmount: s.registrations.feeAmount,
      paymentStatus: s.registrations.paymentStatus,
      paymentNote: s.registrations.paymentNote,
      paidAt: s.registrations.paidAt,
      paymentVerifiedAt: s.registrations.paymentVerifiedAt,
      submittedAt: s.registrations.submittedAt,
      dueDays: s.registrationForms.paymentDueDays,
      bankName: s.registrationForms.bankName,
      bankAccountNumber: s.registrationForms.bankAccountNumber,
      bankAccountHolder: s.registrationForms.bankAccountHolder,
      bankNote: s.registrationForms.paymentNote,
      sudahAdaBukti: sql<boolean>`EXISTS (
        SELECT 1 FROM ${s.paymentProofs}
        WHERE ${s.paymentProofs.registrationId} = ${s.registrations.id}
      )`,
    })
    .from(s.registrations)
    .innerJoin(s.registrationForms, eq(s.registrationForms.id, s.registrations.formId))
    .innerJoin(s.programs, eq(s.programs.id, s.registrationForms.programId))
    .where(eq(s.registrations.userId, userId))
    .orderBy(desc(s.registrations.submittedAt));
