import { eq } from "drizzle-orm";
import { db } from "../db/client";
import * as s from "../db/schema";

/**
 * Pembatasan data untuk pengajar.
 *
 * Admin akademik dan super admin melihat seluruh program. Pengajar hanya
 * melihat mata pelajaran yang benar-benar diampunya — bukan sekadar
 * disembunyikan di tampilan, tetapi disaring di server, karena tanpa itu
 * seorang pengajar dapat mencatat kehadiran atau membaca nilai kelas yang
 * bukan tanggung jawabnya hanya dengan menebak id.
 *
 * Nilai balik `null` berarti "tanpa batas" — dipakai peran admin. Larik
 * kosong berarti pengajar yang belum diberi mata pelajaran; ia melihat
 * daftar kosong, bukan seluruhnya.
 */

export type Pengguna = { id: string; role: string };

export const tanpaBatas = (user: Pengguna) =>
  user.role === "academic_admin" || user.role === "super_admin";

/** Id mata pelajaran yang boleh diakses pemanggil, atau null bila tak dibatasi. */
export async function mapelTerjangkau(user: Pengguna): Promise<string[] | null> {
  if (tanpaBatas(user)) return null;
  const rows = await db
    .select({ id: s.subjects.id })
    .from(s.subjects)
    .where(eq(s.subjects.instructorId, user.id));
  return rows.map((r) => r.id);
}

/** Apakah pemanggil boleh menyentuh satu mata pelajaran tertentu. */
export async function bolehMapel(user: Pengguna, subjectId: string): Promise<boolean> {
  const izin = await mapelTerjangkau(user);
  return izin === null || izin.includes(subjectId);
}

/**
 * Apakah pemanggil boleh menyentuh satu pertemuan.
 *
 * Diperiksa lewat mata pelajaran pemilik pertemuan, bukan lewat pertemuannya
 * sendiri — kepemilikan memang melekat pada mata pelajaran.
 */
export async function bolehPertemuan(user: Pengguna, meetingId: string): Promise<boolean> {
  if (tanpaBatas(user)) return true;
  const [row] = await db
    .select({ subjectId: s.meetings.subjectId })
    .from(s.meetings)
    .where(eq(s.meetings.id, meetingId))
    .limit(1);
  if (!row) return false;
  return bolehMapel(user, row.subjectId);
}
