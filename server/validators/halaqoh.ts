import { z } from "zod";
import { genderSchema } from "./registration";

/** Validasi halaqoh/rombel, penugasan pengajar, dan penempatan peserta. */

const kosongJadiNull = (maks: number) =>
  z
    .string()
    .trim()
    .max(maks)
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v));

/**
 * Jam dalam format "HH:MM", 24 jam.
 *
 * Disimpan sebagai teks dan dibandingkan sebagai teks — "HH:MM" dengan nol di
 * depan urut secara leksikografis persis seperti urutan waktunya, sehingga
 * pemeriksaan bentrok jadwal tidak perlu konversi apa pun. Format yang
 * longgar ("9:5") akan merusak sifat itu, jadi ditolak di sini.
 */
const jam = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Jam harus berformat HH:MM, mis. 19:30")
  .optional()
  .nullable()
  .transform((v) => (v === "" ? null : v));

/** 1 = Senin … 7 = Ahad. */
const hari = z.coerce
  .number()
  .int()
  .min(1, "Hari harus antara Senin dan Ahad")
  .max(7, "Hari harus antara Senin dan Ahad")
  .optional()
  .nullable();

const modeSchema = z.enum(["online", "offline", "hybrid", "mandiri"]);

/**
 * Jadwal harus lengkap atau kosong sama sekali.
 *
 * Jam mulai tanpa jam selesai tidak dapat diperiksa bentroknya dan tidak
 * dapat ditampilkan utuh; separuh jadwal lebih menyesatkan daripada tidak
 * ada jadwal.
 */
const jadwalUtuh = (v: {
  dayOfWeek?: number | null;
  startTime?: string | null;
  endTime?: string | null;
}) => {
  const terisi = [v.dayOfWeek, v.startTime, v.endTime].filter((x) => x !== null && x !== undefined);
  return terisi.length === 0 || terisi.length === 3;
};
const pesanJadwal = {
  message: "Isi hari, jam mulai, dan jam selesai sekaligus — atau kosongkan ketiganya",
  path: ["startTime"],
};

const urutJam = (v: { startTime?: string | null; endTime?: string | null }) =>
  !v.startTime || !v.endTime || v.endTime > v.startTime;
const pesanUrut = { message: "Jam selesai harus setelah jam mulai", path: ["endTime"] };

/* --- Halaqoh -------------------------------------------------------- */

const halaqohBase = z.object({
  tahapanId: z.string().uuid("Caturwulan wajib dipilih"),
  code: z
    .string()
    .trim()
    .min(1, "Kode wajib diisi")
    .max(32)
    .regex(/^[A-Za-z0-9][A-Za-z0-9 ._-]*$/, "Kode hanya boleh huruf, angka, spasi, titik, dan tanda hubung"),
  name: z.string().trim().min(2, "Nama halaqoh wajib diisi").max(160),
  gender: genderSchema.optional().nullable(),
  instructorId: z.string().uuid().optional().nullable(),
  capacity: z.coerce.number().int().min(1, "Daya tampung minimal 1").max(1000).optional().nullable(),
  dayOfWeek: hari,
  startTime: jam,
  endTime: jam,
  mode: modeSchema,
  location: kosongJadiNull(200),
  liveUrl: kosongJadiNull(400),
  waGroupUrl: kosongJadiNull(300),
  note: kosongJadiNull(1000),
  status: z.enum(["draft", "aktif", "selesai"]),
  sequence: z.coerce.number().int().min(1).max(999).optional().default(1),
});

export const halaqohBody = halaqohBase.refine(jadwalUtuh, pesanJadwal).refine(urutJam, pesanUrut);
export const halaqohPatchBody = halaqohBase
  .partial()
  .refine(jadwalUtuh, pesanJadwal)
  .refine(urutJam, pesanUrut);

export const halaqohListQuery = z.object({
  tahapanId: z.string().uuid().optional(),
  programId: z.string().uuid().optional(),
  instructorId: z.string().uuid().optional(),
});

/* --- Penugasan pengajar --------------------------------------------- */

const penugasanBase = z.object({
  halaqohId: z.string().uuid("Halaqoh wajib dipilih"),
  subjectId: z.string().uuid("Mata pelajaran wajib dipilih"),
  instructorId: z.string().uuid("Pengajar wajib dipilih"),
  dayOfWeek: hari,
  startTime: jam,
  endTime: jam,
  mode: modeSchema,
  location: kosongJadiNull(200),
  liveUrl: kosongJadiNull(400),
  note: kosongJadiNull(1000),
});

export const penugasanBody = penugasanBase.refine(jadwalUtuh, pesanJadwal).refine(urutJam, pesanUrut);
export const penugasanPatchBody = penugasanBase
  .partial()
  .refine(jadwalUtuh, pesanJadwal)
  .refine(urutJam, pesanUrut);

export const penugasanListQuery = z.object({
  halaqohId: z.string().uuid().optional(),
  instructorId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  tahapanId: z.string().uuid().optional(),
  programId: z.string().uuid().optional(),
});

/* --- Penempatan peserta --------------------------------------------- */

/**
 * Pemindahan peserta ke halaqoh.
 *
 * `halaqohId` boleh null — itulah cara mengeluarkan peserta dari rombel tanpa
 * menghapus keikutsertaannya.
 */
export const pindahBody = z.object({
  enrollmentIds: z
    .array(z.string().uuid())
    .min(1, "Pilih setidaknya satu peserta")
    .max(200, "Maksimal 200 peserta sekali pindah"),
  halaqohId: z.string().uuid().nullable(),
  /** Melewati pemeriksaan daya tampung; hanya untuk kasus yang disengaja. */
  abaikanKapasitas: z.boolean().optional().default(false),
});

export const pesertaQuery = z.object({
  tahapanId: z.string().uuid("Caturwulan wajib dipilih"),
  belumDitempatkan: z
    .enum(["ya", "tidak"])
    .optional()
    .transform((v) => v === "ya"),
});
