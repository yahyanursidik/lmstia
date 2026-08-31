import { z } from "zod";

/** Validasi bank soal dan impor massalnya. */

export const questionTypeSchema = z.enum(["multiple_choice", "true_false", "essay"]);
export const difficultySchema = z.enum(["mudah", "sedang", "sulit"]);

const kosongJadiNull = (maks: number) =>
  z
    .string()
    .trim()
    .max(maks)
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v));

const dasar = z.object({
  type: questionTypeSchema,
  prompt: z.string().trim().min(3, "Pertanyaan wajib diisi").max(4000),
  /** Pilihan ganda: minimal dua opsi. Tipe lain: kosong. */
  options: z.array(z.string().trim().min(1, "Pilihan tidak boleh kosong").max(500)).optional(),
  answerKey: z.string().trim().max(500).optional().nullable(),
  explanation: kosongJadiNull(2000),
  points: z.coerce.number().int().min(1, "Poin minimal 1").max(100).default(1),
  topic: kosongJadiNull(160),
  tags: kosongJadiNull(300),
  difficulty: difficultySchema.default("sedang"),
});

/**
 * Bentuk soal harus cocok dengan tipenya.
 *
 * Diperiksa di sini agar pesannya bisa menunjuk kolom yang salah, dan sekali
 * lagi oleh CHECK di basis data agar tidak ada jalur kode yang bisa
 * melewatinya.
 */
function bentukBenar(v: z.infer<typeof dasar>, ctx: z.RefinementCtx) {
  if (v.type === "multiple_choice") {
    if (!v.options || v.options.length < 2) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Pilihan ganda perlu minimal 2 pilihan" });
      return;
    }
    const idx = Number(v.answerKey);
    if (!Number.isInteger(idx) || idx < 0 || idx >= v.options.length) {
      ctx.addIssue({
        code: "custom",
        path: ["answerKey"],
        message: `Kunci jawaban harus salah satu pilihan (1–${v.options.length})`,
      });
    }
    return;
  }

  if (v.type === "true_false") {
    if (v.answerKey !== "true" && v.answerKey !== "false") {
      ctx.addIssue({ code: "custom", path: ["answerKey"], message: "Kunci benar-salah harus BENAR atau SALAH" });
    }
    if (v.options?.length) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Benar-salah tidak memakai pilihan" });
    }
    return;
  }

  /* Esai dinilai manual: kunci jawaban justru merusak penilaian otomatis. */
  if (v.answerKey) {
    ctx.addIssue({ code: "custom", path: ["answerKey"], message: "Esai tidak boleh punya kunci jawaban" });
  }
  if (v.options?.length) {
    ctx.addIssue({ code: "custom", path: ["options"], message: "Esai tidak memakai pilihan" });
  }
}

export const bankQuestionBody = dasar.superRefine(bentukBenar);

export const bankQuestionPatchBody = dasar.partial().superRefine((v, ctx) => {
  if (v.type === undefined) return;
  bentukBenar(v as z.infer<typeof dasar>, ctx);
});

/** Impor massal — dibatasi agar satu permintaan tidak menjadi tak terbatas. */
export const bankImportBody = z.object({
  rows: z.array(bankQuestionBody).min(1, "Tidak ada soal untuk diimpor").max(500, "Maksimal 500 soal sekali impor"),
});

export const bankListQuery = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(200).optional(),
  type: questionTypeSchema.optional(),
  difficulty: difficultySchema.optional(),
  topic: z.string().trim().max(160).optional(),
});

/** Menyalin soal bank terpilih ke sebuah asesmen. */
export const bankToAssessmentBody = z.object({
  questionIds: z.array(z.string().uuid()).min(1, "Pilih minimal satu soal").max(200),
});
