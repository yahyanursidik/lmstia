import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import * as s from "../db/schema";

export const findUserById = (id: string) => db.query.users.findFirst({ where: eq(s.users.id, id) });

export const findUserByEmail = (email: string) =>
  db.query.users.findFirst({ where: eq(s.users.email, email) });

export const listInstructors = () =>
  db.select().from(s.users).where(eq(s.users.role, "instructor"));

export const findEnrollment = (userId: string, tahapanId: string) =>
  db.query.enrollments.findFirst({
    where: and(eq(s.enrollments.userId, userId), eq(s.enrollments.tahapanId, tahapanId)),
  });

export const listEnrollments = (tahapanId: string) =>
  db
    .select({
      id: s.enrollments.id,
      userId: s.users.id,
      name: s.users.name,
      email: s.users.email,
      segment: s.users.segment,
      className: s.enrollments.className,
      status: s.enrollments.status,
      engagement: s.enrollments.engagement,
      competency: s.enrollments.competency,
      progress: s.enrollments.progress,
    })
    .from(s.enrollments)
    .innerJoin(s.users, eq(s.enrollments.userId, s.users.id))
    .where(eq(s.enrollments.tahapanId, tahapanId));

export const listProgressForMaterials = (userId: string, materialIds: string[]) =>
  materialIds.length
    ? db
        .select()
        .from(s.materialProgress)
        .where(
          and(eq(s.materialProgress.userId, userId), inArray(s.materialProgress.materialId, materialIds)),
        )
    : Promise.resolve([]);


/*
 * Progres seluruh mata pelajaran satu tahapan dalam SATU query.
 *
 * Versi sebelumnya menelusuri mata pelajaran → pertemuan → materi dengan
 * loop bersarang, sehingga satu tahapan berukuran normal menghasilkan
 * ratusan round-trip berurutan. Driver Neon berbasis HTTP: setiap query
 * adalah satu permintaan jaringan, jadi biayanya latensi × jumlah query —
 * cukup untuk melewati batas waktu fungsi serverless.
 *
 * `total` sengaja menghitung semua materi (bukan hanya yang published),
 * mempertahankan perilaku perhitungan sebelumnya.
 */
export const subjectProgressForTahapan = (userId: string, tahapanId: string) =>
  db
    .select({
      subjectId: s.subjects.id,
      total: sql<number>`count(*)::int`,
      done: sql<number>`(count(*) filter (where ${s.materialProgress.status} = 'completed'))::int`,
    })
    .from(s.materials)
    .innerJoin(s.meetings, eq(s.meetings.id, s.materials.meetingId))
    .innerJoin(s.subjects, eq(s.subjects.id, s.meetings.subjectId))
    .leftJoin(
      s.materialProgress,
      and(
        eq(s.materialProgress.materialId, s.materials.id),
        eq(s.materialProgress.userId, userId),
      ),
    )
    .where(eq(s.subjects.tahapanId, tahapanId))
    .groupBy(s.subjects.id);


/**
 * Seluruh materi satu tahapan, sudah diratakan bersama progres peserta,
 * dalam satu query. Urutan mengikuti nomor pertemuan lalu urutan materi.
 *
 * `status` bernilai null bila peserta belum pernah menyentuh materi; pemanggil
 * memetakannya ke "not_started".
 */
export const tahapanMaterialRows = (userId: string, tahapanId: string) =>
  db
    .select({
      subject: s.subjects,
      meeting: s.meetings,
      material: s.materials,
      status: s.materialProgress.status,
    })
    .from(s.materials)
    .innerJoin(s.meetings, eq(s.meetings.id, s.materials.meetingId))
    .innerJoin(s.subjects, eq(s.subjects.id, s.meetings.subjectId))
    .leftJoin(
      s.materialProgress,
      and(
        eq(s.materialProgress.materialId, s.materials.id),
        eq(s.materialProgress.userId, userId),
      ),
    )
    .where(eq(s.subjects.tahapanId, tahapanId))
    .orderBy(asc(s.meetings.number), asc(s.materials.sequence));

/** Upsert keyed on the (user, material) unique index. */
export async function setMaterialProgress(
  userId: string,
  materialId: string,
  status: "not_started" | "in_progress" | "completed" | "needs_review",
) {
  const now = new Date();
  const [row] = await db
    .insert(s.materialProgress)
    .values({
      userId,
      materialId,
      status,
      startedAt: status === "in_progress" ? now : null,
      completedAt: status === "completed" ? now : null,
    })
    .onConflictDoUpdate({
      target: [s.materialProgress.userId, s.materialProgress.materialId],
      set: { status, completedAt: status === "completed" ? now : null, updatedAt: now },
    })
    .returning();
  return row;
}

export const listBookmarks = (userId: string) =>
  db
    .select({
      materialId: s.materials.id,
      title: s.materials.title,
      type: s.materials.type,
      createdAt: s.bookmarks.createdAt,
    })
    .from(s.bookmarks)
    .innerJoin(s.materials, eq(s.bookmarks.materialId, s.materials.id))
    .where(eq(s.bookmarks.userId, userId));

export const addBookmark = (userId: string, materialId: string) =>
  db.insert(s.bookmarks).values({ userId, materialId }).onConflictDoNothing().returning();

export const removeBookmark = (userId: string, materialId: string) =>
  db
    .delete(s.bookmarks)
    .where(and(eq(s.bookmarks.userId, userId), eq(s.bookmarks.materialId, materialId)))
    .returning();

export const listNotes = (userId: string) =>
  db.select().from(s.notes).where(eq(s.notes.userId, userId));

export const createNote = (userId: string, materialId: string | null, body: string) =>
  db.insert(s.notes).values({ userId, materialId, body }).returning();

export async function engagementCounts(tahapanId: string) {
  return db
    .select({ engagement: s.enrollments.engagement, n: sql<number>`count(*)::int` })
    .from(s.enrollments)
    .where(eq(s.enrollments.tahapanId, tahapanId))
    .groupBy(s.enrollments.engagement);
}

export async function competencyCounts(tahapanId: string) {
  return db
    .select({ competency: s.enrollments.competency, n: sql<number>`count(*)::int` })
    .from(s.enrollments)
    .where(eq(s.enrollments.tahapanId, tahapanId))
    .groupBy(s.enrollments.competency);
}

export const writeAudit = (
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string,
) => db.insert(s.auditLogs).values({ actorId, action, entity, entityId });
