import { Hono } from "hono";
import { badRequest, notFound } from "../lib/errors";
import { STAFF, requireRole } from "../middleware/auth";
import * as report from "../repositories/report";
import * as academic from "../repositories/academic";
import * as learner from "../repositories/learner";
import { uuidParam } from "../validators/schemas";

/**
 * Laporan progres peserta per program.
 *
 * Terbuka untuk seluruh staf: pengajar perlu melihat perkembangan peserta
 * yang diampunya. Data pribadi yang ikut hanya nomor WhatsApp dan kota —
 * yang memang diperlukan untuk menindaklanjuti peserta yang tertinggal.
 */
export const reportRoutes = new Hono().use("*", requireRole(...STAFF));

const persen = (selesai: number, total: number) =>
  total > 0 ? Math.round((selesai / total) * 100) : 0;

reportRoutes.get("/program/:id", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);

  const program = await academic.findProgram(id.data.id);
  if (!program) return notFound(c, "Program tidak ditemukan.");

  const peserta = await report.pesertaProgram(id.data.id);
  const userIds = [...new Set(peserta.map((p) => p.userId))];

  /* Tiga metrik, tiga query — bukan tiga query per peserta. */
  const [materi, hadir, asesmen] = await Promise.all([
    report.materiPerPeserta(id.data.id, userIds),
    report.kehadiranPerPeserta(id.data.id, userIds),
    report.asesmenPerPeserta(id.data.id, userIds),
  ]);

  const petaMateri = new Map(materi.map((m) => [m.userId, m]));
  const petaHadir = new Map(hadir.map((h) => [h.userId, h]));
  const petaAsesmen = new Map(asesmen.map((a) => [a.userId, a]));

  const rows = peserta.map((p) => {
    const m = petaMateri.get(p.userId);
    const h = petaHadir.get(p.userId);
    const a = petaAsesmen.get(p.userId);
    return {
      ...p,
      materi: {
        total: m?.total ?? 0,
        selesai: m?.selesai ?? 0,
        persen: persen(m?.selesai ?? 0, m?.total ?? 0),
      },
      kehadiran: {
        hadir: h?.hadir ?? 0,
        izin: h?.izin ?? 0,
        sakit: h?.sakit ?? 0,
        alpa: h?.alpa ?? 0,
        tercatat: h?.tercatat ?? 0,
        persen: persen(h?.hadir ?? 0, h?.tercatat ?? 0),
      },
      asesmen: {
        percobaan: a?.percobaan ?? 0,
        dinilai: a?.dinilai ?? 0,
        menunggu: a?.menunggu ?? 0,
        lulus: a?.lulus ?? 0,
        rataRata: a?.rataRata ?? null,
      },
    };
  });

  /*
   * Ringkasan memakai rata-rata dari peserta yang punya materi terbit saja.
   * Memasukkan peserta tanpa materi sama sekali menarik angkanya ke bawah
   * karena alasan yang bukan tentang mereka.
   */
  const punyaMateri = rows.filter((r) => r.materi.total > 0);
  const ringkasan = {
    peserta: rows.length,
    rataMateri: punyaMateri.length
      ? Math.round(punyaMateri.reduce((n, r) => n + r.materi.persen, 0) / punyaMateri.length)
      : 0,
    selesaiPenuh: rows.filter((r) => r.materi.total > 0 && r.materi.selesai === r.materi.total).length,
    belumMulai: rows.filter((r) => r.materi.selesai === 0).length,
    adaKehadiran: rows.some((r) => r.kehadiran.tercatat > 0),
    adaAsesmen: rows.some((r) => r.asesmen.percobaan > 0),
  };

  return c.json({
    data: { program: { id: program.id, name: program.name }, ringkasan, rows },
  });
});

reportRoutes.get("/peserta/:userId", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("userId") });
  if (!id.success) return badRequest(c, id.error);

  const programId = c.req.query("programId");
  const pid = uuidParam.safeParse({ id: programId });
  if (!pid.success) return badRequest(c, pid.error);

  const [user] = await learner.findUserDetail(id.data.id);
  if (!user) return notFound(c, "Peserta tidak ditemukan.");

  const [mapel, asesmen, pendaftaran] = await Promise.all([
    report.rincianMapel(pid.data.id, id.data.id),
    report.rincianAsesmen(pid.data.id, id.data.id),
    learner.listUserEnrollments(id.data.id),
  ]);

  return c.json({
    data: {
      peserta: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        province: user.province,
      },
      pendaftaran: pendaftaran.filter((p) => p.programId === pid.data.id),
      mapel: mapel.map((m) => ({ ...m, persen: persen(m.selesai, m.total) })),
      asesmen,
    },
  });
});
