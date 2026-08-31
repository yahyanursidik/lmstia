/**
 * Drizzle schema — Neon PostgreSQL.
 *
 * Content hierarchy (5 levels):
 *
 *   Program
 *   └── Tahapan / Tingkatan        (banyak per program)
 *       └── Mata Pelajaran         (bisa lebih dari 2 per tahapan)
 *           └── Pertemuan          (banyak per mata pelajaran)
 *               ├── Materi         (bisa lebih dari 1; PDF/audio/YouTube/Drive)
 *               ├── link live/hybrid
 *               └── Kuis / Ujian
 *
 * Migration-first: edit here, then `npm run db:generate` and `npm run db:migrate`.
 */

import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* --- enums ----------------------------------------------------- */

export const roleEnum = pgEnum("role", ["student", "instructor", "academic_admin", "super_admin"]);

/** Jenjang pendidikan terakhir peserta. */
export const educationEnum = pgEnum("education_level", [
  "sd",
  "smp",
  "sma",
  "d1_d3",
  "d4_s1",
  "s2",
  "s3",
  "lainnya",
]);

/**
 * Status akun — terpisah dari status pendaftaran (`enrollments.status`).
 * Status akun mengatur boleh-tidaknya masuk; status pendaftaran mengatur
 * keikutsertaan pada satu tahapan.
 */
export const accountStatusEnum = pgEnum("account_status", ["aktif", "nonaktif", "ditangguhkan"]);

/** Pemisahan kelompok WhatsApp mengikuti adab pemisahan ikhwan dan akhwat. */
export const genderEnum = pgEnum("gender", ["ikhwan", "akhwat"]);

export const registrationStatusEnum = pgEnum("registration_status", [
  "menunggu",
  "disetujui",
  "ditolak",
]);

/**
 * Status formulir pendaftaran.
 *
 * `terbit` berarti tautannya dapat dibuka publik; apakah pendaftaran sedang
 * menerima kiriman ditentukan terpisah oleh rentang waktu pendaftaran.
 */
export const formStatusEnum = pgEnum("form_status", ["draf", "terbit", "ditutup"]);

export const publishStatusEnum = pgEnum("publish_status", ["draft", "review", "published"]);

export const programStatusEnum = pgEnum("program_status", ["draft", "active", "archived"]);

export const tahapanStatusEnum = pgEnum("tahapan_status", ["draft", "open", "running", "closed"]);

/** Peran mata pelajaran dalam satu tahapan. */
export const subjectRoleEnum = pgEnum("subject_role", ["INTENSIVE", "FOUNDATION", "COMPANION"]);

/** Bagaimana satu pertemuan dijalankan. */
export const meetingModeEnum = pgEnum("meeting_mode", ["online", "offline", "hybrid", "mandiri"]);

export const meetingTypeEnum = pgEnum("meeting_type", [
  "ORIENTATION",
  "REGULAR",
  "REVIEW",
  "ASSESSMENT",
  "BREAK",
]);

/** Sumber materi yang didukung, termasuk tautan eksternal. */
export const materialTypeEnum = pgEnum("material_type", [
  "pdf",
  "audio",
  "video",
  "youtube",
  "gdrive",
  "article",
  "link",
]);

export const assessmentKindEnum = pgEnum("assessment_kind", ["kuis", "ujian", "latihan"]);

/** Tiga tipe soal yang didukung. Esai dinilai manual, dua lainnya otomatis. */
export const questionTypeEnum = pgEnum("question_type", [
  "multiple_choice",
  "true_false",
  "essay",
]);

export const attemptStatusEnum = pgEnum("attempt_status", [
  "berlangsung",
  "menunggu_penilaian",
  "dinilai",
]);

export const enrollmentStatusEnum = pgEnum("enrollment_status", [
  "registered",
  "approved",
  "active",
  "completed",
  "withdrawn",
]);

