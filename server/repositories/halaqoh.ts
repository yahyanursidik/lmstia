import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db/client";
import * as s from "../db/schema";

/**
 * Repository halaqoh/rombel dan penugasan pengajar.
 *
 * Driver Neon berbasis HTTP: setiap pernyataan adalah satu perjalanan
 * jaringan ke Singapura. Karena itu jumlah peserta, jumlah mata pelajaran,
 * dan nama pengajar diambil sebagai subkueri agregat dalam satu kueri, bukan
 * dirangkai per baris di sisi aplikasi.
 */

/* --- Halaqoh -------------------------------------------------------- */

const jumlahPeserta = sql<number>`(
  SELECT count(*) FROM ${s.enrollments}
  WHERE ${s.enrollments.halaqohId} = ${s.halaqoh.id}
)::int`;

const jumlahMapel = sql<number>`(
  SELECT count(*) FROM ${s.teachingAssignments}
  WHERE ${s.teachingAssignments.halaqohId} = ${s.halaqoh.id}
)::int`;

const kolomHalaqoh = {
  id: s.halaqoh.id,
  tahapanId: s.halaqoh.tahapanId,
  tahapanName: s.tahapan.name,
  programId: s.tahapan.programId,
  code: s.halaqoh.code,
  name: s.halaqoh.name,
  gender: s.halaqoh.gender,
  instructorId: s.halaqoh.instructorId,
  capacity: s.halaqoh.capacity,
  dayOfWeek: s.halaqoh.dayOfWeek,
  startTime: s.halaqoh.startTime,
  endTime: s.halaqoh.endTime,
  mode: s.halaqoh.mode,
  location: s.halaqoh.location,
  liveUrl: s.halaqoh.liveUrl,
  waGroupUrl: s.halaqoh.waGroupUrl,
  note: s.halaqoh.note,
  status: s.halaqoh.status,
  sequence: s.halaqoh.sequence,
  peserta: jumlahPeserta,
  mapel: jumlahMapel,
};

/**
 * Nama pengajar diambil lewat LEFT JOIN, bukan INNER: halaqoh yang belum
 * punya ustadz tetap harus muncul — justru itu yang perlu dilihat admin.
 */
const dasarHalaqoh = () =>
  db
    .select({ ...kolomHalaqoh, instructorName: s.users.name })
    .from(s.halaqoh)
    .innerJoin(s.tahapan, eq(s.tahapan.id, s.halaqoh.tahapanId))
    .leftJoin(s.users, eq(s.users.id, s.halaqoh.instructorId));

export const listHalaqoh = (f: { tahapanId?: string; programId?: string; instructorId?: string }) => {
  const w = [];
  if (f.tahapanId) w.push(eq(s.halaqoh.tahapanId, f.tahapanId));
  if (f.programId) w.push(eq(s.tahapan.programId, f.programId));
  if (f.instructorId) w.push(eq(s.halaqoh.instructorId, f.instructorId));
  return dasarHalaqoh()
    .where(w.length ? and(...w) : undefined)
    .orderBy(asc(s.halaqoh.sequence), asc(s.halaqoh.code));
};

export const findHalaqoh = (id: string) => dasarHalaqoh().where(eq(s.halaqoh.id, id));

export const createHalaqoh = (v: typeof s.halaqoh.$inferInsert) =>
  db.insert(s.halaqoh).values(v).returning({ id: s.halaqoh.id });

export const updateHalaqoh = (id: string, v: Partial<typeof s.halaqoh.$inferInsert>) =>
  db
    .update(s.halaqoh)
    .set({ ...v, updatedAt: new Date() })
    .where(eq(s.halaqoh.id, id))
    .returning({ id: s.halaqoh.id });

/**
 * Menghapus halaqoh.
 *
 * Peserta tidak ikut terhapus: kunci asing `enrollments.halaqoh_id` memakai
 * ON DELETE SET NULL, sehingga mereka kembali menjadi "belum ditempatkan".
 * Membuang keikutsertaan bersama rombelnya akan menghapus riwayat belajar
 * orang karena pembagian kelas diubah.
 */
export const deleteHalaqoh = (id: string) =>
  db.delete(s.halaqoh).where(eq(s.halaqoh.id, id)).returning({ id: s.halaqoh.id });

/* --- Penugasan pengajar --------------------------------------------- */

