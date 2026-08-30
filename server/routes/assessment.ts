import { Hono } from "hono";
import { badRequest, notFound } from "../lib/errors";
import { ADMIN, STAFF, requireAuth, requireRole } from "../middleware/auth";
import * as learner from "../repositories/learner";
import * as svc from "../services/assessment";
import { assessmentBody, gradeBody, questionBody, submitAttemptBody, uuidParam } from "../validators/schemas";
import { db } from "../db/client";
import * as s from "../db/schema";
import { and, eq, sql } from "drizzle-orm";

const readId = (raw: string | undefined) => uuidParam.safeParse({ id: raw });

function handle(c: Parameters<typeof badRequest>[0], e: unknown) {
  if (e instanceof svc.AssessmentError) {
    const status = e.code === "NOT_FOUND" ? 404 : e.code === "FORBIDDEN" ? 403 : 409;
    return c.json({ error: { code: e.code, message: e.message } }, status);
  }
  throw e;
}

/* =================================================================
   Jalur PESERTA
   Kunci jawaban tidak pernah dikirim sebelum percobaan selesai dinilai.
   ================================================================= */

export const quizRoutes = new Hono().use("*", requireAuth());

/** Ringkasan kuis + riwayat percobaan peserta. Tanpa soal. */
quizRoutes.get("/:id", async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const user = c.get("user")!;

  const a = await svc.findAssessment(id.data.id);
  if (!a || a.publishStatus !== "published") return notFound(c, "Kuis tidak ditemukan.");

  const stats = await svc.assessmentStats(a.id);
  const attempts = await svc.listAttempts(a.id, user.id);

  return c.json({
    data: {
      id: a.id,
      title: a.title,
      kind: a.kind,
      description: a.description,
      kkm: a.kkm,
      durationMinutes: a.durationMinutes,
      maxAttempts: a.maxAttempts,
      showFeedback: a.showFeedback,
      ...stats,
      attempts: attempts.map((x) => ({
        id: x.id,
        attemptNo: x.attemptNo,
        status: x.status,
        score: x.score,
        passed: x.passed,
        submittedAt: x.submittedAt,
      })),
      attemptsLeft: a.maxAttempts === 0 ? null : Math.max(0, a.maxAttempts - attempts.length),
    },
  });
});

/** Mulai/lanjutkan percobaan; mengembalikan soal TANPA kunci. */
quizRoutes.post("/:id/start", async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const user = c.get("user")!;

  try {
    const attempt = await svc.startAttempt(id.data.id, user.id);
    const a = await svc.findAssessment(id.data.id);
    const questions = await svc.listQuestions(id.data.id);
    await learner.writeAudit(user.id, "assessment.start", "assessment", id.data.id);

    return c.json({
      data: {
        attemptId: attempt.id,
        attemptNo: attempt.attemptNo,
        durationMinutes: a?.durationMinutes ?? 0,
        startedAt: attempt.startedAt,
        // Satu-satunya jalur penyajian soal ke peserta.
        questions: svc.questionsForStudent(questions, a?.shuffleQuestions ?? false),
      },
    });
  } catch (e) {
    return handle(c, e);
  }
});

quizRoutes.post("/attempts/:id/submit", async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const body = submitAttemptBody.safeParse(await c.req.json().catch(() => ({})));
  if (!body.success) return badRequest(c, body.error);
  const user = c.get("user")!;

  try {
    const attempt = await svc.submitAttempt(id.data.id, user.id, body.data.responses);
    await learner.writeAudit(user.id, "assessment.submit", "attempt", attempt.id);
    return c.json({
      data: {
        id: attempt.id,
        status: attempt.status,
        score: attempt.score,
        passed: attempt.passed,
        autoPoints: attempt.autoPoints,
        maxPoints: attempt.maxPoints,
      },
    });
  } catch (e) {
    return handle(c, e);
  }
});

quizRoutes.get("/attempts/:id/result", async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const user = c.get("user")!;

  try {
    const attempt = await svc.findAttempt(id.data.id);
    if (!attempt) return notFound(c, "Percobaan tidak ditemukan.");
    // Peserta hanya boleh melihat hasilnya sendiri.
    if (attempt.userId !== user.id) {
      return c.json({ error: { code: "FORBIDDEN", message: "Bukan hasil milik Anda." } }, 403);
    }
    return c.json({ data: await svc.attemptResult(id.data.id, true) });
  } catch (e) {
    return handle(c, e);
  }
});