export const progressStatusEnum = pgEnum("progress_status", [
  "not_started",
  "in_progress",
  "completed",
  "needs_review",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", ["hadir", "izin", "sakit", "alpa"]);

export const engagementStatusEnum = pgEnum("engagement_status", [
  "on_track",
  "needs_attention",
  "at_risk",
  "inactive",
]);

export const competencyEnum = pgEnum("competency_status", [
  "sudah_dikuasai",
  "perlu_murojaah",
  "belum_dikuasai",
]);

/* --- identity --------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: roleEnum("role").notNull().default("student"),
    /** scrypt digest stored as `salt:hash`. Never leaves the server. */
    passwordHash: text("password_hash"),
    isDemo: boolean("is_demo").notNull().default(false),
    avatarUrl: text("avatar_url"),
    segment: text("segment"),
    /** Jabatan/gelar yang tampil di halaman pengajar publik. */
    title: text("title"),
    /** Profil singkat pengajar; tampil publik, jadi bukan tempat catatan internal. */
    bio: text("bio"),
    /* --- Kontak & Domisili ---------------------------------------- */
    /** Nomor WhatsApp, disimpan apa adanya seperti yang diisi admin. */
    phone: text("phone"),
    country: text("country"),
    /** Provinsi disimpan agar penyaringan wilayah tidak perlu menebak. */
    province: text("province"),
    /** Kabupaten atau kota. */
    city: text("city"),
    education: educationEnum("education"),
    accountStatus: accountStatusEnum("account_status").notNull().default("aktif"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("auth_sessions_token_idx").on(t.token),
    index("auth_sessions_user_idx").on(t.userId),
  ],
);

/* --- 1. Program -------------------------------------------------- */

export const programs = pgTable(
  "programs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    status: programStatusEnum("status").notNull().default("draft"),
    sequence: integer("sequence").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("programs_slug_idx").on(t.slug)],
);

/* --- 2. Tahapan / Tingkatan -------------------------------------- */

export const tahapan = pgTable(
  "tahapan",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    /** Tema akademik tahapan, mis. "Membangun Fondasi Menuntut Ilmu". */
    title: text("title"),
    subtitle: text("subtitle"),
    description: text("description"),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    registrationStart: timestamp("registration_start", { withTimezone: true }),
    registrationEnd: timestamp("registration_end", { withTimezone: true }),
    durationWeeks: integer("duration_weeks").notNull().default(12),
    status: tahapanStatusEnum("status").notNull().default("draft"),
    isPublic: boolean("is_public").notNull().default(false),
    sequence: integer("sequence").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("tahapan_slug_idx").on(t.slug),
    index("tahapan_program_seq_idx").on(t.programId, t.sequence),
  ],
);

/* --- 3. Mata Pelajaran ------------------------------------------- */

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tahapanId: uuid("tahapan_id")
      .notNull()
      .references(() => tahapan.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    role: subjectRoleEnum("role").notNull().default("FOUNDATION"),
    deliveryModel: text("delivery_model"),
    weeklyLoad: text("weekly_load"),
    instructorId: uuid("instructor_id").references(() => users.id, { onDelete: "set null" }),
    sequence: integer("sequence").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("subjects_slug_idx").on(t.slug),
    index("subjects_tahapan_seq_idx").on(t.tahapanId, t.sequence),
  ],
);

/* --- 4. Pertemuan ------------------------------------------------ */

