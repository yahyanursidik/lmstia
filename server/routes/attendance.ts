import { Hono } from "hono";
import { z } from "zod";
import { badRequest, notFound } from "../lib/errors";
import { ADMIN, STAFF, requireRole } from "../middleware/auth";
import * as att from "../repositories/attendance";
import * as learner from "../repositories/learner";
import * as service from "../services/learning";
import { uuidParam } from "../validators/schemas";
import { bolehMapel, bolehPertemuan } from "../services/scope";

/**
 * Kehadiran.
 *
 * Membaca: seluruh staf — pengajar perlu melihat siapa yang hadir di kelasnya.
 * Menulis: pengajar juga, karena merekalah yang mengambil kehadiran; itu
 * berbeda dari konten kurikulum yang hanya boleh diubah admin akademik.
 */
export const attendanceRoutes = new Hono().use("*", requireRole(...STAFF));

const statusSchema = z.enum(["hadir", "izin", "sakit", "alpa"]);
const channelSchema = z.enum(["daring", "luring"]);

const simpanBody = z.object({
  rows: z
    .array(
      z.object({
        userId: z.string().uuid(),
        status: statusSchema,
        channel: channelSchema.optional().nullable(),
        note: z.string().trim().max(500).optional().nullable(),
      }),
    )
    .min(1, "Tidak ada baris kehadiran")
    .max(500),
});

const terlarang = (c: Parameters<typeof notFound>[0]) =>
  c.json(
    {
      error: {
        code: "FORBIDDEN",
        message: "Mata pelajaran ini bukan yang Anda ampu.",
      },
    },
    403,
  );

/** Pertemuan satu mata pelajaran yang layak diambil kehadirannya. */
attendanceRoutes.get("/pertemuan", async (c) => {
  const subjectId = c.req.query("subjectId");
  const p = uuidParam.safeParse({ id: subjectId });
  if (!p.success) return badRequest(c, p.error);
  if (!(await bolehMapel(c.get("user")!, p.data.id))) return terlarang(c);
  return c.json({ data: await att.pertemuanTerjadwal(p.data.id) });
});

/** Daftar hadir satu pertemuan: seluruh peserta, tercatat maupun belum. */
attendanceRoutes.get("/pertemuan/:id", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);

  if (!(await bolehPertemuan(c.get("user")!, id.data.id))) return terlarang(c);

  const hasil = await att.daftarHadir(id.data.id);
  if (!hasil) return notFound(c, "Pertemuan tidak ditemukan.");

  const { pertemuan, peserta } = hasil;
  return c.json({
    data: {
      pertemuan,
      /*
       * Kanal hanya ditanyakan pada pertemuan hybrid. Pada pertemuan daring
       * atau luring murni, jawabannya sudah ditentukan modenya — menanyakannya
       * lagi hanya menambah langkah yang bisa salah diisi.
       */
      perluKanal: pertemuan.mode === "hybrid",
      kanalBawaan:
        pertemuan.mode === "online" ? "daring" : pertemuan.mode === "offline" ? "luring" : null,
      peserta,
      ringkasan: {
        peserta: peserta.length,
        tercatat: peserta.filter((p) => p.tercatat).length,
        hadir: peserta.filter((p) => p.status === "hadir").length,
        daring: peserta.filter((p) => p.channel === "daring").length,
        luring: peserta.filter((p) => p.channel === "luring").length,
      },
    },
  });
});

attendanceRoutes.post("/pertemuan/:id", requireRole(...STAFF), async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);

  /* Menulis kehadiran kelas yang bukan diampu adalah pemalsuan catatan. */
  if (!(await bolehPertemuan(c.get("user")!, id.data.id))) return terlarang(c);

  const hasil = await att.daftarHadir(id.data.id);
  if (!hasil) return notFound(c, "Pertemuan tidak ditemukan.");

  const p = simpanBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);

  /*
   * Hanya peserta yang benar-benar terdaftar pada tahapan ini yang boleh
   * dicatat. Tanpa penyaringan ini, id sembarangan dapat menyelipkan baris
   * kehadiran bagi orang yang tidak mengikuti kelasnya.
   */
  const terdaftar = new Set(hasil.peserta.map((x) => x.userId));
  const asing = p.data.rows.filter((r) => !terdaftar.has(r.userId));
  if (asing.length) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: `${asing.length} peserta tidak terdaftar pada caturwulan pertemuan ini.`,
        },
      },
      400,
    );
  }

  const aktor = c.get("user")!;
  const rows = await att.simpanKehadiran(id.data.id, p.data.rows, aktor.id);
  await learner.writeAudit(aktor.id, "attendance.record", "meeting", id.data.id);
  return c.json({ data: { tersimpan: rows.length } });
});

/** Menghapus catatan kehadiran beberapa peserta pada satu pertemuan. */
attendanceRoutes.delete("/pertemuan/:id", requireRole(...ADMIN), async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);

  const p = z
    .object({ userIds: z.array(z.string().uuid()).min(1).max(500) })
    .safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);

  const rows = await att.hapusKehadiran(id.data.id, p.data.userIds);
  await learner.writeAudit(c.get("user")!.id, "attendance.delete", "meeting", id.data.id);
  return c.json({ data: { dihapus: rows.length } });
});

/** Rekap kehadiran satu caturwulan; bawaannya yang sedang berjalan. */
attendanceRoutes.get("/rekap", async (c) => {
  const tahapanId = c.req.query("tahapanId");
  if (tahapanId) {
    const p = uuidParam.safeParse({ id: tahapanId });
    if (!p.success) return badRequest(c, p.error);
    return c.json({ data: { rows: await att.rekapTahapan(p.data.id) } });
  }
  const t = await service.getRunningTahapanOrThrow();
  return c.json({ data: { tahapan: t.name, tahapanId: t.id, rows: await att.rekapTahapan(t.id) } });
});