const kolomPenugasan = {
  id: s.teachingAssignments.id,
  halaqohId: s.teachingAssignments.halaqohId,
  halaqohName: s.halaqoh.name,
  halaqohCode: s.halaqoh.code,
  tahapanId: s.halaqoh.tahapanId,
  tahapanName: s.tahapan.name,
  programId: s.tahapan.programId,
  programName: s.programs.name,
  subjectId: s.teachingAssignments.subjectId,
  subjectName: s.subjects.name,
  instructorId: s.teachingAssignments.instructorId,
  instructorName: s.users.name,
  dayOfWeek: s.teachingAssignments.dayOfWeek,
  startTime: s.teachingAssignments.startTime,
  endTime: s.teachingAssignments.endTime,
  mode: s.teachingAssignments.mode,
  location: s.teachingAssignments.location,
  liveUrl: s.teachingAssignments.liveUrl,
  note: s.teachingAssignments.note,
};

const dasarPenugasan = () =>
  db
    .select(kolomPenugasan)
    .from(s.teachingAssignments)
    .innerJoin(s.halaqoh, eq(s.halaqoh.id, s.teachingAssignments.halaqohId))
    .innerJoin(s.tahapan, eq(s.tahapan.id, s.halaqoh.tahapanId))
    .innerJoin(s.programs, eq(s.programs.id, s.tahapan.programId))
    .innerJoin(s.subjects, eq(s.subjects.id, s.teachingAssignments.subjectId))
    .innerJoin(s.users, eq(s.users.id, s.teachingAssignments.instructorId));

export type FilterPenugasan = {
  halaqohId?: string;
  instructorId?: string;
  subjectId?: string;
  tahapanId?: string;
  programId?: string;
};

export const listPenugasan = (f: FilterPenugasan) => {
  const w = [];
  if (f.halaqohId) w.push(eq(s.teachingAssignments.halaqohId, f.halaqohId));
  if (f.instructorId) w.push(eq(s.teachingAssignments.instructorId, f.instructorId));
  if (f.subjectId) w.push(eq(s.teachingAssignments.subjectId, f.subjectId));
  if (f.tahapanId) w.push(eq(s.halaqoh.tahapanId, f.tahapanId));
  if (f.programId) w.push(eq(s.tahapan.programId, f.programId));
  return dasarPenugasan()
    .where(w.length ? and(...w) : undefined)
    .orderBy(
      /* Jadwal dibaca menurut hari lalu jam. Hari kosong ditaruh di akhir
         memakai NULLS LAST — penugasan tanpa jadwal bukan "hari ke-0". */
      sql`${s.teachingAssignments.dayOfWeek} ASC NULLS LAST`,
      sql`${s.teachingAssignments.startTime} ASC NULLS LAST`,
      asc(s.halaqoh.code),
    );
};

export const findPenugasan = (id: string) =>
  dasarPenugasan().where(eq(s.teachingAssignments.id, id));

export const createPenugasan = (v: typeof s.teachingAssignments.$inferInsert) =>
  db.insert(s.teachingAssignments).values(v).returning({ id: s.teachingAssignments.id });

export const updatePenugasan = (
  id: string,
  v: Partial<typeof s.teachingAssignments.$inferInsert>,
) =>
  db
    .update(s.teachingAssignments)
    .set({ ...v, updatedAt: new Date() })
    .where(eq(s.teachingAssignments.id, id))
    .returning({ id: s.teachingAssignments.id });

export const deletePenugasan = (id: string) =>
  db
    .delete(s.teachingAssignments)
    .where(eq(s.teachingAssignments.id, id))
    .returning({ id: s.teachingAssignments.id });

/**
 * Bentrok jadwal: penugasan lain milik pengajar yang sama, pada hari yang
 * sama, yang jamnya bertindihan.
 *
 * Diperiksa di basis data, bukan dengan menarik seluruh jadwal lalu
 * membandingkannya di aplikasi — jumlah penugasan seorang ustadz memang
 * kecil, tetapi pemeriksaannya harus memakai data terkini, bukan salinan
 * yang sudah usang beberapa milidetik.
 *
 * Dua rentang bertindih bila masing-masing dimulai sebelum yang lain
 * berakhir. Jam disimpan sebagai "HH:MM", yang urut secara leksikografis,
 * sehingga perbandingan teks sudah benar tanpa konversi.
 */
export async function jadwalBentrok(v: {
  instructorId: string;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  kecualiId?: string;
}) {
  if (v.dayOfWeek === null || !v.startTime || !v.endTime) return [];
  const w = [
    eq(s.teachingAssignments.instructorId, v.instructorId),
    eq(s.teachingAssignments.dayOfWeek, v.dayOfWeek),
    sql`${s.teachingAssignments.startTime} < ${v.endTime}`,
    sql`${s.teachingAssignments.endTime} > ${v.startTime}`,
  ];
  if (v.kecualiId) w.push(sql`${s.teachingAssignments.id} <> ${v.kecualiId}`);
  return db
    .select({
      id: s.teachingAssignments.id,
      halaqohName: s.halaqoh.name,
      subjectName: s.subjects.name,
      startTime: s.teachingAssignments.startTime,
      endTime: s.teachingAssignments.endTime,
    })
    .from(s.teachingAssignments)
    .innerJoin(s.halaqoh, eq(s.halaqoh.id, s.teachingAssignments.halaqohId))
    .innerJoin(s.subjects, eq(s.subjects.id, s.teachingAssignments.subjectId))
    .where(and(...w));
}

