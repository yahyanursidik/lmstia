import { z } from "zod";
import { educationSchema } from "./users";

/** Validasi formulir pendaftaran dan kiriman pendaftar. */

export const genderSchema = z.enum(["ikhwan", "akhwat"]);
export const registrationStatusSchema = z.enum(["menunggu", "disetujui", "ditolak"]);
export const formStatusSchema = z.enum(["draf", "terbit", "ditutup"]);

const slug = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Tautan hanya boleh huruf kecil, angka, dan tanda hubung");

const kosongJadiNull = (maks: number) =>
  z
    .string()
    .trim()
    .max(maks)
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v));

/**
 * Tautan grup WhatsApp.
 *
 * Dibatasi ke host undangan resmi WhatsApp supaya admin tidak keliru
 * menempelkan tautan lain, dan agar halaman tidak bisa dipakai mengarahkan
 * pendaftar ke alamat sembarangan.
 */
const tautanWa = z
  .string()
  .trim()
  .max(300)
  .refine(
    (v) => v === "" || /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+$/.test(v),
    "Gunakan tautan undangan grup WhatsApp (https://chat.whatsapp.com/…)",
  )
  .optional()
  .nullable()
  .transform((v) => (v === "" ? null : v));

const nomorWa = z
  .string()
  .trim()
  .min(6, "Nomor WhatsApp wajib diisi")
  .max(32)
  .regex(/^[+()\d][\d\s()-]*$/, "Nomor WhatsApp hanya boleh angka, spasi, +, -, dan kurung");

const waktu = z
  .string()
  .datetime({ offset: true })
  .optional()
  .nullable()
  .transform((v) => (v ? new Date(v) : null));

const formBase = z.object({
  programId: z.string().uuid("Program wajib dipilih"),
  slug,
  title: z.string().trim().min(2, "Judul wajib diisi").max(200),
  headline: kosongJadiNull(300),
  description: kosongJadiNull(4000),
  commitmentText: z.string().trim().min(10, "Pernyataan istiqomah wajib diisi").max(1000),
  waIkhwanUrl: tautanWa,
  waAkhwatUrl: tautanWa,
  opensAt: waktu,
  closesAt: waktu,
  status: formStatusSchema,
});

/** Rentang waktu harus masuk akal — dijaga juga oleh CHECK di basis data. */
const rentangMasukAkal = (v: { opensAt?: Date | null; closesAt?: Date | null }) =>
  !v.opensAt || !v.closesAt || v.closesAt > v.opensAt;
const pesanRentang = {
  message: "Waktu tutup harus setelah waktu buka",
  path: ["closesAt"],
};

export const formBody = formBase.refine(rentangMasukAkal, pesanRentang);
export const formPatchBody = formBase.partial().refine(rentangMasukAkal, pesanRentang);

/** Kiriman dari halaman publik. */
export const registrationBody = z.object({
  name: z.string().trim().min(2, "Nama lengkap wajib diisi").max(160),
  email: z.string().trim().toLowerCase().email("Alamat email tidak valid").max(200),
  phone: nomorWa,
  gender: genderSchema,
  country: kosongJadiNull(80),
  province: kosongJadiNull(80),
  city: kosongJadiNull(120),
  education: educationSchema.optional().nullable(),
  segment: kosongJadiNull(80),
  reason: kosongJadiNull(1000),
  /*
   * Harus benar-benar `true`. Ini bukan sekadar kotak centang tampilan:
   * pendaftaran tanpa persetujuan istiqomah tidak boleh tercatat sama sekali.
   */
  commitmentAgreed: z.literal(true, { message: "Pernyataan istiqomah harus disetujui" }),
});

export const registrationPatchBody = z.object({
  status: registrationStatusSchema.optional(),
  note: kosongJadiNull(1000),
});

export const registrationListQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
  formId: z.string().uuid().optional(),
  programId: z.string().uuid().optional(),
  status: registrationStatusSchema.optional(),
  gender: genderSchema.optional(),
  q: z.string().trim().max(120).optional(),
});
