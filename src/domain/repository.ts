/**
 * Read model for the UI.
 *
 * Every function here mirrors an endpoint in 09-API-ARCHITECTURE.md. Today
 * they resolve against the in-memory seed; once `VITE_API_URL` is set they
 * become `fetch` calls to the Hono API. Keeping the boundary explicit is what
 * lets the portals be built before Neon exists — and stops the browser from
 * ever reaching the database directly (10-AUTH-RBAC.md).
 */

import * as db from "./seed";
import { CURRENT_WEEK, TOTAL_WEEKS } from "./seed";
import type {
  Course,
  EngagementStatus,
  Lesson,
  NextLearningAction,
  Participant,
  Session,
  Week,
} from "./types";

export { CURRENT_WEEK, TOTAL_WEEKS };

export const activeTerm = db.terms[0];
export const nextTerm = db.terms[1];

export const allTerms = () => db.terms;
export const publicTerms = () => db.terms.filter((t) => t.isPublic);
export const termBySlug = (slug: string) => db.terms.find((t) => t.slug === slug);

export const allCourses = () => db.courses;
export const courseBySlug = (slug: string) => db.courses.find((c) => c.slug === slug);
export const courseById = (id: string) => db.courses.find((c) => c.id === id);

export const allInstructors = () => db.instructors;
export const instructorById = (id: string) => db.instructors.find((i) => i.id === id);

export const allParticipants = () => db.participants;
export const allRegistrations = () => db.registrations;
export const allAnnouncements = () => db.announcements;
export const allNotes = () => db.notes;
export const faq = () => db.faq;
export const engagementByWeek = () => db.engagementByWeek;

export const weeksOf = (courseId: string): Week[] =>
  db.weeks.filter((w) => w.courseId === courseId).sort((a, b) => a.number - b.number);

export const weekOf = (courseId: string, number: number) =>
  db.weeks.find((w) => w.courseId === courseId && w.number === number);

export const lessonsOf = (weekId: string): Lesson[] =>
  db.lessons.filter((l) => l.weekId === weekId).sort((a, b) => a.sequence - b.sequence);

export const lessonById = (id: string) => db.lessons.find((l) => l.id === id);

export const progressOf = (lessonId: string) => db.lessonProgress[lessonId] ?? "not_started";

/** Lessons flagged `is_essential` — the Catch-Up path (06-STUDENT-LMS.md). */
export const catchUpLessons = (courseId: string, week: number) =>
  lessonsOf(`wk-${courseId}-${week}`).filter((l) => l.isEssential);

export const sessionsUpcoming = (): Session[] =>
  [...db.sessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

export const sessionsOf = (courseId: string) =>
  db.sessions.filter((s) => s.courseId === courseId);

/** Percentage of a course's lessons completed, across all weeks. */
export function courseProgress(courseId: string): number {
  const ws = weeksOf(courseId).map((w) => w.id);
  const ls = db.lessons.filter((l) => ws.includes(l.weekId));
  if (!ls.length) return 0;
  const done = ls.filter((l) => progressOf(l.id) === "completed").length;
  return Math.round((done / ls.length) * 100);
}

/** Progress for the active term only — never the whole TIA journey. */
export function termProgress(): { week: number; total: number; percent: number } {
  const percent = Math.round((CURRENT_WEEK / TOTAL_WEEKS) * 100);
  return { week: CURRENT_WEEK, total: TOTAL_WEEKS, percent };
}

export function weekCompletion(weekId: string): { done: number; total: number } {
  const ls = lessonsOf(weekId);
  return { done: ls.filter((l) => progressOf(l.id) === "completed").length, total: ls.length };
}

/**
 * GET /me/next-learning-action.
 * Priority per 06-STUDENT-LMS.md: unfinished lesson → active exercise →
 * imminent session → murojaah → catch-up.
 */
export function nextLearningAction(): NextLearningAction {
  for (const c of db.courses) {
    const wk = weekOf(c.id, CURRENT_WEEK);
    if (!wk) continue;
    const pending = lessonsOf(wk.id).find((l) => progressOf(l.id) !== "completed");
    if (pending) {
      return {
        reason: pending.type === "exercise" ? "exercise" : "lesson",
        courseName: c.name,
        weekNumber: wk.number,
        title: `${c.name} — Pekan ${wk.number}: ${pending.title}`,
        detail: `${pending.description} · ${pending.durationMinutes} menit`,
        href: `/belajar/kelas/${c.slug}/pekan/${wk.number}`,
      };
    }
  }
  const s = sessionsUpcoming()[0];
  return {
    reason: "session",
    courseName: courseById(s.courseId)?.name ?? "",
    weekNumber: CURRENT_WEEK,
    title: s.title,
    detail: `${s.dayLabel} · ${s.timeLabel}`,
    href: "/belajar/jadwal",
  };
}

/** Items still open in the current week, across every course. */
export function pendingThisWeek() {
  return db.courses.flatMap((c) => {
    const wk = weekOf(c.id, CURRENT_WEEK);
    if (!wk) return [];
    return lessonsOf(wk.id)
      .filter((l) => progressOf(l.id) !== "completed")
      .map((l) => ({ course: c, week: wk, lesson: l }));
  });
}

/* --- Admin aggregates ----------------------------------------- */

export function participantsByEngagement(status: EngagementStatus): Participant[] {
  return db.participants.filter((p) => p.engagement === status);
}

export function needsFollowUp(): Participant[] {
  return db.participants.filter(
    (p) => p.engagement === "needs_attention" || p.engagement === "at_risk" || p.engagement === "inactive",
  );
}

export function adminKpi() {
  const total = db.participants.length;
  const active = db.participants.filter((p) => p.engagement === "on_track").length;
  const risk = needsFollowUp().length;
  const pendingReg = db.registrations.filter((r) => r.status === "menunggu").length;
  return { total, active, risk, pendingReg };
}

export function competencyBreakdown() {
  const order = ["Sudah Dikuasai", "Perlu Murojaah", "Belum Dikuasai"] as const;
  const total = db.participants.length;
  return order.map((nama) => {
    const n = db.participants.filter((p) => p.competency === nama).length;
    return { nama, n, pct: Math.round((n / total) * 100) };
  });
}

/** Content readiness for the weeks that have not started yet. */
export function contentReadiness() {
  return db.courses.flatMap((c) =>
    weeksOf(c.id)
      .filter((w) => w.number > CURRENT_WEEK)
      .map((w) => {
        const ls = lessonsOf(w.id);
        const published = ls.filter((l) => l.publishStatus === "published").length;
        const status: Lesson["publishStatus"] = ls.every((l) => l.publishStatus === "published")
          ? "published"
          : ls.some((l) => l.publishStatus === "review")
            ? "review"
            : "draft";
        return { course: c, week: w, published, total: ls.length, status };
      }),
  );
}

export function coursesWithProgress(): (Course & { percent: number; label: string })[] {
  return db.courses.map((c) => {
    const percent = courseProgress(c.id);
    const label =
      c.role === "INTENSIVE"
        ? `PEKAN ${CURRENT_WEEK} / ${TOTAL_WEEKS}`
        : c.role === "FOUNDATION"
          ? "BULAN 2 / 3"
          : `${Math.round((percent / 100) * TOTAL_WEEKS)} / ${TOTAL_WEEKS} MATERI`;
    return { ...c, percent, label };
  });
}
