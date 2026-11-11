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
  /* Pembayaran. Kelengkapannya dijaga `biayaLengkap` di bawah, dan oleh
     CHECK di basis data — keduanya, karena satu formulir berbayar tanpa
     rekening akan membuat pendaftar sampai di halaman kosong. */
  isPaid: z.boolean().optional().default(false),
  feeAmount: z.coerce.number().int().min(1000, "Biaya minimal Rp1.000").max(100_000_000).optional().nullable(),
  bankName: kosongJadiNull(80),
  bankAccountNumber: kosongJadiNull(60),
  bankAccountHolder: kosongJadiNull(120),
  paymentNote: kosongJadiNull(1000),
  paymentDueDays: z.coerce.number().int().min(1).max(90).optional().default(7),
});

/** Formulir berbayar wajib menyebut biaya dan rekening tujuannya. */
const biayaLengkap = (v: {
  isPaid?: boolean;
  feeAmount?: number | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountHolder?: string | null;
}) =>
  !v.isPaid ||
  Boolean(v.feeAmount && v.bankName && v.bankAccountNumber && v.bankAccountHolder);
const pesanBiaya = {
  message: "Formulir berbayar wajib mengisi biaya, nama bank, nomor rekening, dan nama pemilik",
  path: ["feeAmount"],
};

/** Rentang waktu harus masuk akal — dijaga juga oleh CHECK di basis data. */
const rentangMasukAkal = (v: { opensAt?: Date | null; closesAt?: Date | null }) =>
  !v.opensAt || !v.closesAt || v.closesAt > v.opensAt;
const pesanRentang = {
  message: "Waktu tutup harus setelah waktu buka",
  path: ["closesAt"],
};

export const formBody = formBase
  .refine(rentangMasukAkal, pesanRentang)
  .refine(biayaLengkap, pesanBiaya);
export const formPatchBody = formBase
  .partial()
  .refine(rentangMasukAkal, pesanRentang)
  .refine(biayaLengkap, pesanBiaya);

/** Kiriman dari halaman publik. */
/**
 * Kata sandi ditetapkan peserta sendiri saat mendaftar.
 *
 * Aturannya sama dengan pembuatan akun oleh admin — tidak ada jalur masuk
 * yang lebih longgar dari yang lain hanya karena pintunya berbeda.
 */
const sandiPeserta = z
  .string()
  .min(12, "Kata sandi minimal 12 karakter")
  .max(200)
  .refine((x) => x !== "TiaDemo#2026", "Jangan memakai kata sandi contoh");

export const registrationBody = z.object({
  password: sandiPeserta,
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

/* --- Pembayaran ----------------------------------------------------- */

/**
 * Unggahan bukti transfer.
 *
 * Berkas dikirim sebagai base64 di badan JSON, bukan multipart. Netlify
 * Functions menyerahkan badan permintaan sebagai satu string kepada Hono,
 * sehingga multipart harus diurai sendiri tanpa keuntungan apa pun pada
 * ukuran yang sudah dibatasi 2 MB. Batas ukuran sebenarnya diperiksa di
 * rute, terhadap jumlah byte hasil penguraian — bukan panjang string ini,
 * yang sekitar sepertiga lebih besar.
 */
export const buktiBody = z.object({
  fileName: z.string().trim().min(1, "Nama berkas wajib ada").max(200),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"], {
    message: "Bukti transfer harus berupa JPG, PNG, WebP, atau PDF",
  }),
  base64: z
    .string()
    .min(1, "Berkas kosong")
    /* Awalan `data:` dibuang bila klien mengirimkannya utuh — lebih baik
       menerima keduanya daripada menolak kiriman yang isinya sudah benar. */
    .transform((v) => v.replace(/^data:[^;]+;base64,/, ""))
    .refine((v) => /^[A-Za-z0-9+/]+={0,2}$/.test(v), "Isi berkas bukan base64 yang sah"),
});

export const pembayaranPatchBody = z.object({
  paymentStatus: z.enum(["belum_bayar", "menunggu_verifikasi", "lunas", "dibebaskan", "ditolak"]),
  paymentNote: kosongJadiNull(1000),
});
