import { Hono } from "hono";
import { badRequest, notFound } from "../lib/errors";
import { ADMIN, STAFF, requireRole } from "../middleware/auth";
import * as academic from "../repositories/academic";
import * as learner from "../repositories/learner";
import * as service from "../services/learning";
import {
  assessmentBody,
  assessmentPatchBody,
  materialBody,
  materialPatchBody,
  meetingBody,
  programBody,
  subjectBody,
  tahapanBody,
  uuidParam,
} from "../validators/schemas";

/**
 * CRUD berjenjang untuk hierarki konten.
 *
 * Membaca: seluruh staf (pengajar boleh melihat kurikulum yang diampu).
 * Menulis: hanya academic_admin / super_admin — pengajar tidak boleh mengubah
 * struktur kurikulum (10-AUTH-RBAC.md).
 */

export const contentRoutes = new Hono().use("*", requireRole(...STAFF));

const canWrite = requireRole(...ADMIN);

/** Empty strings from HTML forms should land as NULL, not "". */
function clean<T extends Record<string, unknown>>(v: T): T {
  const out = { ...v };
  for (const k of Object.keys(out)) {
    if (out[k] === "") (out as Record<string, unknown>)[k] = null;
  }
  return out;
}

const readId = (raw: string | undefined) => uuidParam.safeParse({ id: raw });

/* --- Program ------------------------------------------------------ */

contentRoutes.get("/programs", async (c) => c.json({ data: await academic.listPrograms() }));

contentRoutes.post("/programs", canWrite, async (c) => {
  const p = programBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const [row] = await academic.createProgram(clean(p.data));
  await learner.writeAudit(c.get("user")!.id, "program.create", "program", row.id);
  return c.json({ data: row }, 201);
});

contentRoutes.patch("/programs/:id", canWrite, async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const p = programBody.partial().safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const [row] = await academic.updateProgram(id.data.id, clean(p.data));
  if (!row) return notFound(c, "Program tidak ditemukan.");
  await learner.writeAudit(c.get("user")!.id, "program.update", "program", row.id);
  return c.json({ data: row });
});

contentRoutes.delete("/programs/:id", canWrite, async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const [row] = await academic.deleteProgram(id.data.id);
  if (!row) return notFound(c, "Program tidak ditemukan.");
  await learner.writeAudit(c.get("user")!.id, "program.delete", "program", id.data.id);
  return c.body(null, 204);
});

/* --- Tahapan ------------------------------------------------------ */

contentRoutes.get("/tahapan", async (c) => {
  const programId = c.req.query("programId");
  return c.json({ data: await academic.listTahapan(programId) });
});

contentRoutes.post("/tahapan", canWrite, async (c) => {
  const p = tahapanBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const [row] = await academic.createTahapan(clean(p.data));
  await learner.writeAudit(c.get("user")!.id, "tahapan.create", "tahapan", row.id);
  return c.json({ data: row }, 201);
});

contentRoutes.patch("/tahapan/:id", canWrite, async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const p = tahapanBody.partial().safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const [row] = await academic.updateTahapan(id.data.id, clean(p.data));
  if (!row) return notFound(c, "Tahapan tidak ditemukan.");
  return c.json({ data: row });
});

contentRoutes.delete("/tahapan/:id", canWrite, async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const [row] = await academic.deleteTahapan(id.data.id);
  if (!row) return notFound(c, "Tahapan tidak ditemukan.");
  return c.body(null, 204);
});

/** Pohon konten satu tahapan — dipakai halaman Kurikulum admin. */
contentRoutes.get("/tahapan/:id/tree", async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const t = await academic.findTahapan(id.data.id);
  if (!t) return notFound(c, "Tahapan tidak ditemukan.");
  return c.json({
    data: {
      tahapan: t,
      subjects: await academic.contentTree(t.id),
      summary: await service.getCurriculumSummary(t.id),
    },
  });
});

/* --- Mata Pelajaran ----------------------------------------------- */

contentRoutes.get("/subjects", async (c) => {
  const tahapanId = c.req.query("tahapanId");
  if (!tahapanId) return c.json({ data: [] });
  return c.json({ data: await academic.listSubjects(tahapanId) });
});

contentRoutes.post("/subjects", canWrite, async (c) => {
  const p = subjectBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const [row] = await academic.createSubject(clean(p.data));
  await learner.writeAudit(c.get("user")!.id, "subject.create", "subject", row.id);
  return c.json({ data: row }, 201);
});

