import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import * as s from "../db/schema";

/**
 * Repository laporan progres.
 *
 * Setiap metrik dihitung satu query untuk SELURUH peserta sekaligus, lalu
 * digabung di aplikasi. Menghitung per peserta berarti jumlah query tumbuh
 * seiring jumlah peserta — pada driver Neon berbasis HTTP itu berbanding
 * lurus dengan latensi, dan laporan satu angkatan akan melewati batas waktu
 * fungsi serverless.
 */

/** Peserta yang terdaftar pada tahapan mana pun dalam satu program. */
export const pesertaProgram = (programId: string) =>
  db
    .select({
      userId: s.users.id,
      name: s.users.name,
      email: s.users.email,
      phone: s.users.phone,
      city: s.users.city,
      enrollmentId: s.enrollments.id,
      tahapanId: s.tahapan.id,
      tahapanName: s.tahapan.name,
      className: s.enrollments.className,
      status: s.enrollments.status,
      engagement: s.enrollments.engagement,
      competency: s.enrollments.competency,
      progress: s.enrollments.progress,
      lastActiveAt: s.enrollments.lastActiveAt,
    })
    .from(s.enrollments)
    .innerJoin(s.users, eq(s.users.id, s.enrollments.userId))
    .innerJoin(s.tahapan, eq(s.tahapan.id, s.enrollments.tahapanId))
    .where(eq(s.tahapan.programId, programId))
    .orderBy(asc(s.tahapan.sequence), asc(s.users.name));

/**
 * Cacah materi terbit dan yang selesai, per peserta, untuk satu program.
 *
 * Materi draf tidak dihitung: peserta tidak pernah ditawari materi itu, jadi
 * memasukkannya ke penyebut membuat progres terlihat lebih buruk dari
 * kenyataan.
 */
export const materiPerPeserta = (programId: string, userIds: string[]) =>
  userIds.length
    ? db
        .select({
          userId: s.enrollments.userId,
          total: sql<number>`count(*)::int`,
          selesai: sql<number>`(count(*) filter (where ${s.materialProgress.status} = 'completed'))::int`,
        })
        .from(s.enrollments)
        .innerJoin(s.tahapan, eq(s.tahapan.id, s.enrollments.tahapanId))
        .innerJoin(s.subjects, eq(s.subjects.tahapanId, s.tahapan.id))
        .innerJoin(s.meetings, eq(s.meetings.subjectId, s.subjects.id))
        .innerJoin(
          s.materials,
          and(eq(s.materials.meetingId, s.meetings.id), eq(s.materials.publishStatus, "published")),
        )
        .leftJoin(
          s.materialProgress,
          and(
            eq(s.materialProgress.materialId, s.materials.id),
            eq(s.materialProgress.userId, s.enrollments.userId),
          ),
        )
        .where(and(eq(s.tahapan.programId, programId), inArray(s.enrollments.userId, userIds)))
        .groupBy(s.enrollments.userId)
    : Promise.resolve([]);

/** Rekap kehadiran per peserta pada pertemuan-pertemuan program ini. */
export const kehadiranPerPeserta = (programId: string, userIds: string[]) =>
  userIds.length
    ? db
        .select({
          userId: s.attendance.userId,
          hadir: sql<number>`(count(*) filter (where ${s.attendance.status} = 'hadir'))::int`,
          izin: sql<number>`(count(*) filter (where ${s.attendance.status} = 'izin'))::int`,
          sakit: sql<number>`(count(*) filter (where ${s.attendance.status} = 'sakit'))::int`,
          alpa: sql<number>`(count(*) filter (where ${s.attendance.status} = 'alpa'))::int`,
          tercatat: sql<number>`count(*)::int`,
        })
        .from(s.attendance)
        .innerJoin(s.meetings, eq(s.meetings.id, s.attendance.meetingId))
        .innerJoin(s.subjects, eq(s.subjects.id, s.meetings.subjectId))
        .innerJoin(s.tahapan, eq(s.tahapan.id, s.subjects.tahapanId))
        .where(and(eq(s.tahapan.programId, programId), inArray(s.attendance.userId, userIds)))
        .groupBy(s.attendance.userId)
    : Promise.resolve([]);

/**
 * Rekap asesmen per peserta.
 *
 * Rata-rata hanya menghitung percobaan yang sudah dinilai; percobaan yang
 * masih menunggu penilaian esai bernilai null dan tidak boleh dianggap nol.
 */