/* =================================================================
   Jalur PENGAJAR / ADMIN
   ================================================================= */

export const assessmentAdminRoutes = new Hono().use("*", requireRole(...STAFF));

const canWrite = requireRole(...ADMIN);

/** Bank soal lengkap — hanya staf. */
assessmentAdminRoutes.get("/:id/questions", async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  return c.json({ data: await svc.listQuestions(id.data.id) });
});

assessmentAdminRoutes.post("/questions", canWrite, async (c) => {
  const p = questionBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const v = p.data;
  const [row] = await db
    .insert(s.assessmentQuestions)
    .values({
      assessmentId: v.assessmentId,
      type: v.type,
      prompt: v.prompt,
      options: v.options ? JSON.stringify(v.options) : null,
      answerKey: v.type === "essay" ? null : (v.answerKey ?? null),
      explanation: v.explanation ?? null,
      points: v.points,
      sequence: v.sequence,
    })
    .returning();
  await learner.writeAudit(c.get("user")!.id, "question.create", "question", row.id);
  return c.json({ data: row }, 201);
});

assessmentAdminRoutes.patch("/questions/:id", canWrite, async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const p = questionBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const v = p.data;
  const [row] = await db
    .update(s.assessmentQuestions)
    .set({
      type: v.type,
      prompt: v.prompt,
      options: v.options ? JSON.stringify(v.options) : null,
      answerKey: v.type === "essay" ? null : (v.answerKey ?? null),
      explanation: v.explanation ?? null,
      points: v.points,
      sequence: v.sequence,
    })
    .where(eq(s.assessmentQuestions.id, id.data.id))
    .returning();
  if (!row) return notFound(c, "Soal tidak ditemukan.");
  return c.json({ data: row });
});

assessmentAdminRoutes.delete("/questions/:id", canWrite, async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const [row] = await db
    .delete(s.assessmentQuestions)
    .where(eq(s.assessmentQuestions.id, id.data.id))
    .returning();
  if (!row) return notFound(c, "Soal tidak ditemukan.");
  return c.body(null, 204);
});

/** Antrean esai yang menunggu penilaian. */
assessmentAdminRoutes.get("/grading/queue", async (c) =>
  c.json({ data: await svc.pendingGrading() }),
);

/** Detail satu percobaan, lengkap dengan kunci — untuk pengajar. */
assessmentAdminRoutes.get("/attempts/:id", async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  try {
    return c.json({ data: await svc.attemptResult(id.data.id, false) });
  } catch (e) {
    return handle(c, e);
  }
});

assessmentAdminRoutes.post("/attempts/:id/grade", async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const p = gradeBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const user = c.get("user")!;
  try {
    const row = await svc.gradeEssays(id.data.id, user.id, p.data.grades);
    await learner.writeAudit(user.id, "assessment.grade", "attempt", row.id);
    return c.json({ data: row });
  } catch (e) {
    return handle(c, e);
  }
});

/** Rekap nilai satu kuis untuk seluruh peserta. */
assessmentAdminRoutes.get("/:id/results", async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const a = await svc.findAssessment(id.data.id);
  if (!a) return notFound(c, "Kuis tidak ditemukan.");

  const rows = await db
    .select({
      attemptId: s.assessmentAttempts.id,
      userId: s.users.id,
      name: s.users.name,
      attemptNo: s.assessmentAttempts.attemptNo,
      status: s.assessmentAttempts.status,
      score: s.assessmentAttempts.score,
      passed: s.assessmentAttempts.passed,
      submittedAt: s.assessmentAttempts.submittedAt,
    })
    .from(s.assessmentAttempts)
    .innerJoin(s.users, eq(s.assessmentAttempts.userId, s.users.id))
    .where(eq(s.assessmentAttempts.assessmentId, id.data.id));

  const graded = rows.filter((r) => r.score != null);
  const avg = graded.length ? Math.round(graded.reduce((n, r) => n + (r.score ?? 0), 0) / graded.length) : null;

  return c.json({
    data: {
      assessment: { id: a.id, title: a.title, kkm: a.kkm, kind: a.kind },
      summary: {
        attempts: rows.length,
        graded: graded.length,
        pendingGrading: rows.filter((r) => r.status === "menunggu_penilaian").length,
        passed: rows.filter((r) => r.passed === true).length,
        failed: rows.filter((r) => r.passed === false).length,
        averageScore: avg,
      },
      rows,
    },
  });
});