export const meetings = pgTable(
  "meetings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    objectives: text("objectives"),
    type: meetingTypeEnum("type").notNull().default("REGULAR"),

    /** Live teaching / hybrid. */
    mode: meetingModeEnum("mode").notNull().default("mandiri"),
    liveUrl: text("live_url"),
    livePlatform: text("live_platform"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    location: text("location"),
    mapUrl: text("map_url"),
    recordingUrl: text("recording_url"),
    attendanceEnabled: boolean("attendance_enabled").notNull().default(false),

    durationMinutes: integer("duration_minutes").notNull().default(0),
    sequence: integer("sequence").notNull(),
    isLocked: boolean("is_locked").notNull().default(false),
    publishStatus: publishStatusEnum("publish_status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("meetings_subject_number_idx").on(t.subjectId, t.number),
    index("meetings_subject_seq_idx").on(t.subjectId, t.sequence),
    index("meetings_starts_at_idx").on(t.startsAt),
  ],
);

/* --- 5. Materi --------------------------------------------------- */

export const materials = pgTable(
  "materials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    type: materialTypeEnum("type").notNull(),
    /** Tautan sumber: file PDF/audio, YouTube, atau Google Drive. */
    url: text("url"),
    /** Konten inline untuk tipe `article`. */
    content: text("content"),
    /** Gambar pratinjau; bila kosong, klien menurunkannya dari `url`. */
    thumbnailUrl: text("thumbnail_url"),
    fileSizeKb: integer("file_size_kb"),
    durationMinutes: integer("duration_minutes").notNull().default(0),
    sequence: integer("sequence").notNull(),
    isRequired: boolean("is_required").notNull().default(true),
    /** Bagian dari Jalur Mengejar Ketertinggalan. */
    isEssential: boolean("is_essential").notNull().default(false),
    publishStatus: publishStatusEnum("publish_status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("materials_meeting_seq_idx").on(t.meetingId, t.sequence)],
);

/* --- Kuis / Ujian (per pertemuan) -------------------------------- */

/**
 * Kuis / Ujian.
 *
 * Dapat menempel pada salah satu dari empat tingkat hierarki:
 *
 *   Program        → ujian penempatan / uji kompetensi lintas tahapan
 *   Tahapan        → evaluasi akhir caturwulan, lintas mata pelajaran
 *   Mata Pelajaran → ujian akhir satu mata pelajaran
 *   Pertemuan      → kuis pekanan
 *
 * Tepat satu induk yang boleh terisi — dijaga CHECK di migrasi dan
 * divalidasi ulang oleh Zod.
 */
export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    programId: uuid("program_id").references(() => programs.id, { onDelete: "cascade" }),
    tahapanId: uuid("tahapan_id").references(() => tahapan.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "cascade" }),
    meetingId: uuid("meeting_id").references(() => meetings.id, { onDelete: "cascade" }),
    kind: assessmentKindEnum("kind").notNull().default("kuis"),
    title: text("title").notNull(),
    description: text("description"),
    /** Kriteria Ketuntasan Minimal, 0–100. */
    kkm: integer("kkm").notNull().default(70),
    durationMinutes: integer("duration_minutes").notNull().default(0),
    /** Bobot terhadap nilai akhir tahapan, 0–100. */
    weight: integer("weight"),
    /** 0 = tidak dibatasi. */
    maxAttempts: integer("max_attempts").notNull().default(1),
    shuffleQuestions: boolean("shuffle_questions").notNull().default(false),
    /** Tampilkan kunci dan pembahasan setelah peserta selesai. */
    showFeedback: boolean("show_feedback").notNull().default(true),
    availableFrom: timestamp("available_from", { withTimezone: true }),
    availableUntil: timestamp("available_until", { withTimezone: true }),
    publishStatus: publishStatusEnum("publish_status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("assessments_meeting_idx").on(t.meetingId),
    index("assessments_subject_idx").on(t.subjectId),
    index("assessments_tahapan_idx").on(t.tahapanId),
    index("assessments_program_idx").on(t.programId),
  ],
);

export const assessmentQuestions = pgTable(
  "assessment_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    type: questionTypeEnum("type").notNull().default("multiple_choice"),
    prompt: text("prompt").notNull(),
    /**
     * Pilihan ganda: JSON array of string.
     * Benar-salah dan esai: null.
     */
    options: text("options"),
    /**
     * Pilihan ganda: indeks jawaban benar sebagai string ("0".."n").
     * Benar-salah: "true" | "false".
     * Esai: null — dinilai manual oleh pengajar.
     */
    answerKey: text("answer_key"),
    explanation: text("explanation"),
    points: integer("points").notNull().default(1),
    sequence: integer("sequence").notNull().default(1),
  },
  (t) => [index("assessment_questions_seq_idx").on(t.assessmentId, t.sequence)],
);

