import { Hono } from "hono";
import { badRequest, bentrokUnik, conflict, forbidden, notFound } from "../lib/errors";
import { ADMIN, STAFF, requireRole } from "../middleware/auth";
import * as hal from "../repositories/halaqoh";
import * as learner from "../repositories/learner";
import { uuidParam } from "../validators/schemas";
import {
  halaqohBody,
  halaqohListQuery,
  halaqohPatchBody,
  penugasanBody,
  penugasanListQuery,
  penugasanPatchBody,
  pesertaQuery,
  pindahBody,
} from "../validators/halaqoh";
import { tanpaBatas } from "../services/scope";

/**
 * Halaqoh/rombel, penugasan pengajar, dan penempatan peserta.
 *
 * Membaca dibuka untuk seluruh staf — pengajar perlu melihat rombel dan
 * jadwalnya sendiri. Menulis hanya untuk admin akademik: pembagian kelas dan
 * penugasan adalah keputusan akademik, bukan sesuatu yang diubah pengampu
 * sendiri.
 */
export const halaqohRoutes = new Hono().use("*", requireRole(...STAFF));

const hanyaAdmin = requireRole(...ADMIN);

/* --- Halaqoh -------------------------------------------------------- */

halaqohRoutes.get("/", async (c) => {
  const q = halaqohListQuery.safeParse(c.req.query());
  if (!q.success) return badRequest(c, q.error);

  const aktor = c.get("user")!;
  /*
   * Pengajar hanya melihat halaqoh yang benar-benar terkait dirinya: yang
   * dibinanya, atau yang ia ampu salah satu mata pelajarannya. Disaring di
   * server, bukan disembunyikan di tampilan — tanpa itu id rombel lain
   * tinggal ditebak.
   */
  const semua = await hal.listHalaqoh(q.data);
  if (tanpaBatas(aktor)) return c.json({ data: semua });

  const penugasan = await hal.listPenugasan({ instructorId: aktor.id });
  const miliknya = new Set(penugasan.map((p) => p.halaqohId));
  return c.json({
    data: semua.filter((h) => h.instructorId === aktor.id || miliknya.has(h.id)),
  });
});

halaqohRoutes.get("/:id", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);

  const [row] = await hal.findHalaqoh(id.data.id);
  if (!row) return notFound(c, "Halaqoh tidak ditemukan.");

  const aktor = c.get("user")!;
  const penugasan = await hal.listPenugasan({ halaqohId: row.id });
  if (
    !tanpaBatas(aktor) &&
    row.instructorId !== aktor.id &&
    !penugasan.some((p) => p.instructorId === aktor.id)
  ) {
    return forbidden(c, "Halaqoh ini bukan tanggung jawab Anda.");
  }

  /*
   * Dinamai `pesertaDaftar`, bukan `peserta`: baris halaqoh sudah membawa
   * `peserta` sebagai jumlah, dan memakai nama yang sama membuat lariknya
   * menimpa angka itu diam-diam.
   */
  const pesertaDaftar = (await hal.pesertaTahapan(row.tahapanId)).filter(
    (p) => p.halaqohId === row.id,
  );
  return c.json({ data: { ...row, penugasan, pesertaDaftar } });
});

halaqohRoutes.post("/", hanyaAdmin, async (c) => {
  const p = halaqohBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  try {
    const [row] = await hal.createHalaqoh(p.data);
    await learner.writeAudit(c.get("user")!.id, "halaqoh.create", "halaqoh", row.id);
    return c.json({ data: row }, 201);
  } catch (e) {
    if (bentrokUnik(e)) return conflict(c, "Kode halaqoh itu sudah dipakai di caturwulan ini.");
    throw e;
  }
});

halaqohRoutes.patch("/:id", hanyaAdmin, async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);
  const p = halaqohPatchBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  try {
    const [row] = await hal.updateHalaqoh(id.data.id, p.data);
    if (!row) return notFound(c, "Halaqoh tidak ditemukan.");
    await learner.writeAudit(c.get("user")!.id, "halaqoh.update", "halaqoh", row.id);
    return c.json({ data: row });
  } catch (e) {
    if (bentrokUnik(e)) return conflict(c, "Kode halaqoh itu sudah dipakai di caturwulan ini.");
    throw e;
  }
});

halaqohRoutes.delete("/:id", hanyaAdmin, async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);
  const [row] = await hal.deleteHalaqoh(id.data.id);
  if (!row) return notFound(c, "Halaqoh tidak ditemukan.");
  await learner.writeAudit(c.get("user")!.id, "halaqoh.delete", "halaqoh", row.id);
  return c.json({ data: row });
});

/* --- Penugasan pengajar --------------------------------------------- */

halaqohRoutes.get("/penugasan/daftar", async (c) => {
  const q = penugasanListQuery.safeParse(c.req.query());
  if (!q.success) return badRequest(c, q.error);

  const aktor = c.get("user")!;
  /* Pengajar hanya melihat jadwalnya sendiri, apa pun saringan yang dikirim. */
  const saring = tanpaBatas(aktor) ? q.data : { ...q.data, instructorId: aktor.id };
  return c.json({ data: await hal.listPenugasan(saring) });
});

/**
 * Jadwal pengajar yang sedang masuk.
 *
 * Rute terpisah supaya portal pengajar tidak perlu tahu id dirinya sendiri,
 * dan supaya tidak ada jalan meminta jadwal orang lain lewat parameter.
 */
