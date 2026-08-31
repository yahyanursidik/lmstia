import { Hono } from "hono";
import { badRequest, notFound } from "../lib/errors";
import { ADMIN, STAFF, requireRole } from "../middleware/auth";
import * as bank from "../repositories/bank";
import * as academic from "../repositories/academic";
import * as learner from "../repositories/learner";
import { uuidParam } from "../validators/schemas";
import {
  bankImportBody,
  bankListQuery,
  bankQuestionBody,
  bankQuestionPatchBody,
  bankToAssessmentBody,
} from "../validators/bank";

/**
 * Bank soal.
 *
 * Membaca: seluruh staf, karena pengajar perlu menyusun asesmen dari bank.
 * Menulis: hanya academic_admin dan super_admin, sejalan dengan aturan konten
 * lain (10-AUTH-RBAC.md).
 */
export const bankRoutes = new Hono().use("*", requireRole(...STAFF));

const canWrite = requireRole(...ADMIN);

/** `options` disimpan sebagai JSON; klien menerima array, bukan string. */
const keluar = <T extends { options: string | null }>(row: T) => ({
  ...row,
  options: row.options ? (JSON.parse(row.options) as string[]) : null,
});

const masuk = (v: { options?: string[] }) =>
  v.options && v.options.length ? JSON.stringify(v.options) : null;

bankRoutes.get("/", async (c) => {
  const p = bankListQuery.safeParse(c.req.query());
  if (!p.success) return badRequest(c, p.error);
  const { page, perPage, ...filter } = p.data;
  const { rows, total } = await bank.listPaged(filter, page, perPage);
  return c.json({
    data: rows.map(keluar),
    meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
  });
});

bankRoutes.get("/topics", async (c) =>
  c.json({ data: (await bank.listTopics()).map((t) => t.topic).filter(Boolean) }),
);

bankRoutes.get("/:id", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);
  const row = await bank.findQuestion(id.data.id);
  return row ? c.json({ data: keluar(row) }) : notFound(c, "Soal tidak ditemukan.");
});

bankRoutes.post("/", canWrite, async (c) => {
  const p = bankQuestionBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const aktor = c.get("user")!;
  const [row] = await bank.createQuestion({
    ...p.data,
    options: masuk(p.data),
    answerKey: p.data.answerKey ?? null,
    createdBy: aktor.id,
  });
  await learner.writeAudit(aktor.id, "bank_question.create", "question_bank", row.id);
  return c.json({ data: keluar(row) }, 201);
});

/**
 * Impor massal.
 *
 * Seluruh baris divalidasi lebih dulu; bila ada satu yang salah, tidak ada
 * yang tersimpan. Impor separuh jalan meninggalkan bank dalam keadaan yang
 * sulit ditelusuri — lebih baik ditolak seluruhnya dengan pesan per baris.
 */
bankRoutes.post("/import", canWrite, async (c) => {
  const p = bankImportBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);

  const aktor = c.get("user")!;
  const rows = await bank.createMany(
    p.data.rows.map((r) => ({
      ...r,
      options: masuk(r),
      answerKey: r.answerKey ?? null,
      createdBy: aktor.id,
    })),
  );
  await learner.writeAudit(aktor.id, "bank_question.import", "question_bank");
  return c.json({ data: { diimpor: rows.length } }, 201);
});

bankRoutes.patch("/:id", canWrite, async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);

  const p = bankQuestionPatchBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);

  const nilai: Record<string, unknown> = { ...p.data };
  if (p.data.options !== undefined) nilai.options = masuk(p.data as { options?: string[] });

  const [row] = await bank.updateQuestion(id.data.id, nilai);
  if (!row) return notFound(c, "Soal tidak ditemukan.");
  await learner.writeAudit(c.get("user")!.id, "bank_question.update", "question_bank", row.id);
  return c.json({ data: keluar(row) });
});

bankRoutes.delete("/:id", canWrite, async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);
  const [row] = await bank.deleteQuestion(id.data.id);
  if (!row) return notFound(c, "Soal tidak ditemukan.");
  await learner.writeAudit(c.get("user")!.id, "bank_question.delete", "question_bank", id.data.id);
  return c.body(null, 204);
});

/** Menyalin soal terpilih ke satu asesmen. */
bankRoutes.post("/to-assessment/:assessmentId", canWrite, async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("assessmentId") });
  if (!id.success) return badRequest(c, id.error);

  const asesmen = await academic.findAssessment(id.data.id);
  if (!asesmen) return notFound(c, "Kuis atau ujian tidak ditemukan.");

  const p = bankToAssessmentBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);

  const rows = await bank.salinKeAsesmen(id.data.id, p.data.questionIds);
  await learner.writeAudit(
    c.get("user")!.id,
    "assessment.questions_from_bank",
    "assessment",
    id.data.id,
  );
  return c.json({ data: { disalin: rows.length } }, 201);
});
