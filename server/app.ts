/**
 * Definisi aplikasi Hono — tanpa memulai server.
 *
 * Dipisah dari `index.ts` supaya app yang sama dipakai dua tempat tanpa
 * menduplikasi rute: proses Node saat pengembangan lokal, dan Netlify
 * Function saat produksi.
 */
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { ZodError } from "zod";

import { identify, requireAuth } from "./middleware/auth";
import { badRequest, notFound, serverError } from "./lib/errors";
import * as academic from "./repositories/academic";
import * as learner from "./repositories/learner";
import * as service from "./services/learning";
import { authRoutes } from "./routes/auth";
import { contentRoutes } from "./routes/content";
import { assessmentAdminRoutes, quizRoutes } from "./routes/assessment";
import { userRoutes } from "./routes/users";
import { daftarRoutes, registrationAdminRoutes } from "./routes/registration";
import * as assess from "./services/assessment";
import { bookmarkBody, noteBody, slugParam, uuidParam } from "./validators/schemas";

const app = new Hono().basePath("/api/v1");

app.use("*", logger());

/*
 * Pada deployment satu domain (Netlify Function di /api/*), CORS tidak pernah
 * ikut bermain karena permintaan bukan lintas asal. Aturan ini hanya penting
 * saat pengembangan lokal (Vite di :5173, API di :8787) atau bila API
 * dipasang di domain terpisah — untuk itu daftarnya dapat diisi lewat env,
 * bukan ditanam keras.
 */
