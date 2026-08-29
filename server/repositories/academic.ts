/**
 * Repository untuk hierarki konten:
 * Program → Tahapan → Mata Pelajaran → Pertemuan → Materi (+ kuis).
 *
 * Hanya lapisan ini yang menyentuh Drizzle. Service memanggilnya; route tidak
 * pernah menyentuh basis data secara langsung.
 */

import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "../db/client";
import * as s from "../db/schema";

/* --- Program ----------------------------------------------------- */

export const listPrograms = () => db.select().from(s.programs).orderBy(asc(s.programs.sequence));

export const findProgram = (id: string) => db.query.programs.findFirst({ where: eq(s.programs.id, id) });

export const findProgramBySlug = (slug: string) =>
  db.query.programs.findFirst({ where: eq(s.programs.slug, slug) });

export const createProgram = (v: typeof s.programs.$inferInsert) =>
  db.insert(s.programs).values(v).returning();

export const updateProgram = (id: string, v: Partial<typeof s.programs.$inferInsert>) =>
  db.update(s.programs).set({ ...v, updatedAt: new Date() }).where(eq(s.programs.id, id)).returning();

export const deleteProgram = (id: string) =>
  db.delete(s.programs).where(eq(s.programs.id, id)).returning();

/* --- Tahapan ----------------------------------------------------- */

export const listTahapan = (programId?: string, publicOnly = false) =>
  db
    .select()
    .from(s.tahapan)
    .where(
      programId && publicOnly
        ? and(eq(s.tahapan.programId, programId), eq(s.tahapan.isPublic, true))
        : programId
          ? eq(s.tahapan.programId, programId)
          : publicOnly
            ? eq(s.tahapan.isPublic, true)
            : undefined,
    )
    .orderBy(asc(s.tahapan.sequence));

export const findTahapan = (id: string) => db.query.tahapan.findFirst({ where: eq(s.tahapan.id, id) });

export const findTahapanBySlug = (slug: string) =>
  db.query.tahapan.findFirst({ where: eq(s.tahapan.slug, slug) });

export const findRunningTahapan = () =>
  db.query.tahapan.findFirst({ where: eq(s.tahapan.status, "running") });

export const createTahapan = (v: typeof s.tahapan.$inferInsert) =>
  db.insert(s.tahapan).values(v).returning();

export const updateTahapan = (id: string, v: Partial<typeof s.tahapan.$inferInsert>) =>
  db.update(s.tahapan).set({ ...v, updatedAt: new Date() }).where(eq(s.tahapan.id, id)).returning();

export const deleteTahapan = (id: string) =>
  db.delete(s.tahapan).where(eq(s.tahapan.id, id)).returning();

/* --- Mata Pelajaran ---------------------------------------------- */

export const listSubjects = (tahapanId: string) =>
  db
    .select()
    .from(s.subjects)
    .where(eq(s.subjects.tahapanId, tahapanId))
    .orderBy(asc(s.subjects.sequence));

export const findSubject = (id: string) => db.query.subjects.findFirst({ where: eq(s.subjects.id, id) });

export const findSubjectBySlug = (slug: string) =>
  db.query.subjects.findFirst({ where: eq(s.subjects.slug, slug) });

export const createSubject = (v: typeof s.subjects.$inferInsert) =>
  db.insert(s.subjects).values(v).returning();

export const updateSubject = (id: string, v: Partial<typeof s.subjects.$inferInsert>) =>
  db.update(s.subjects).set({ ...v, updatedAt: new Date() }).where(eq(s.subjects.id, id)).returning();

export const deleteSubject = (id: string) =>
  db.delete(s.subjects).where(eq(s.subjects.id, id)).returning();

/* --- Pertemuan ---------------------------------------------------- */

export const listMeetings = (subjectId: string) =>
  db
    .select()
    .from(s.meetings)
    .where(eq(s.meetings.subjectId, subjectId))
    .orderBy(asc(s.meetings.number));

export const findMeeting = (id: string) => db.query.meetings.findFirst({ where: eq(s.meetings.id, id) });

export const findMeetingByNumber = (subjectId: string, number: number) =>
  db.query.meetings.findFirst({
    where: and(eq(s.meetings.subjectId, subjectId), eq(s.meetings.number, number)),
  });

