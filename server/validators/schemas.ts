import { z } from "zod";

/** Setiap mutasi divalidasi dengan Zod sebelum mencapai service. */

export const roleSchema = z.enum(["student", "instructor", "academic_admin", "super_admin"]);
export type Role = z.infer<typeof roleSchema>;

export const uuidParam = z.object({ id: z.string().uuid("id harus berupa UUID") });
export const slugParam = z.object({ slug: z.string().min(1).max(120) });

export const progressStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
  "needs_review",
]);

const publishStatus = z.enum(["draft", "review", "published"]);
const slug = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug hanya boleh huruf kecil, angka, dan tanda hubung");

/* --- Program ----------------------------------------------------- */

export const programBody = z.object({
  name: z.string().min(2, "Nama program wajib diisi").max(200),
  slug,
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  sequence: z.number().int().min(1).optional(),
});

/* --- Tahapan ----------------------------------------------------- */

export const tahapanBody = z.object({
  programId: z.string().uuid("programId harus berupa UUID"),
  code: z.string().min(1).max(40),
  slug,
  name: z.string().min(2, "Nama tahapan wajib diisi").max(200),
  title: z.string().max(200).optional().nullable(),
  subtitle: z.string().max(300).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  durationWeeks: z.number().int().min(1).max(104).optional(),
  status: z.enum(["draft", "open", "running", "closed"]).optional(),
  isPublic: z.boolean().optional(),
  sequence: z.number().int().min(1),
});

/* --- Mata Pelajaran ---------------------------------------------- */

export const subjectBody = z.object({
  tahapanId: z.string().uuid("tahapanId harus berupa UUID"),
  code: z.string().min(1).max(40),
  slug,
  name: z.string().min(2, "Nama mata pelajaran wajib diisi").max(200),
  description: z.string().max(2000).optional().nullable(),
  role: z.enum(["INTENSIVE", "FOUNDATION", "COMPANION"]),
  deliveryModel: z.string().max(300).optional().nullable(),
  weeklyLoad: z.string().max(100).optional().nullable(),
  instructorId: z.string().uuid().optional().nullable(),
  sequence: z.number().int().min(1),
});

/* --- Pertemuan ---------------------------------------------------- */

