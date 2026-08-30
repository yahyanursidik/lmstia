/**
 * Kuis / Ujian: penyajian soal, penilaian, dan KKM.
 *
 * Dua aturan yang dijaga ketat di sini:
 *
 * 1. Kunci jawaban tidak pernah keluar ke peserta sebelum percobaan selesai.
 *    `questionsForStudent()` adalah satu-satunya jalur penyajian soal, dan ia
 *    membuang `answerKey` serta `explanation`.
 * 2. Nilai dihitung di server dari kunci di basis data — bukan dari apa pun
 *    yang dikirim klien.
 *
 * Pilihan ganda dan benar-salah dinilai otomatis. Esai menunggu penilaian
 * pengajar, sehingga percobaan berstatus `menunggu_penilaian` sampai seluruh
 * esai diberi poin.
 */

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import * as s from "../db/schema";

export class AssessmentError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

type Question = typeof s.assessmentQuestions.$inferSelect;

export const AUTO_TYPES = ["multiple_choice", "true_false"] as const;
const isAuto = (t: Question["type"]) => t === "multiple_choice" || t === "true_false";

/* --- pembacaan --------------------------------------------------- */

export const findAssessment = (id: string) =>
  db.query.assessments.findFirst({ where: eq(s.assessments.id, id) });

export const listQuestions = (assessmentId: string) =>
  db
    .select()
    .from(s.assessmentQuestions)
    .where(eq(s.assessmentQuestions.assessmentId, assessmentId))
    .orderBy(asc(s.assessmentQuestions.sequence));

/** Kuis milik satu pertemuan atau satu mata pelajaran. */
export const listAssessmentsFor = (opts: { meetingId?: string; subjectId?: string }) =>
  db
    .select()
    .from(s.assessments)
    .where(
      opts.meetingId
        ? eq(s.assessments.meetingId, opts.meetingId)
        : opts.subjectId
          ? eq(s.assessments.subjectId, opts.subjectId)
          : sql`false`,
    );

/** Jumlah soal dan total poin — dipakai untuk ringkasan tanpa membocorkan isi. */
export async function assessmentStats(assessmentId: string) {
  const [row] = await db
    .select({
      questionCount: sql<number>`count(*)::int`,
      totalPoints: sql<number>`coalesce(sum(${s.assessmentQuestions.points}), 0)::int`,
    })
    .from(s.assessmentQuestions)
    .where(eq(s.assessmentQuestions.assessmentId, assessmentId));
  return row ?? { questionCount: 0, totalPoints: 0 };
}

/**
 * Soal versi peserta — kunci jawaban dan pembahasan DIBUANG.
 * Jangan pernah mengirim baris soal mentah ke klien peserta.
 */
export function questionsForStudent(qs: Question[], shuffle = false) {
  const mapped = qs.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options: q.type === "multiple_choice" && q.options ? (JSON.parse(q.options) as string[]) : null,
    points: q.points,
    sequence: q.sequence,
  }));
  if (!shuffle) return mapped;
  // Fisher–Yates; urutan acak hanya untuk penyajian, penilaian tetap per id.
  for (let i = mapped.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mapped[i], mapped[j]] = [mapped[j], mapped[i]];
  }
  return mapped;
}

/* --- percobaan ---------------------------------------------------- */

export const listAttempts = (assessmentId: string, userId: string) =>
  db
    .select()
    .from(s.assessmentAttempts)
    .where(
      and(eq(s.assessmentAttempts.assessmentId, assessmentId), eq(s.assessmentAttempts.userId, userId)),
    )
    .orderBy(desc(s.assessmentAttempts.attemptNo));

export const findAttempt = (id: string) =>
  db.query.assessmentAttempts.findFirst({ where: eq(s.assessmentAttempts.id, id) });