export const createMeeting = (v: typeof s.meetings.$inferInsert) =>
  db.insert(s.meetings).values(v).returning();

export const updateMeeting = (id: string, v: Partial<typeof s.meetings.$inferInsert>) =>
  db.update(s.meetings).set(v).where(eq(s.meetings.id, id)).returning();

export const deleteMeeting = (id: string) =>
  db.delete(s.meetings).where(eq(s.meetings.id, id)).returning();

/** Pertemuan yang punya jadwal live/tatap muka, untuk halaman Jadwal. */
export const listScheduledMeetings = (from?: Date) =>
  db
    .select({
      id: s.meetings.id,
      number: s.meetings.number,
      title: s.meetings.title,
      mode: s.meetings.mode,
      liveUrl: s.meetings.liveUrl,
      livePlatform: s.meetings.livePlatform,
      location: s.meetings.location,
      startsAt: s.meetings.startsAt,
      durationMinutes: s.meetings.durationMinutes,
      subjectId: s.subjects.id,
      subjectName: s.subjects.name,
      subjectSlug: s.subjects.slug,
    })
    .from(s.meetings)
    .innerJoin(s.subjects, eq(s.meetings.subjectId, s.subjects.id))
    .where(from ? gte(s.meetings.startsAt, from) : undefined)
    .orderBy(asc(s.meetings.startsAt));

/* --- Materi ------------------------------------------------------- */

export const listMaterials = (meetingId: string) =>
  db
    .select()
    .from(s.materials)
    .where(eq(s.materials.meetingId, meetingId))
    .orderBy(asc(s.materials.sequence));

export const findMaterial = (id: string) =>
  db.query.materials.findFirst({ where: eq(s.materials.id, id) });

export const createMaterial = (v: typeof s.materials.$inferInsert) =>
  db.insert(s.materials).values(v).returning();

export const updateMaterial = (id: string, v: Partial<typeof s.materials.$inferInsert>) =>
  db.update(s.materials).set(v).where(eq(s.materials.id, id)).returning();

export const deleteMaterial = (id: string) =>
  db.delete(s.materials).where(eq(s.materials.id, id)).returning();

/* --- Kuis / Ujian -------------------------------------------------- */

export const listAssessments = (meetingId: string) =>
  db.select().from(s.assessments).where(eq(s.assessments.meetingId, meetingId));

export const findAssessment = (id: string) =>
  db.query.assessments.findFirst({ where: eq(s.assessments.id, id) });

export const createAssessment = (v: typeof s.assessments.$inferInsert) =>
  db.insert(s.assessments).values(v).returning();

export const updateAssessment = (id: string, v: Partial<typeof s.assessments.$inferInsert>) =>
  db.update(s.assessments).set(v).where(eq(s.assessments.id, id)).returning();

export const deleteAssessment = (id: string) =>
  db.delete(s.assessments).where(eq(s.assessments.id, id)).returning();

export const listQuestions = (assessmentId: string) =>
  db
    .select()
    .from(s.assessmentQuestions)
    .where(eq(s.assessmentQuestions.assessmentId, assessmentId))
    .orderBy(asc(s.assessmentQuestions.sequence));

/* --- Pengumuman ----------------------------------------------------- */

export const listAnnouncements = (tahapanId: string, publishedOnly = true) =>
  db
    .select()
    .from(s.announcements)
    .where(
      publishedOnly
        ? and(eq(s.announcements.tahapanId, tahapanId), eq(s.announcements.status, "published"))
        : eq(s.announcements.tahapanId, tahapanId),
    );

/**
 * Satu pohon utuh untuk halaman Kurikulum admin.
 * Dibangun dengan query per tingkat agar tetap terbaca; jumlah barisnya kecil
 * (satu tahapan ≈ 3 mata pelajaran × 13 pertemuan).
 */
export async function contentTree(tahapanId: string) {
  const subjects = await listSubjects(tahapanId);
  return Promise.all(
    subjects.map(async (subject) => {
      const meetings = await listMeetings(subject.id);
      const withChildren = await Promise.all(
        meetings.map(async (m) => ({
          ...m,
          materials: await listMaterials(m.id),
          assessments: await listAssessments(m.id),
        })),
      );
      return { ...subject, meetings: withChildren };
    }),
  );
}
