import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import * as s from "../db/schema";

/** Repository kehadiran: pengambilan per pertemuan dan rekapnya. */

/**
 * Daftar hadir satu pertemuan.
 *
 * Yang dikembalikan adalah SELURUH peserta yang terdaftar pada tahapan
 * pemilik pertemuan itu, bukan hanya yang sudah punya baris kehadiran.
 * Daftar hadir yang hanya memuat orang yang sudah dicatat tidak berguna —
 * yang justru dicari pengampu adalah siapa yang belum.
 */
export async function daftarHadir(meetingId: string) {
  const [pertemuan] = await db
    .select({
      id: s.meetings.id,
      number: s.meetings.number,
      title: s.meetings.title,
      mode: s.meetings.mode,
      startsAt: s.meetings.startsAt,
      location: s.meetings.location,
      livePlatform: s.meetings.livePlatform,
      subjectId: s.subjects.id,
      subjectName: s.subjects.name,
      tahapanId: s.tahapan.id,
      tahapanName: s.tahapan.name,
    })
    .from(s.meetings)
    .innerJoin(s.subjects, eq(s.subjects.id, s.meetings.subjectId))
    .innerJoin(s.tahapan, eq(s.tahapan.id, s.subjects.tahapanId))
    .where(eq(s.meetings.id, meetingId))
    .limit(1);

  if (!pertemuan) return null;

  const peserta = await db
    .select({
      userId: s.users.id,
      name: s.users.name,
      className: s.enrollments.className,
      status: s.attendance.status,
      channel: s.attendance.channel,
      note: s.attendance.note,
      recordedAt: s.attendance.recordedAt,
      tercatat: sql<boolean>`${s.attendance.id} is not null`,
    })
    .from(s.enrollments)
    .innerJoin(s.users, eq(s.users.id, s.enrollments.userId))
    .leftJoin(
      s.attendance,
      and(eq(s.attendance.userId, s.enrollments.userId), eq(s.attendance.meetingId, meetingId)),
    )
    .where(eq(s.enrollments.tahapanId, pertemuan.tahapanId))
    .orderBy(asc(s.users.name));

  return { pertemuan, peserta };
}

export type BarisKehadiran = {
  userId: string;
  status: "hadir" | "izin" | "sakit" | "alpa";
  channel?: "daring" | "luring" | null;
  note?: string | null;
};

/**
 * Menyimpan kehadiran satu pertemuan sekaligus.
 *
 * Memakai satu upsert untuk seluruh baris: mengambil kehadiran adalah satu
 * tindakan, dan menyimpannya baris demi baris berarti sebagian bisa tersimpan
 * sementara sisanya gagal — keadaan yang sulit ditelusuri pada catatan yang
 * bisa disengketakan.
 */
export function simpanKehadiran(
  meetingId: string,
  baris: BarisKehadiran[],
  recordedBy: string,
) {
  if (baris.length === 0) return Promise.resolve([]);
  const now = new Date();
  return db
    .insert(s.attendance)
    .values(
      baris.map((b) => ({
        meetingId,
        userId: b.userId,
        status: b.status,
        /* Kanal hanya untuk yang hadir — dijaga juga oleh CHECK. */
        channel: b.status === "hadir" ? (b.channel ?? null) : null,
        note: b.note ?? null,
        recordedBy,
        recordedAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoUpdate({
      target: [s.attendance.meetingId, s.attendance.userId],
      set: {
        status: sql`excluded.status`,
        channel: sql`excluded.channel`,
        note: sql`excluded.note`,
        recordedBy: sql`excluded.recorded_by`,
        updatedAt: now,
      },
    })
    .returning({ id: s.attendance.id });
}

/**
 * Rekap kehadiran satu tahapan, per peserta, termasuk pemisahan kanal.
 *
 * Kanal dipisah karena pada program hybrid, peserta yang selalu bergabung
 * daring dan peserta yang selalu datang menuntut pendampingan berbeda —
 * perbedaan itu hilang bila keduanya hanya terhitung "hadir".
 */
export const rekapTahapan = (tahapanId: string) =>
  db
    .select({
      userId: s.users.id,
      name: s.users.name,
      className: s.enrollments.className,
      hadir: sql<number>`(count(*) filter (where ${s.attendance.status} = 'hadir'))::int`,
      daring: sql<number>`(count(*) filter (where ${s.attendance.channel} = 'daring'))::int`,
      luring: sql<number>`(count(*) filter (where ${s.attendance.channel} = 'luring'))::int`,
      izin: sql<number>`(count(*) filter (where ${s.attendance.status} = 'izin'))::int`,
      sakit: sql<number>`(count(*) filter (where ${s.attendance.status} = 'sakit'))::int`,
      alpa: sql<number>`(count(*) filter (where ${s.attendance.status} = 'alpa'))::int`,
      tercatat: sql<number>`count(${s.attendance.id})::int`,
    })
    .from(s.enrollments)
    .innerJoin(s.users, eq(s.users.id, s.enrollments.userId))
    .leftJoin(s.attendance, eq(s.attendance.userId, s.enrollments.userId))
    .where(eq(s.enrollments.tahapanId, tahapanId))
    .groupBy(s.users.id, s.users.name, s.enrollments.className)
    .orderBy(asc(s.users.name));

/** Pertemuan yang layak diambil kehadirannya: bukan belajar mandiri. */
export const pertemuanTerjadwal = (subjectId: string) =>
  db
    .select({
      id: s.meetings.id,
      number: s.meetings.number,
      title: s.meetings.title,
      mode: s.meetings.mode,
      startsAt: s.meetings.startsAt,
      tercatat: sql<number>`(
        select count(*) from ${s.attendance} where ${s.attendance.meetingId} = ${s.meetings.id}
      )::int`,
    })
    .from(s.meetings)
    .where(and(eq(s.meetings.subjectId, subjectId), sql`${s.meetings.mode} <> 'mandiri'`))
    .orderBy(asc(s.meetings.number));

export const hapusKehadiran = (meetingId: string, userIds: string[]) =>
  userIds.length
    ? db
        .delete(s.attendance)
        .where(and(eq(s.attendance.meetingId, meetingId), inArray(s.attendance.userId, userIds)))
        .returning({ id: s.attendance.id })
    : Promise.resolve([]);

/**
 * Kehadiran pemanggil sendiri pada satu tahapan.
 *
 * Peserta berhak melihat catatan kehadirannya: itu memengaruhi penilaian dan
 * bisa keliru. Yang tidak ditampilkan adalah siapa yang mencatatnya — bagi
 * peserta, yang relevan adalah isinya, bukan penanggung jawab internalnya.
 */
export const kehadiranSaya = (userId: string, tahapanId: string) =>
  db
    .select({
      meetingId: s.meetings.id,
      number: s.meetings.number,
      title: s.meetings.title,
      mode: s.meetings.mode,
      startsAt: s.meetings.startsAt,
      subjectName: s.subjects.name,
      subjectSlug: s.subjects.slug,
      status: s.attendance.status,
      channel: s.attendance.channel,
      note: s.attendance.note,
    })
    .from(s.meetings)
    .innerJoin(s.subjects, eq(s.subjects.id, s.meetings.subjectId))
    .innerJoin(
      s.attendance,
      and(eq(s.attendance.meetingId, s.meetings.id), eq(s.attendance.userId, userId)),
    )
    .where(eq(s.subjects.tahapanId, tahapanId))
    .orderBy(asc(s.meetings.startsAt), asc(s.meetings.number));