/** Satu percobaan pengerjaan oleh satu peserta. */
export const assessmentAttempts = pgTable(
  "assessment_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    attemptNo: integer("attempt_no").notNull().default(1),
    status: attemptStatusEnum("status").notNull().default("berlangsung"),
    /** Skor 0–100; null selama masih ada esai yang belum dinilai. */
    score: integer("score"),
    /** Poin objektif yang sudah pasti, dipakai saat menunggu penilaian esai. */
    autoPoints: integer("auto_points").notNull().default(0),
    maxPoints: integer("max_points").notNull().default(0),
    passed: boolean("passed"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
    gradedBy: uuid("graded_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    uniqueIndex("attempts_assessment_user_no_idx").on(t.assessmentId, t.userId, t.attemptNo),
    index("attempts_user_idx").on(t.userId),
  ],
);

export const assessmentAnswers = pgTable(
  "assessment_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => assessmentAttempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => assessmentQuestions.id, { onDelete: "cascade" }),
    /** Pilihan ganda: indeks. Benar-salah: "true"/"false". Esai: teks jawaban. */
    response: text("response"),
    /** null untuk esai yang belum dinilai. */
    earnedPoints: integer("earned_points"),
    isCorrect: boolean("is_correct"),
    feedback: text("feedback"),
  },
  (t) => [uniqueIndex("answers_attempt_question_idx").on(t.attemptId, t.questionId)],
);

/* --- enrolment and progress -------------------------------------- */

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Pendaftaran selalu per tahapan, tidak pernah per program. */
    tahapanId: uuid("tahapan_id")
      .notNull()
      .references(() => tahapan.id, { onDelete: "cascade" }),
    status: enrollmentStatusEnum("status").notNull().default("registered"),
    engagement: engagementStatusEnum("engagement").notNull().default("on_track"),
    competency: competencyEnum("competency"),
    className: text("class_name"),
    registeredAt: timestamp("registered_at", { withTimezone: true }).defaultNow().notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    progress: integer("progress").notNull().default(0),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("enrollments_user_tahapan_idx").on(t.userId, t.tahapanId)],
);

export const materialProgress = pgTable(
  "material_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    status: progressStatusEnum("status").notNull().default("not_started"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    response: text("response"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("material_progress_user_material_idx").on(t.userId, t.materialId)],
);

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: attendanceStatusEnum("status").notNull().default("alpa"),
    note: text("note"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("attendance_meeting_user_idx").on(t.meetingId, t.userId)],
);

/* --- notes, bookmarks, announcements ----------------------------- */

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    materialId: uuid("material_id").references(() => materials.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    isPrivate: boolean("is_private").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("notes_user_idx").on(t.userId)],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.materialId] })],
);

export const announcements = pgTable("announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  tahapanId: uuid("tahapan_id").references(() => tahapan.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  audience: text("audience").notNull().default("Semua"),
  status: publishStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  meta: text("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* --- relations ---------------------------------------------------- */

export const programsRelations = relations(programs, ({ many }) => ({
  tahapan: many(tahapan),
}));

export const tahapanRelations = relations(tahapan, ({ one, many }) => ({
  program: one(programs, { fields: [tahapan.programId], references: [programs.id] }),
  subjects: many(subjects),
  enrollments: many(enrollments),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  tahapan: one(tahapan, { fields: [subjects.tahapanId], references: [tahapan.id] }),
  instructor: one(users, { fields: [subjects.instructorId], references: [users.id] }),
  meetings: many(meetings),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  subject: one(subjects, { fields: [meetings.subjectId], references: [subjects.id] }),
  materials: many(materials),
  assessments: many(assessments),
  attendance: many(attendance),
}));

export const materialsRelations = relations(materials, ({ one, many }) => ({
  meeting: one(meetings, { fields: [materials.meetingId], references: [meetings.id] }),
  progress: many(materialProgress),
}));

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  program: one(programs, { fields: [assessments.programId], references: [programs.id] }),
  tahapan: one(tahapan, { fields: [assessments.tahapanId], references: [tahapan.id] }),
  subject: one(subjects, { fields: [assessments.subjectId], references: [subjects.id] }),
  meeting: one(meetings, { fields: [assessments.meetingId], references: [meetings.id] }),
  questions: many(assessmentQuestions),
  attempts: many(assessmentAttempts),
}));

export const assessmentAttemptsRelations = relations(assessmentAttempts, ({ one, many }) => ({
  assessment: one(assessments, { fields: [assessmentAttempts.assessmentId], references: [assessments.id] }),
  user: one(users, { fields: [assessmentAttempts.userId], references: [users.id] }),
  answers: many(assessmentAnswers),
}));

export const assessmentAnswersRelations = relations(assessmentAnswers, ({ one }) => ({
  attempt: one(assessmentAttempts, { fields: [assessmentAnswers.attemptId], references: [assessmentAttempts.id] }),
  question: one(assessmentQuestions, { fields: [assessmentAnswers.questionId], references: [assessmentQuestions.id] }),
}));