/** Mulai percobaan baru, dengan pengecekan kuota dan jendela waktu. */
export async function startAttempt(assessmentId: string, userId: string) {
  const a = await findAssessment(assessmentId);
  if (!a) throw new AssessmentError("NOT_FOUND", "Kuis tidak ditemukan.");
  if (a.publishStatus !== "published") {
    throw new AssessmentError("NOT_AVAILABLE", "Kuis ini belum diterbitkan.");
  }

  const now = new Date();
  if (a.availableFrom && now < a.availableFrom) {
    throw new AssessmentError("NOT_AVAILABLE", "Kuis ini belum dibuka.");
  }
  if (a.availableUntil && now > a.availableUntil) {
    throw new AssessmentError("NOT_AVAILABLE", "Masa pengerjaan kuis ini sudah berakhir.");
  }

  const prior = await listAttempts(assessmentId, userId);

  // Percobaan yang masih berjalan dilanjutkan, bukan dibuat ganda.
  const open = prior.find((p) => p.status === "berlangsung");
  if (open) return open;

  if (a.maxAttempts > 0 && prior.length >= a.maxAttempts) {
    throw new AssessmentError(
      "NO_ATTEMPTS_LEFT",
      `Kesempatan mengerjakan sudah habis (maksimal ${a.maxAttempts}×).`,
    );
  }

  const { totalPoints } = await assessmentStats(assessmentId);
  const [row] = await db
    .insert(s.assessmentAttempts)
    .values({
      assessmentId,
      userId,
      attemptNo: prior.length + 1,
      status: "berlangsung",
      maxPoints: totalPoints,
    })
    .returning();
  return row;
}

/**
 * Kirim jawaban dan nilai bagian objektifnya.
 * Klien mengirim { questionId, response }; kebenaran ditentukan di sini.
 */
export async function submitAttempt(
  attemptId: string,
  userId: string,
  responses: { questionId: string; response: string }[],
) {
  const attempt = await findAttempt(attemptId);
  if (!attempt) throw new AssessmentError("NOT_FOUND", "Percobaan tidak ditemukan.");
  if (attempt.userId !== userId) {
    throw new AssessmentError("FORBIDDEN", "Percobaan ini bukan milik Anda.");
  }
  if (attempt.status !== "berlangsung") {
    throw new AssessmentError("ALREADY_SUBMITTED", "Percobaan ini sudah dikumpulkan.");
  }

  const questions = await listQuestions(attempt.assessmentId);
  const byId = new Map(questions.map((q) => [q.id, q]));

  // Abaikan jawaban untuk soal yang bukan milik kuis ini.
  const valid = responses.filter((r) => byId.has(r.questionId));

  let autoPoints = 0;
  const rows = questions.map((q) => {
    const given = valid.find((r) => r.questionId === q.id)?.response ?? null;

    if (!isAuto(q.type)) {
      // Esai: disimpan tanpa poin, menunggu pengajar.
      return {
        attemptId,
        questionId: q.id,
        response: given,
        earnedPoints: null as number | null,
        isCorrect: null as boolean | null,
      };
    }

    const correct = given != null && given === q.answerKey;
    if (correct) autoPoints += q.points;
    return {
      attemptId,
      questionId: q.id,
      response: given,
      earnedPoints: correct ? q.points : 0,
      isCorrect: correct,
    };
  });

  await db.delete(s.assessmentAnswers).where(eq(s.assessmentAnswers.attemptId, attemptId));
  if (rows.length) await db.insert(s.assessmentAnswers).values(rows);

  const hasEssay = questions.some((q) => !isAuto(q.type));
  const maxPoints = questions.reduce((n, q) => n + q.points, 0);

  const now = new Date();
  let patch;

  if (hasEssay) {
    // Nilai belum final selama masih ada esai yang menunggu pengajar.
    patch = {
      status: "menunggu_penilaian" as const,
      autoPoints,
      maxPoints,
      submittedAt: now,
      score: null,
      passed: null,
    };
  } else {
    // Seluruh soal objektif: nilai dan KKM bisa ditetapkan sekarang juga.
    const assessment = await findAssessment(attempt.assessmentId);
    const score = maxPoints ? Math.round((autoPoints / maxPoints) * 100) : 0;
    patch = {
      status: "dinilai" as const,
      autoPoints,
      maxPoints,
      submittedAt: now,
      gradedAt: now,
      score,
      passed: score >= (assessment?.kkm ?? 70),
    };
  }

  const [updated] = await db
    .update(s.assessmentAttempts)
    .set(patch)
    .where(eq(s.assessmentAttempts.id, attemptId))
    .returning();
  return updated;
}