export const asesmenPerPeserta = (programId: string, userIds: string[]) =>
  userIds.length
    ? db
        .select({
          userId: s.assessmentAttempts.userId,
          percobaan: sql<number>`count(*)::int`,
          dinilai: sql<number>`(count(*) filter (where ${s.assessmentAttempts.status} = 'dinilai'))::int`,
          menunggu: sql<number>`(count(*) filter (where ${s.assessmentAttempts.status} = 'menunggu_penilaian'))::int`,
          lulus: sql<number>`(count(*) filter (where ${s.assessmentAttempts.passed} = true))::int`,
          rataRata: sql<number | null>`round(avg(${s.assessmentAttempts.score}) filter (where ${s.assessmentAttempts.score} is not null))::int`,
        })
        .from(s.assessmentAttempts)
        .innerJoin(s.assessments, eq(s.assessments.id, s.assessmentAttempts.assessmentId))
        .leftJoin(s.meetings, eq(s.meetings.id, s.assessments.meetingId))
        .leftJoin(
          s.subjects,
          sql`${s.subjects.id} = coalesce(${s.assessments.subjectId}, ${s.meetings.subjectId})`,
        )
        .leftJoin(
          s.tahapan,
          sql`${s.tahapan.id} = coalesce(${s.assessments.tahapanId}, ${s.subjects.tahapanId})`,
        )
        .where(
          and(
            sql`coalesce(${s.assessments.programId}, ${s.tahapan.programId}) = ${programId}`,
            inArray(s.assessmentAttempts.userId, userIds),
          ),
        )
        .groupBy(s.assessmentAttempts.userId)
    : Promise.resolve([]);

/* --- Rincian satu peserta ------------------------------------------- */

/** Progres per mata pelajaran untuk satu peserta pada satu program. */
export const rincianMapel = (programId: string, userId: string) =>
  db
    .select({
      subjectId: s.subjects.id,
      subjectName: s.subjects.name,
      tahapanName: s.tahapan.name,
      role: s.subjects.role,
      total: sql<number>`count(*)::int`,
      selesai: sql<number>`(count(*) filter (where ${s.materialProgress.status} = 'completed'))::int`,
    })
    .from(s.subjects)
    .innerJoin(s.tahapan, eq(s.tahapan.id, s.subjects.tahapanId))
    .innerJoin(s.meetings, eq(s.meetings.subjectId, s.subjects.id))
    .innerJoin(
      s.materials,
      and(eq(s.materials.meetingId, s.meetings.id), eq(s.materials.publishStatus, "published")),
    )
    .leftJoin(
      s.materialProgress,
      and(
        eq(s.materialProgress.materialId, s.materials.id),
        eq(s.materialProgress.userId, userId),
      ),
    )
    .where(eq(s.tahapan.programId, programId))
    .groupBy(s.subjects.id, s.subjects.name, s.tahapan.name, s.subjects.role, s.tahapan.sequence, s.subjects.sequence)
    .orderBy(asc(s.tahapan.sequence), asc(s.subjects.sequence));

/** Hasil tiap asesmen yang dikerjakan peserta pada program ini. */
export const rincianAsesmen = (programId: string, userId: string) =>
  db
    .select({
      attemptId: s.assessmentAttempts.id,
      assessmentId: s.assessments.id,
      title: s.assessments.title,
      kind: s.assessments.kind,
      kkm: s.assessments.kkm,
      status: s.assessmentAttempts.status,
      score: s.assessmentAttempts.score,
      passed: s.assessmentAttempts.passed,
      submittedAt: s.assessmentAttempts.submittedAt,
      subjectName: s.subjects.name,
      meetingNumber: s.meetings.number,
    })
    .from(s.assessmentAttempts)
    .innerJoin(s.assessments, eq(s.assessments.id, s.assessmentAttempts.assessmentId))
    .leftJoin(s.meetings, eq(s.meetings.id, s.assessments.meetingId))
    .leftJoin(
      s.subjects,
      sql`${s.subjects.id} = coalesce(${s.assessments.subjectId}, ${s.meetings.subjectId})`,
    )
    .leftJoin(
      s.tahapan,
      sql`${s.tahapan.id} = coalesce(${s.assessments.tahapanId}, ${s.subjects.tahapanId})`,
    )
    .where(
      and(
        sql`coalesce(${s.assessments.programId}, ${s.tahapan.programId}) = ${programId}`,
        eq(s.assessmentAttempts.userId, userId),
      ),
    )
    .orderBy(asc(s.assessmentAttempts.submittedAt));
