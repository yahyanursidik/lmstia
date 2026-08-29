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

/* --- Kuis / Ujian --------------------------------------------------- */

export const assessmentBody = z.object({
  meetingId: z.string().uuid("meetingId harus berupa UUID"),
  kind: z.enum(["kuis", "ujian", "latihan"]),
  title: z.string().min(2, "Judul kuis wajib diisi").max(300),
  description: z.string().max(2000).optional().nullable(),
  questionCount: z.number().int().min(0).max(500).optional(),
  durationMinutes: z.number().int().min(0).max(600).optional(),
  passingScore: z.number().int().min(0).max(100).optional().nullable(),
  weight: z.number().int().min(0).max(100).optional().nullable(),
  maxAttempts: z.number().int().min(0).max(20).optional(),
  publishStatus: publishStatus.optional(),
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