/** Penilaian esai oleh pengajar; menutup percobaan bila semua sudah dinilai. */
export async function gradeEssays(
  attemptId: string,
  graderId: string,
  grades: { questionId: string; earnedPoints: number; feedback?: string }[],
) {
  const attempt = await findAttempt(attemptId);
  if (!attempt) throw new AssessmentError("NOT_FOUND", "Percobaan tidak ditemukan.");
  if (attempt.status === "berlangsung") {
    throw new AssessmentError("NOT_SUBMITTED", "Percobaan ini belum dikumpulkan.");
  }

  const questions = await listQuestions(attempt.assessmentId);
  const byId = new Map(questions.map((q) => [q.id, q]));

  for (const g of grades) {
    const q = byId.get(g.questionId);
    if (!q || isAuto(q.type)) continue; // hanya esai yang dinilai manual
    const capped = Math.max(0, Math.min(g.earnedPoints, q.points));
    await db
      .update(s.assessmentAnswers)
      .set({ earnedPoints: capped, isCorrect: capped >= q.points, feedback: g.feedback ?? null })
      .where(
        and(eq(s.assessmentAnswers.attemptId, attemptId), eq(s.assessmentAnswers.questionId, g.questionId)),
      );
  }

  const answers = await db
    .select()
    .from(s.assessmentAnswers)
    .where(eq(s.assessmentAnswers.attemptId, attemptId));

  const pending = answers.some((x) => x.earnedPoints == null);
  const earned = answers.reduce((n, x) => n + (x.earnedPoints ?? 0), 0);
  const maxPoints = questions.reduce((n, q) => n + q.points, 0);

  if (pending) {
    const [row] = await db
      .update(s.assessmentAttempts)
      .set({ status: "menunggu_penilaian" })
      .where(eq(s.assessmentAttempts.id, attemptId))
      .returning();
    return row;
  }

  const a = await findAssessment(attempt.assessmentId);
  const score = maxPoints ? Math.round((earned / maxPoints) * 100) : 0;
  const [row] = await db
    .update(s.assessmentAttempts)
    .set({
      status: "dinilai",
      score,
      passed: score >= (a?.kkm ?? 70),
      gradedAt: new Date(),
      gradedBy: graderId,
    })
    .where(eq(s.assessmentAttempts.id, attemptId))
    .returning();
  return row;
}

/**
 * Hasil satu percobaan untuk ditampilkan ke peserta.
 * Kunci jawaban hanya disertakan bila kuis mengizinkan (`showFeedback`)
 * DAN percobaan sudah selesai dinilai.
 */
export async function attemptResult(attemptId: string, forStudent = true) {
  const attempt = await findAttempt(attemptId);
  if (!attempt) throw new AssessmentError("NOT_FOUND", "Percobaan tidak ditemukan.");

  const a = await findAssessment(attempt.assessmentId);
  const questions = await listQuestions(attempt.assessmentId);
  const answers = await db
    .select()
    .from(s.assessmentAnswers)
    .where(eq(s.assessmentAnswers.attemptId, attemptId));
  const byQ = new Map(answers.map((x) => [x.questionId, x]));

  const reveal = !forStudent || (a?.showFeedback === true && attempt.status === "dinilai");

  return {
    attempt,
    assessment: a
      ? { id: a.id, title: a.title, kind: a.kind, kkm: a.kkm, showFeedback: a.showFeedback }
      : null,
    items: questions.map((q) => {
      const ans = byQ.get(q.id);
      return {
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        options: q.options ? (JSON.parse(q.options) as string[]) : null,
        points: q.points,
        response: ans?.response ?? null,
        earnedPoints: ans?.earnedPoints ?? null,
        isCorrect: ans?.isCorrect ?? null,
        feedback: ans?.feedback ?? null,
        // Dibuka hanya bila diizinkan.
        answerKey: reveal ? q.answerKey : null,
        explanation: reveal ? q.explanation : null,
      };
    }),
  };
}