/* --- Penempatan peserta ke halaqoh ---------------------------------- */

/**
 * Peserta satu caturwulan beserta halaqohnya, termasuk yang belum ditempatkan.
 *
 * Inilah daftar yang dipakai layar pemindahan: yang belum punya rombel harus
 * ikut terlihat, karena merekalah yang justru perlu dikerjakan.
 */
export const pesertaTahapan = (tahapanId: string, belumDitempatkan = false) => {
  const w = [eq(s.enrollments.tahapanId, tahapanId)];
  if (belumDitempatkan) w.push(isNull(s.enrollments.halaqohId));
  return db
    .select({
      enrollmentId: s.enrollments.id,
      userId: s.users.id,
      name: s.users.name,
      email: s.users.email,
      phone: s.users.phone,
      city: s.users.city,
      status: s.enrollments.status,
      halaqohId: s.enrollments.halaqohId,
      halaqohName: s.halaqoh.name,
      halaqohCode: s.halaqoh.code,
    })
    .from(s.enrollments)
    .innerJoin(s.users, eq(s.users.id, s.enrollments.userId))
    .leftJoin(s.halaqoh, eq(s.halaqoh.id, s.enrollments.halaqohId))
    .where(and(...w))
    .orderBy(asc(s.users.name));
};

/**
 * Memindahkan sekumpulan keikutsertaan ke satu halaqoh — atau mengeluarkannya
 * bila `halaqohId` null.
 *
 * Satu pernyataan untuk seluruh daftar, bukan satu per peserta: driver HTTP
 * membayar satu perjalanan jaringan per pernyataan, dan memindahkan tiga
 * puluh peserta tidak pantas menjadi tiga puluh perjalanan.
 */
export const pindahkanPeserta = (enrollmentIds: string[], halaqohId: string | null) =>
  db
    .update(s.enrollments)
    .set({ halaqohId, updatedAt: new Date() })
    .where(inArray(s.enrollments.id, enrollmentIds))
    .returning({ id: s.enrollments.id });

/** Sisa daya tampung satu halaqoh; null berarti tanpa batas. */
export async function sisaDayaTampung(halaqohId: string): Promise<number | null> {
  const [row] = await db
    .select({
      capacity: s.halaqoh.capacity,
      terisi: sql<number>`(
        SELECT count(*) FROM ${s.enrollments}
        WHERE ${s.enrollments.halaqohId} = ${s.halaqoh.id}
      )::int`,
    })
    .from(s.halaqoh)
    .where(eq(s.halaqoh.id, halaqohId))
    .limit(1);
  if (!row || row.capacity === null) return null;
  return row.capacity - Number(row.terisi);
}

/* --- Jadwal & beban pengajar ---------------------------------------- */

/**
 * Daftar pengajar beserta beban mengajarnya.
 *
 * Dihitung dengan subkueri agregat, bukan dengan menarik penugasan lalu
 * mengelompokkannya di aplikasi: yang dibutuhkan hanya angka, dan menarik
 * seluruh barisnya hanya untuk dihitung ulang itu pemborosan jaringan.
 */
export const daftarPengajar = () =>
  db
    .select({
      id: s.users.id,
      name: s.users.name,
      email: s.users.email,
      phone: s.users.phone,
      title: s.users.title,
      bio: s.users.bio,
      accountStatus: s.users.accountStatus,
      halaqohDiampu: sql<number>`(
        SELECT count(DISTINCT ${s.teachingAssignments.halaqohId})
        FROM ${s.teachingAssignments}
        WHERE ${s.teachingAssignments.instructorId} = ${s.users.id}
      )::int`,
      mapelDiampu: sql<number>`(
        SELECT count(*) FROM ${s.teachingAssignments}
        WHERE ${s.teachingAssignments.instructorId} = ${s.users.id}
      )::int`,
      halaqohDibina: sql<number>`(
        SELECT count(*) FROM ${s.halaqoh}
        WHERE ${s.halaqoh.instructorId} = ${s.users.id}
      )::int`,
    })
    .from(s.users)
    .where(eq(s.users.role, "instructor"))
    .orderBy(asc(s.users.name));