contentRoutes.patch("/subjects/:id", canWrite, async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const p = subjectBody.partial().safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const [row] = await academic.updateSubject(id.data.id, clean(p.data));
  if (!row) return notFound(c, "Mata pelajaran tidak ditemukan.");
  return c.json({ data: row });
});

contentRoutes.delete("/subjects/:id", canWrite, async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const [row] = await academic.deleteSubject(id.data.id);
  if (!row) return notFound(c, "Mata pelajaran tidak ditemukan.");
  return c.body(null, 204);
});

/* --- Pertemuan ------------------------------------------------------ */

contentRoutes.get("/meetings", async (c) => {
  const subjectId = c.req.query("subjectId");
  if (!subjectId) return c.json({ data: [] });
  return c.json({ data: await academic.listMeetings(subjectId) });
});

contentRoutes.get("/meetings/:id", async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const m = await academic.findMeeting(id.data.id);
  if (!m) return notFound(c, "Pertemuan tidak ditemukan.");
  return c.json({
    data: {
      ...m,
      materials: await academic.listMaterials(m.id),
      assessments: await academic.listAssessments(m.id),
    },
  });
});

contentRoutes.post("/meetings", canWrite, async (c) => {
  const p = meetingBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const [row] = await academic.createMeeting(clean(p.data));
  await learner.writeAudit(c.get("user")!.id, "meeting.create", "meeting", row.id);
  return c.json({ data: row }, 201);
});

contentRoutes.patch("/meetings/:id", canWrite, async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const p = meetingBody.partial().safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const [row] = await academic.updateMeeting(id.data.id, clean(p.data));
  if (!row) return notFound(c, "Pertemuan tidak ditemukan.");
  return c.json({ data: row });
});

contentRoutes.delete("/meetings/:id", canWrite, async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const [row] = await academic.deleteMeeting(id.data.id);
  if (!row) return notFound(c, "Pertemuan tidak ditemukan.");
  return c.body(null, 204);
});

/* --- Materi ---------------------------------------------------------- */

contentRoutes.get("/materials", async (c) => {
  const meetingId = c.req.query("meetingId");
  if (!meetingId) return c.json({ data: [] });
  return c.json({ data: await academic.listMaterials(meetingId) });
});

contentRoutes.post("/materials", canWrite, async (c) => {
  const p = materialBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const [row] = await academic.createMaterial(clean(p.data));
  await learner.writeAudit(c.get("user")!.id, "material.create", "material", row.id);
  return c.json({ data: row }, 201);
});

contentRoutes.patch("/materials/:id", canWrite, async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const p = materialPatchBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const [row] = await academic.updateMaterial(id.data.id, clean(p.data));
  if (!row) return notFound(c, "Materi tidak ditemukan.");
  return c.json({ data: row });
});

contentRoutes.delete("/materials/:id", canWrite, async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const [row] = await academic.deleteMaterial(id.data.id);
  if (!row) return notFound(c, "Materi tidak ditemukan.");
  return c.body(null, 204);
});

/* --- Kuis / Ujian ----------------------------------------------------- */

contentRoutes.get("/assessments", async (c) => {
  const meetingId = c.req.query("meetingId");
  if (!meetingId) return c.json({ data: [] });
  return c.json({ data: await academic.listAssessments(meetingId) });
});

contentRoutes.post("/assessments", canWrite, async (c) => {
  const p = assessmentBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const [row] = await academic.createAssessment(clean(p.data));
  await learner.writeAudit(c.get("user")!.id, "assessment.create", "assessment", row.id);
  return c.json({ data: row }, 201);
});

contentRoutes.patch("/assessments/:id", canWrite, async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const p = assessmentPatchBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const [row] = await academic.updateAssessment(id.data.id, clean(p.data));
  if (!row) return notFound(c, "Kuis tidak ditemukan.");
  return c.json({ data: row });
});

contentRoutes.delete("/assessments/:id", canWrite, async (c) => {
  const id = readId(c.req.param("id"));
  if (!id.success) return badRequest(c, id.error);
  const [row] = await academic.deleteAssessment(id.data.id);
  if (!row) return notFound(c, "Kuis tidak ditemukan.");
  return c.body(null, 204);
});

/* --- pendukung --------------------------------------------------------- */

contentRoutes.get("/instructors", async (c) => c.json({ data: await learner.listInstructors() }));

contentRoutes.get("/overview", async (c) => c.json({ data: await service.getAdminOverview() }));

contentRoutes.get("/participants", async (c) => {
  const t = await service.getRunningTahapanOrThrow();
  return c.json({ data: await learner.listEnrollments(t.id) });
});