const asalDiizinkan = (process.env.CORS_ORIGIN ?? "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  "*",
  cors({
    origin: asalDiizinkan,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);
app.use("*", identify);

app.get("/health", (c) => c.json({ ok: true, service: "tia-api" }));

app.route("/auth", authRoutes);

/* --- Publik: Program → Tahapan → Mata Pelajaran ------------------ */

app.get("/programs", async (c) => c.json({ data: await academic.listPrograms() }));

app.get("/tahapan", async (c) => c.json({ data: await academic.listTahapan(undefined, true) }));

app.get("/tahapan/:slug", async (c) => {
  const p = slugParam.safeParse({ slug: c.req.param("slug") });
  if (!p.success) return badRequest(c, p.error);
  const t = await academic.findTahapanBySlug(p.data.slug);
  if (!t || !t.isPublic) return notFound(c, "Tahapan tidak ditemukan.");
  return c.json({ data: { ...t, subjects: await academic.listSubjects(t.id) } });
});

app.get("/subjects/:slug", async (c) => {
  const subject = await academic.findSubjectBySlug(c.req.param("slug"));
  if (!subject) return notFound(c, "Mata pelajaran tidak ditemukan.");
  return c.json({ data: { ...subject, meetings: await academic.listMeetings(subject.id) } });
});

/* --- Jadwal (pertemuan terjadwal) -------------------------------- */

app.get("/jadwal", async (c) => c.json({ data: await academic.listScheduledMeetings() }));

/* --- Peserta (/me) ------------------------------------------------ */

const me = new Hono().use("*", requireAuth());

me.get("/", (c) => c.json({ data: c.get("user") }));

me.get("/dashboard", async (c) => c.json({ data: await service.getDashboard(c.get("user")!.id) }));

me.get("/next-learning-action", async (c) =>
  c.json({ data: await service.getNextLearningAction(c.get("user")!.id) }),
);

me.get("/progress", async (c) => {
  const user = c.get("user")!;
  const t = await service.getRunningTahapanOrThrow();
  const [subjects, persen] = await Promise.all([
    academic.listSubjects(t.id),
    service.subjectProgressMap(user.id, t.id),
  ]);
  return c.json({
    data: {
      tahapan: t.name,
      subjects: subjects.map((s) => ({ slug: s.slug, name: s.name, percent: persen.get(s.id) ?? 0 })),
    },
  });
});

me.get("/catch-up", async (c) => c.json({ data: await service.getCatchUpPath(c.get("user")!.id) }));

me.get("/bookmarks", async (c) => c.json({ data: await learner.listBookmarks(c.get("user")!.id) }));

me.post("/bookmarks", async (c) => {
  const user = c.get("user")!;
  const p = bookmarkBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const [row] = await learner.addBookmark(user.id, p.data.materialId);
  await learner.writeAudit(user.id, "bookmark.create", "material", p.data.materialId);
  return c.json({ data: row ?? { materialId: p.data.materialId } }, 201);
});

me.delete("/bookmarks/:id", async (c) => {
  const user = c.get("user")!;
  const p = uuidParam.safeParse({ id: c.req.param("id") });
  if (!p.success) return badRequest(c, p.error);
  await learner.removeBookmark(user.id, p.data.id);
  return c.body(null, 204);
});

me.get("/notes", async (c) => c.json({ data: await learner.listNotes(c.get("user")!.id) }));

me.post("/notes", async (c) => {
  const user = c.get("user")!;
  const p = noteBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  const [row] = await learner.createNote(user.id, p.data.materialId ?? null, p.data.body);
  return c.json({ data: row }, 201);
});

me.get("/nilai", async (c) => {
  const user = c.get("user")!;
  const t = await service.getRunningTahapanOrThrow();
  return c.json({ data: await assess.studentScores(user.id, t.id) });
});


/** Daftar pertemuan satu mata pelajaran beserta progres pemanggil. */
me.get("/kelas/:slug", async (c) =>
  c.json({ data: await service.getKelas(c.get("user")!.id, c.req.param("slug")) }),
);

/**
 * Unit belajar satu pertemuan. Berada di bawah `/me` karena isinya bergantung
 * pada progres pemanggil, bukan konten publik semata.
 */
me.get("/kelas/:slug/pertemuan/:number", async (c) => {
  const nomor = Number(c.req.param("number"));
  if (!Number.isInteger(nomor) || nomor < 0) {
    return notFound(c, "Nomor pertemuan tidak valid.");
  }
  const data = await service.getUnitBelajar(c.get("user")!.id, c.req.param("slug"), nomor);
  return c.json({ data });
});
app.route("/me", me);

/* --- Materi (progres peserta) -------------------------------------- */

app.get("/materials/:id", requireAuth(), async (c) => {
  const p = uuidParam.safeParse({ id: c.req.param("id") });
  if (!p.success) return badRequest(c, p.error);
  const row = await academic.findMaterial(p.data.id);
  return row ? c.json({ data: row }) : notFound(c, "Materi tidak ditemukan.");
});

app.post("/materials/:id/start", requireAuth(), async (c) => {
  const p = uuidParam.safeParse({ id: c.req.param("id") });
  if (!p.success) return badRequest(c, p.error);
  return c.json({ data: await learner.setMaterialProgress(c.get("user")!.id, p.data.id, "in_progress") });
});

app.post("/materials/:id/complete", requireAuth(), async (c) => {
  const user = c.get("user")!;
  const p = uuidParam.safeParse({ id: c.req.param("id") });
  if (!p.success) return badRequest(c, p.error);
  const row = await learner.setMaterialProgress(user.id, p.data.id, "completed");
  await learner.writeAudit(user.id, "material.complete", "material", p.data.id);
  return c.json({ data: row });
});

/* --- Admin (CRUD hierarki konten) ---------------------------------- */

app.route("/kuis", quizRoutes);
app.route("/daftar", daftarRoutes);
app.route("/admin/registrations", registrationAdminRoutes);
app.route("/admin/users", userRoutes);
app.route("/admin/assessments", assessmentAdminRoutes);
app.route("/admin", contentRoutes);

/* --- penanganan galat ----------------------------------------------- */

app.onError((err, c) => {
  if (err instanceof ZodError) return badRequest(c, err);
  if (err instanceof service.NotFoundError) return notFound(c, err.message);
  return serverError(c, err);
});

app.notFound((c) => notFound(c, "Endpoint tidak ditemukan."));


export default app;