/** Antrean penilaian esai untuk pengajar. */
export async function pendingGrading(assessmentIds?: string[]) {
  const rows = await db
    .select({
      attemptId: s.assessmentAttempts.id,
      assessmentId: s.assessments.id,
      assessmentTitle: s.assessments.title,
      kind: s.assessments.kind,
      kkm: s.assessments.kkm,
      userId: s.users.id,
      userName: s.users.name,
      submittedAt: s.assessmentAttempts.submittedAt,
      autoPoints: s.assessmentAttempts.autoPoints,
      maxPoints: s.assessmentAttempts.maxPoints,
    })
    .from(s.assessmentAttempts)
    .innerJoin(s.assessments, eq(s.assessmentAttempts.assessmentId, s.assessments.id))
    .innerJoin(s.users, eq(s.assessmentAttempts.userId, s.users.id))
    .where(
      assessmentIds?.length
        ? and(
            eq(s.assessmentAttempts.status, "menunggu_penilaian"),
            inArray(s.assessmentAttempts.assessmentId, assessmentIds),
          )
        : eq(s.assessmentAttempts.status, "menunggu_penilaian"),
    )
    .orderBy(asc(s.assessmentAttempts.submittedAt));
  return rows;
}

/**
 * Ringkasan nilai peserta untuk satu tahapan — dipakai portal peserta.
 *
 * Mencakup keempat tingkat penempelan: kuis pertemuan, ujian mata pelajaran,
 * evaluasi tahapan, dan asesmen tingkat program.
 */
export async function studentScores(userId: string, tahapanId: string) {
  const t = await db.query.tahapan.findFirst({ where: eq(s.tahapan.id, tahapanId) });
  if (!t) return [];

  const rows = await db
    .select({
      assessmentId: s.assessments.id,
      title: s.assessments.title,
      kind: s.assessments.kind,
      kkm: s.assessments.kkm,
      weight: s.assessments.weight,
      programId: s.assessments.programId,
      tahapanIdCol: s.assessments.tahapanId,
      subjectIdCol: s.assessments.subjectId,
      meetingIdCol: s.assessments.meetingId,
      subjectName: s.subjects.name,
      subjectSlug: s.subjects.slug,
      subjectSeq: s.subjects.sequence,
      meetingNumber: s.meetings.number,
      status: s.assessmentAttempts.status,
      score: s.assessmentAttempts.score,
      passed: s.assessmentAttempts.passed,
      attemptId: s.assessmentAttempts.id,
    })
    .from(s.assessments)
    .leftJoin(s.meetings, eq(s.assessments.meetingId, s.meetings.id))
    .leftJoin(
      s.subjects,
      sql`${s.subjects.id} = coalesce(${s.assessments.subjectId}, ${s.meetings.subjectId})`,
    )
    .leftJoin(
      s.assessmentAttempts,
      and(
        eq(s.assessmentAttempts.assessmentId, s.assessments.id),
        eq(s.assessmentAttempts.userId, userId),
      ),
    )
    .where(
      and(
        eq(s.assessments.publishStatus, "published"),
        sql`(${s.subjects.tahapanId} = ${tahapanId}
             OR ${s.assessments.tahapanId} = ${tahapanId}
             OR ${s.assessments.programId} = ${t.programId})`,
      ),
    )
    .orderBy(asc(s.subjects.sequence), asc(s.meetings.number));

  // Satu baris per kuis: ambil percobaan dengan nilai terbaik.
  const best = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const cur = best.get(r.assessmentId);
    if (!cur || (r.score ?? -1) > (cur.score ?? -1)) best.set(r.assessmentId, r);
  }

  // Beri label cakupan agar portal peserta bisa mengelompokkan dengan benar:
  // asesmen tingkat tahapan dan program tidak berada di bawah mata pelajaran.
  return [...best.values()].map((r) => ({
    ...r,
    scope: r.meetingIdCol
      ? ("meeting" as const)
      : r.subjectIdCol
        ? ("subject" as const)
        : r.tahapanIdCol
          ? ("tahapan" as const)
          : ("program" as const),
    groupName: r.meetingIdCol || r.subjectIdCol ? r.subjectName : r.tahapanIdCol ? t.name : "Program",
  }));
}