export const meetingBody = z.object({
  subjectId: z.string().uuid("subjectId harus berupa UUID"),
  number: z.number().int().min(0).max(200),
  title: z.string().min(2, "Judul pertemuan wajib diisi").max(300),
  description: z.string().max(2000).optional().nullable(),
  objectives: z.string().max(2000).optional().nullable(),
  type: z.enum(["ORIENTATION", "REGULAR", "REVIEW", "ASSESSMENT", "BREAK"]).optional(),

  mode: z.enum(["online", "offline", "hybrid", "mandiri"]).optional(),
  liveUrl: z.string().url("Link live harus berupa URL yang valid").max(500).optional().nullable().or(z.literal("")),
  livePlatform: z.string().max(100).optional().nullable(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  location: z.string().max(300).optional().nullable(),
  mapUrl: z.string().url().max(500).optional().nullable().or(z.literal("")),
  recordingUrl: z.string().url().max(500).optional().nullable().or(z.literal("")),
  attendanceEnabled: z.boolean().optional(),

  durationMinutes: z.number().int().min(0).max(1000).optional(),
  sequence: z.number().int().min(0),
  isLocked: z.boolean().optional(),
  publishStatus: publishStatus.optional(),
});

/* --- Materi -------------------------------------------------------- */

export const materialTypeSchema = z.enum([
  "pdf",
  "audio",
  "video",
  "youtube",
  "gdrive",
  "article",
  "link",
]);

export const materialBody = z
  .object({
    meetingId: z.string().uuid("meetingId harus berupa UUID"),
    title: z.string().min(2, "Judul materi wajib diisi").max(300),
    description: z.string().max(2000).optional().nullable(),
    type: materialTypeSchema,
    url: z.string().url("URL materi tidak valid").max(1000).optional().nullable().or(z.literal("")),
    content: z.string().max(20000).optional().nullable(),
    thumbnailUrl: z.string().url().max(1000).optional().nullable().or(z.literal("")),
    durationMinutes: z.number().int().min(0).max(1000).optional(),
    sequence: z.number().int().min(1),
    isRequired: z.boolean().optional(),
    isEssential: z.boolean().optional(),
    publishStatus: publishStatus.optional(),
  })
  // Tipe `article` menyimpan isi inline; tipe lain wajib punya tautan sumber.
  .refine((v) => (v.type === "article" ? !!v.content : !!v.url), {
    message: "Materi non-artikel wajib memiliki URL; materi artikel wajib memiliki konten.",
    path: ["url"],
  });

/* --- lain-lain ------------------------------------------------------- */

export const bookmarkBody = z.object({
  materialId: z.string().uuid("materialId harus berupa UUID"),
});

export const noteBody = z.object({
  materialId: z.string().uuid().nullable().optional(),
  body: z.string().min(1, "Catatan tidak boleh kosong").max(4000),
});

export const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

/* --- Kuis / Ujian ---------------------------------------------------- */

export const questionTypeSchema = z.enum(["multiple_choice", "true_false", "essay"]);

/**
 * Kuis menempel pada TEPAT SATU tingkat:
 * program, tahapan, mata pelajaran, atau pertemuan.
 */
export const assessmentBody = z
  .object({
    programId: z.string().uuid().nullable().optional(),
    tahapanId: z.string().uuid().nullable().optional(),
    subjectId: z.string().uuid().nullable().optional(),
    meetingId: z.string().uuid().nullable().optional(),
    kind: z.enum(["kuis", "ujian", "latihan"]),
    title: z.string().min(2, "Judul wajib diisi").max(300),
    description: z.string().max(2000).nullable().optional(),
    kkm: z.number().int().min(0, "KKM minimal 0").max(100, "KKM maksimal 100"),
    durationMinutes: z.number().int().min(0).max(600).optional(),
    weight: z.number().int().min(0).max(100).nullable().optional(),
    maxAttempts: z.number().int().min(0).max(20).optional(),
    shuffleQuestions: z.boolean().optional(),
    showFeedback: z.boolean().optional(),
    availableFrom: z.coerce.date().nullable().optional(),
    availableUntil: z.coerce.date().nullable().optional(),
    publishStatus: z.enum(["draft", "review", "published"]).optional(),
  })
  .refine(
    (v) => [v.programId, v.tahapanId, v.subjectId, v.meetingId].filter(Boolean).length === 1,
    {
      message:
        "Kuis harus menempel pada tepat satu tingkat: program, tahapan, mata pelajaran, atau pertemuan.",
      path: ["induk"],
    },
  );

export const questionBody = z
  .object({
    assessmentId: z.string().uuid(),
    type: questionTypeSchema,
    prompt: z.string().min(3, "Pertanyaan wajib diisi").max(4000),
    options: z.array(z.string().min(1, "Pilihan tidak boleh kosong")).max(8).nullable().optional(),
    answerKey: z.string().max(200).nullable().optional(),
    explanation: z.string().max(2000).nullable().optional(),
    points: z.number().int().min(1, "Poin minimal 1").max(100),
    sequence: z.number().int().min(1),
  })
  .superRefine((v, ctx) => {
    if (v.type === "multiple_choice") {
      if (!v.options || v.options.length < 2) {
        ctx.addIssue({ code: "custom", path: ["options"], message: "Pilihan ganda butuh minimal 2 pilihan." });
        return;
      }
      const idx = Number(v.answerKey);
      if (!Number.isInteger(idx) || idx < 0 || idx >= v.options.length) {
        ctx.addIssue({
          code: "custom",
          path: ["answerKey"],
          message: "Kunci jawaban harus menunjuk salah satu pilihan.",
        });
      }
    }
    if (v.type === "true_false" && v.answerKey !== "true" && v.answerKey !== "false") {
      ctx.addIssue({
        code: "custom",
        path: ["answerKey"],
        message: 'Kunci benar-salah harus "true" atau "false".',
      });
    }
    // Esai tidak punya kunci: dinilai manual oleh pengajar.
  });

export const submitAttemptBody = z.object({
  responses: z
    .array(z.object({ questionId: z.string().uuid(), response: z.string().max(20000) }))
    .max(500),
});

export const gradeBody = z.object({
  grades: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        earnedPoints: z.number().int().min(0).max(100),
        feedback: z.string().max(2000).optional(),
      }),
    )
    .min(1, "Tidak ada penilaian yang dikirim.")
    .max(200),
});