halaqohRoutes.get("/penugasan/jadwal-saya", async (c) => {
  const aktor = c.get("user")!;
  return c.json({ data: await hal.listPenugasan({ instructorId: aktor.id }) });
});

halaqohRoutes.post("/penugasan", hanyaAdmin, async (c) => {
  const p = penugasanBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);

  const bentrok = await hal.jadwalBentrok({
    instructorId: p.data.instructorId,
    dayOfWeek: p.data.dayOfWeek ?? null,
    startTime: p.data.startTime ?? null,
    endTime: p.data.endTime ?? null,
  });
  if (bentrok.length) {
    return conflict(
      c,
      `Jadwal pengajar bentrok dengan ${bentrok[0]!.halaqohName} — ${bentrok[0]!.subjectName} (${bentrok[0]!.startTime}–${bentrok[0]!.endTime}).`,
      bentrok,
    );
  }

  try {
    const [row] = await hal.createPenugasan(p.data);
    await learner.writeAudit(c.get("user")!.id, "penugasan.create", "teaching_assignment", row.id);
    return c.json({ data: row }, 201);
  } catch (e) {
    if (bentrokUnik(e)) {
      return conflict(c, "Mata pelajaran itu sudah punya pengampu di halaqoh ini.");
    }
    throw e;
  }
});

halaqohRoutes.patch("/penugasan/:id", hanyaAdmin, async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);
  const p = penugasanPatchBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);

  const [lama] = await hal.findPenugasan(id.data.id);
  if (!lama) return notFound(c, "Penugasan tidak ditemukan.");

  /*
   * Bentrok diperiksa terhadap gabungan nilai lama dan baru: mengubah jamnya
   * saja tetap bisa menabrak jadwal lain, dan mengubah pengajarnya saja
   * memindahkan jadwal yang sama ke orang yang mungkin sudah sibuk.
   */
  const gabung = {
    instructorId: p.data.instructorId ?? lama.instructorId,
    dayOfWeek: p.data.dayOfWeek !== undefined ? p.data.dayOfWeek : lama.dayOfWeek,
    startTime: p.data.startTime !== undefined ? p.data.startTime : lama.startTime,
    endTime: p.data.endTime !== undefined ? p.data.endTime : lama.endTime,
  };
  const bentrok = await hal.jadwalBentrok({ ...gabung, kecualiId: id.data.id });
  if (bentrok.length) {
    return conflict(
      c,
      `Jadwal pengajar bentrok dengan ${bentrok[0]!.halaqohName} — ${bentrok[0]!.subjectName} (${bentrok[0]!.startTime}–${bentrok[0]!.endTime}).`,
      bentrok,
    );
  }

  try {
    const [row] = await hal.updatePenugasan(id.data.id, p.data);
    await learner.writeAudit(c.get("user")!.id, "penugasan.update", "teaching_assignment", row!.id);
    return c.json({ data: row });
  } catch (e) {
    if (bentrokUnik(e)) {
      return conflict(c, "Mata pelajaran itu sudah punya pengampu di halaqoh ini.");
    }
    throw e;
  }
});

halaqohRoutes.delete("/penugasan/:id", hanyaAdmin, async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);
  const [row] = await hal.deletePenugasan(id.data.id);
  if (!row) return notFound(c, "Penugasan tidak ditemukan.");
  await learner.writeAudit(c.get("user")!.id, "penugasan.delete", "teaching_assignment", row.id);
  return c.json({ data: row });
});

/* --- Pengajar & penempatan peserta ---------------------------------- */

halaqohRoutes.get("/pengajar/daftar", hanyaAdmin, async (c) =>
  c.json({ data: await hal.daftarPengajar() }),
);

halaqohRoutes.get("/peserta/daftar", hanyaAdmin, async (c) => {
  const q = pesertaQuery.safeParse(c.req.query());
  if (!q.success) return badRequest(c, q.error);
  return c.json({ data: await hal.pesertaTahapan(q.data.tahapanId, q.data.belumDitempatkan) });
});

/**
 * Memindahkan peserta ke halaqoh — atau mengeluarkannya bila `halaqohId` null.
 *
 * Daya tampung diperiksa sebelum memindahkan, dan permintaannya ditolak utuh
 * bila tidak muat. Memindahkan sebagian lalu berhenti di tengah akan
 * meninggalkan keadaan yang tidak diminta siapa pun dan sulit ditelusuri.
 */
halaqohRoutes.post("/peserta/pindah", hanyaAdmin, async (c) => {
  const p = pindahBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);

  if (p.data.halaqohId && !p.data.abaikanKapasitas) {
    const sisa = await hal.sisaDayaTampung(p.data.halaqohId);
    if (sisa !== null && p.data.enrollmentIds.length > sisa) {
      return conflict(
        c,
        `Daya tampung halaqoh tinggal ${sisa} tempat, sedangkan Anda memindahkan ${p.data.enrollmentIds.length} peserta.`,
        { sisa, diminta: p.data.enrollmentIds.length },
      );
    }
  }

  const rows = await hal.pindahkanPeserta(p.data.enrollmentIds, p.data.halaqohId);
  await learner.writeAudit(
    c.get("user")!.id,
    p.data.halaqohId ? "halaqoh.peserta_masuk" : "halaqoh.peserta_keluar",
    "halaqoh",
    p.data.halaqohId ?? "-",
  );
  return c.json({ data: { dipindahkan: rows.length } });
});