/* --- Pendaftaran per program -------------------------------------- */

/**
 * Formulir pendaftaran — satu tautan unik per program.
 *
 * Dipisah dari tabel `programs` karena satu program dapat membuka pendaftaran
 * berkali-kali (angkatan berikutnya) dengan rentang waktu, teks, dan tautan
 * grup yang berbeda, sementara programnya sendiri tetap satu.
 */
export const registrationForms = pgTable(
  "registration_forms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    /** Bagian akhir tautan publik: /daftar/<slug>. */
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    headline: text("headline"),
    /** Isi halaman pendaftaran, ditulis admin. */
    description: text("description"),
    /** Pernyataan istiqomah yang harus disetujui sebelum kiriman diterima. */
    commitmentText: text("commitment_text")
      .notNull()
      .default(
        "Saya berniat bersungguh-sungguh dan istiqomah mengikuti program ini sampai selesai, in syaa Allah.",
      ),
    /*
     * Tautan undangan grup hanya diberikan setelah kiriman berhasil, dan
     * tidak pernah ikut dalam konfigurasi formulir yang dibaca publik —
     * kalau ikut, tautannya bisa dipanen tanpa mendaftar.
     */
    waIkhwanUrl: text("wa_ikhwan_url"),
    waAkhwatUrl: text("wa_akhwat_url"),
    opensAt: timestamp("opens_at", { withTimezone: true }),
    closesAt: timestamp("closes_at", { withTimezone: true }),
    status: formStatusEnum("status").notNull().default("draf"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("registration_forms_slug_idx").on(t.slug),
    index("registration_forms_program_idx").on(t.programId),
  ],
);

/**
 * Kiriman pendaftaran.
 *
 * Terpisah dari `enrollments`: pendaftar belum tentu punya akun, dan
 * pendaftaran baru menjadi keikutsertaan setelah ditinjau admin.
 */
export const registrations = pgTable(
  "registrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    formId: uuid("form_id")
      .notNull()
      .references(() => registrationForms.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    gender: genderEnum("gender").notNull(),
    country: text("country"),
    province: text("province"),
    city: text("city"),
    education: educationEnum("education"),
    segment: text("segment"),
    reason: text("reason"),
    /** Bukti persetujuan pernyataan istiqomah, beserta bunyi teks saat itu. */
    commitmentAgreed: boolean("commitment_agreed").notNull().default(false),
    commitmentSnapshot: text("commitment_snapshot"),
    status: registrationStatusEnum("status").notNull().default("menunggu"),
    note: text("note"),
    /** Terisi bila pendaftaran sudah dikonversi menjadi akun pengguna. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    /* Satu orang cukup sekali mendaftar pada satu formulir. */
    uniqueIndex("registrations_form_email_idx").on(t.formId, t.email),
    index("registrations_status_idx").on(t.status),
  ],
);

/**
* Pembatas laju untuk jalur publik: percobaan masuk dan kiriman pendaftaran.
 *
 * Nama tabelnya `login_attempts` karena mulanya hanya melayani halaman masuk.
 * Namanya kini terlalu sempit, tetapi mengganti nama tabel lewat drizzle-kit
 * menuntut jawaban interaktif rename-atau-buat-ulang; menyunting snapshot
 * secara manual berisiko merusak rantai migrasi demi perbaikan kosmetik.
 * Awalan pada `key` yang memisahkan embernya, bukan nama tabel.
 *
 * Sebelumnya disimpan di memori proses, yang tidak berarti apa-apa di
 * lingkungan serverless: tiap permintaan dapat mendarat pada instance baru
 * dengan hitungan kosong. Disimpan di basis data, hitungannya dibagi oleh
 * seluruh instance.
 *
 * `key` diawali nama ember lalu kuncinya, mis. `masuk:ip:<alamat>` atau
 * `daftar:ip:<alamat>`, sehingga satu tabel melayani beberapa jalur tanpa
 * penghitungnya saling bercampur.
 */
export const loginAttempts = pgTable("login_attempts", {
  key: text("key").primaryKey(),
  n: integer("n").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});