/** Dipakai halaman Nilai: seluruh nilai satu peserta pada satu tahapan. */
export async function scoresForStudent(userId: string, tahapanId: string) {
  return svc.studentScores(userId, tahapanId);
}

export { and };

/* --- Daftar seluruh kuis satu tahapan (untuk halaman Kuis & Ujian) --- */

assessmentAdminRoutes.get("/", async (c) => {
  const tahapanId = c.req.query("tahapanId");
  if (!tahapanId) return c.json({ data: [] });

  // Kuis pertemuan dan ujian mata pelajaran digabung dalam satu daftar,
  // masing-masing membawa konteks induknya.
  const rows = await db
    .select({
      id: s.assessments.id,
      kind: s.assessments.kind,
      title: s.assessments.title,
      description: s.assessments.description,
      kkm: s.assessments.kkm,
      durationMinutes: s.assessments.durationMinutes,
      weight: s.assessments.weight,
      maxAttempts: s.assessments.maxAttempts,
      shuffleQuestions: s.assessments.shuffleQuestions,
      showFeedback: s.assessments.showFeedback,
      publishStatus: s.assessments.publishStatus,
      meetingId: s.assessments.meetingId,
      subjectId: s.assessments.subjectId,
      meetingNumber: s.meetings.number,
      meetingTitle: s.meetings.title,
      subjectName: s.subjects.name,
      subjectSlug: s.subjects.slug,
    })
    .from(s.assessments)
    .leftJoin(s.meetings, eq(s.assessments.meetingId, s.meetings.id))
    .leftJoin(
      s.subjects,
      sql`${s.subjects.id} = coalesce(${s.assessments.subjectId}, ${s.meetings.subjectId})`,
    )
    .where(eq(s.subjects.tahapanId, tahapanId));

  // Hitung soal dan percobaan per kuis dalam satu query, bukan N+1.
  const counts = await db
    .select({
      assessmentId: s.assessmentQuestions.assessmentId,
      questionCount: sql<number>`count(*)::int`,
      totalPoints: sql<number>`coalesce(sum(${s.assessmentQuestions.points}),0)::int`,
    })
    .from(s.assessmentQuestions)
    .groupBy(s.assessmentQuestions.assessmentId);

  const attempts = await db
    .select({
      assessmentId: s.assessmentAttempts.assessmentId,
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where ${s.assessmentAttempts.status} = 'menunggu_penilaian')::int`,
    })
    .from(s.assessmentAttempts)
    .groupBy(s.assessmentAttempts.assessmentId);

  const qc = new Map(counts.map((x) => [x.assessmentId, x]));
  const ac = new Map(attempts.map((x) => [x.assessmentId, x]));

  return c.json({
    data: rows.map((r) => ({
      ...r,
      questionCount: qc.get(r.id)?.questionCount ?? 0,
      totalPoints: qc.get(r.id)?.totalPoints ?? 0,
      attemptCount: ac.get(r.id)?.total ?? 0,
      pendingGrading: ac.get(r.id)?.pending ?? 0,
    })),
  });
});

/* --- CRUD kuis --- */

assessmentAdminRoutes.post("/", canWrite, async (c) => {
  const p = assessmentBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const [row] = await db.insert(s.assessments).values(p.data).returning();
  await learner.writeAudit(c.get("user")!.id, "assessment.create", "assessment", row.id);
  return c.json({ data: row }, 201);
});

assessmentAdminRoutes.patch("/:id", canWrite, async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const p = assessmentBody.partial().safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const [row] = await db
    .update(s.assessments)
    .set({ ...p.data, updatedAt: new Date() })
    .where(eq(s.assessments.id, id.data.id))
    .returning();
  if (!row) return notFound(c, "Kuis tidak ditemukan.");
  return c.json({ data: row });
});

assessmentAdminRoutes.delete("/:id", canWrite, async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const [row] = await db.delete(s.assessments).where(eq(s.assessments.id, id.data.id)).returning();
  if (!row) return notFound(c, "Kuis tidak ditemukan.");
  await learner.writeAudit(c.get("user")!.id, "assessment.delete", "assessment", id.data.id);
  return c.body(null, 204);
});
