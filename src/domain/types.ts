/**
 * Domain types — mirror 08-DATABASE-SCHEMA.md so the client, the service
 * layer and the Drizzle tables all speak the same vocabulary.
 * Names stay in the spec's language (English identifiers, Indonesian copy).
 */

export type Role = "student" | "instructor" | "academic_admin" | "super_admin";

export type TermCourseRole = "INTENSIVE" | "FOUNDATION" | "COMPANION";

export type WeekType = "ORIENTATION" | "REGULAR" | "REVIEW" | "ASSESSMENT" | "BREAK";

export type LessonType =
  | "video"
  | "pdf"
  | "article"
  | "live_online"
  | "offline_meeting"
  | "exercise"
  | "worksheet"
  | "quiz"
  | "reflection"
  | "review";

export type SessionType =
  | "ONLINE_CLASS"
  | "ONLINE_PRACTICE"
  | "OFFLINE_CLASS"
  | "MAJLIS_TASIL";

export type PublishStatus = "draft" | "review" | "published";

/** Early-warning ladder from 07-ADMIN-PORTAL.md. */
export type EngagementStatus = "on_track" | "needs_attention" | "at_risk" | "inactive";

/** Per-activity progress, per 08-DATABASE-SCHEMA.md. */
export type ProgressStatus = "not_started" | "in_progress" | "completed" | "needs_review";

/** Competency outcome shown at term close. */
export type CompetencyStatus = "Sudah Dikuasai" | "Perlu Murojaah" | "Belum Dikuasai";

export type AttendanceStatus = "hadir" | "izin" | "sakit" | "alpa";

export type EnrollmentStatus =
  | "registered"
  | "approved"
  | "active"
  | "completed"
  | "withdrawn";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarInitials: string;
};

export type AcademicStage = {
  id: string;
  code: string;
  name: string;
  displayName: string;
  description: string;
  sequence: number;
};

export type Term = {
  id: string;
  stageId: string;
  code: string;
  slug: string;
  name: string;
  title: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  durationWeeks: number;
  status: "draft" | "open" | "running" | "closed";
  isPublic: boolean;
  sequence: number;
};

export type Course = {
  id: string;
  code: string;
  slug: string;
  name: string;
  description: string;
  /** INTENSIVE | FOUNDATION | COMPANION, as joined through term_courses. */
  role: TermCourseRole;
  deliveryModel: string;
  weeklyLoad: string;
  instructorId: string;
  sequence: number;
};

export type Week = {
  id: string;
  courseId: string;
  number: number;
  title: string;
  type: WeekType;
  /** Gating: a week only opens once the previous one is reachable. */
  locked: boolean;
};

export type Lesson = {
  id: string;
  weekId: string;
  title: string;
  slug: string;
  type: LessonType;
  description: string;
  durationMinutes: number;
  sequence: number;
  isRequired: boolean;
  /** Marks the lesson as part of the Catch-Up path (06-STUDENT-LMS.md). */
  isEssential: boolean;
  publishStatus: PublishStatus;
};

export type LessonProgress = {
  lessonId: string;
  status: ProgressStatus;
};

export type Session = {
  id: string;
  courseId: string;
  type: SessionType;
  title: string;
  startsAt: string;
  /** Human-readable day + time, kept alongside startsAt for display. */
  dayLabel: string;
  timeLabel: string;
  locationType: "online" | "offline";
  meetingUrl?: string;
  address?: string;
  attendance?: AttendanceStatus;
};

export type Instructor = {
  id: string;
  name: string;
  title: string;
  focus: string;
  bio: string;
  initials: string;
};

export type Participant = {
  id: string;
  name: string;
  email: string;
  segment: string;
  className: string;
  attendance: string;
  exercises: string;
  competency: CompetencyStatus;
  engagement: EngagementStatus;
  lastActiveDays: number;
};

export type Registration = {
  id: string;
  name: string;
  email: string;
  segment: string;
  submittedAt: string;
  status: "menunggu" | "disetujui" | "ditolak";
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: "Semua" | "Peserta" | "Pengajar";
  publishedAt: string;
  status: PublishStatus;
};

export type Note = {
  id: string;
  lessonTitle: string;
  courseName: string;
  body: string;
  createdAt: string;
  bookmarkedForReview: boolean;
};

export type FaqItem = { q: string; a: string };

/** Response shape for GET /api/v1/me/next-learning-action. */
export type NextLearningAction = {
  reason: "lesson" | "exercise" | "session" | "murojaah" | "catchup";
  courseName: string;
  weekNumber: number;
  title: string;
  detail: string;
  href: string;
};

export const ENGAGEMENT_LABEL: Record<EngagementStatus, string> = {
  on_track: "Sesuai jalur",
  needs_attention: "Perlu perhatian",
  at_risk: "Berisiko tertinggal",
  inactive: "Tidak aktif",
};

export const COMPETENCY_TONE: Record<CompetencyStatus, { bg: string; fg: string }> = {
  "Sudah Dikuasai": { bg: "#e6ede7", fg: "#1f3d34" },
  "Perlu Murojaah": { bg: "#f6eddb", fg: "#8a6a25" },
  "Belum Dikuasai": { bg: "#f7e6e0", fg: "#8d4632" },
};

export const ENGAGEMENT_TONE: Record<EngagementStatus, { bg: string; fg: string }> = {
  on_track: { bg: "#e6ede7", fg: "#1f3d34" },
  needs_attention: { bg: "#f6eddb", fg: "#8a6a25" },
  at_risk: { bg: "#f7e6e0", fg: "#8d4632" },
  inactive: { bg: "#ecebe6", fg: "#6d675e" },
};

export const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  video: "Video",
  pdf: "PDF",
  article: "Bacaan",
  live_online: "Kelas online",
  offline_meeting: "Tatap muka",
  exercise: "Latihan",
  worksheet: "Worksheet",
  quiz: "Kuis",
  reflection: "Refleksi",
  review: "Murojaah",
};

export const WEEK_TYPE_LABEL: Record<WeekType, string> = {
  ORIENTATION: "Orientasi",
  REGULAR: "Pembelajaran",
  REVIEW: "Murojaah",
  ASSESSMENT: "Evaluasi",
  BREAK: "Jeda",
};

export const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  ONLINE_CLASS: "Kelas Materi",
  ONLINE_PRACTICE: "Kelas Latihan",
  OFFLINE_CLASS: "Tatap Muka",
  MAJLIS_TASIL: "Majlis Ta'sil",
};

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  hadir: "Hadir",
  izin: "Izin",
  sakit: "Sakit",
  alpa: "Tidak hadir",
};
