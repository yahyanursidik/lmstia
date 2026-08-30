import { z } from "zod";
import { roleSchema } from "./schemas";

/** Validasi untuk manajemen pengguna (profil, peran, status akun). */

export const educationSchema = z.enum(["sd", "smp", "sma", "d1_d3", "d4_s1", "s2", "s3", "lainnya"]);
export const accountStatusSchema = z.enum(["aktif", "nonaktif", "ditangguhkan"]);

/** Kosong dari formulir HTML diperlakukan sebagai "tidak diisi", bukan "". */
const teksOpsional = (maks: number) =>
  z
    .string()
    .trim()
    .max(maks)
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v));

/*
 * Nomor WhatsApp sengaja divalidasi longgar: hanya angka, spasi, tanda plus,
 * tanda hubung, dan kurung. Memaksa satu format tertentu justru menolak nomor
 * sah dari luar negeri, sementara nomor tetap disimpan apa adanya.
 */
const nomorWa = z
  .string()
  .trim()
  .max(32)
  .regex(/^[+()\d][\d\s()-]*$/, "Nomor WhatsApp hanya boleh angka, spasi, +, -, dan kurung")
  .optional()
  .nullable()
  .transform((v) => (v === "" ? null : v));

export const userPatchBody = z.object({
  name: z.string().trim().min(2, "Nama wajib diisi").max(160).optional(),
  email: z.string().trim().toLowerCase().email("Alamat email tidak valid").max(200).optional(),
  role: roleSchema.optional(),
  accountStatus: accountStatusSchema.optional(),
  education: educationSchema.optional().nullable(),
  phone: nomorWa,
  country: teksOpsional(80),
  province: teksOpsional(80),
  city: teksOpsional(120),
  segment: teksOpsional(80),
});

export const userListQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(120).optional(),
  role: roleSchema.optional(),
  accountStatus: accountStatusSchema.optional(),
  programId: z.string().uuid().optional(),
  tahapanId: z.string().uuid().optional(),
});

export const suggestQuery = z.object({
  q: z.string().trim().min(1, "Kata kunci wajib diisi").max(120),
  limit: z.coerce.number().int().min(1).max(20).optional().default(8),
});
