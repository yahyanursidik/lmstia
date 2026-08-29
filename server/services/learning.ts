/**
 * Service layer — aturan bisnis, bukan query mentah dan bukan HTTP.
 *
 * Tangga "apa yang harus dikerjakan sekarang" (06-STUDENT-LMS.md):
 * materi belum selesai → latihan aktif → pertemuan terdekat → murojaah → catch-up.
 */

import * as academic from "../repositories/academic";
import * as learner from "../repositories/learner";

export class NotFoundError extends Error {}

export async function getRunningTahapanOrThrow() {
  const t = await academic.findRunningTahapan();
  if (!t) throw new NotFoundError("Tidak ada tahapan yang sedang berjalan");
  return t;
}

/** Seluruh materi satu tahapan, diratakan, dengan progres pemanggil. */
export async function tahapanMaterialsWithProgress(userId: string, tahapanId: string) {
  const subjects = await academic.listSubjects(tahapanId);
  const out: {
    subject: (typeof subjects)[number];
    meeting: Awaited<ReturnType<typeof academic.listMeetings>>[number];
    material: Awaited<ReturnType<typeof academic.listMaterials>>[number];
    status: string;
  }[] = [];

  for (const subject of subjects) {
    const meetings = await academic.listMeetings(subject.id);
    for (const meeting of meetings) {
      const materials = await academic.listMaterials(meeting.id);
      const progress = await learner.listProgressForMaterials(
        userId,
        materials.map((m) => m.id),
      );
      const byId = new Map(progress.map((p) => [p.materialId, p.status]));
      for (const material of materials) {
        out.push({ subject, meeting, material, status: byId.get(material.id) ?? "not_started" });
      }
    }
  }
  return out;
}

export async function subjectProgressPercent(userId: string, subjectId: string) {
  const meetings = await academic.listMeetings(subjectId);
  let total = 0;
  let done = 0;
  for (const m of meetings) {
    const materials = await academic.listMaterials(m.id);
    const progress = await learner.listProgressForMaterials(
      userId,
      materials.map((x) => x.id),
    );
    total += materials.length;
    done += progress.filter((p) => p.status === "completed").length;
  }
  return total ? Math.round((done / total) * 100) : 0;
}

export async function getDashboard(userId: string) {
  const tahapan = await getRunningTahapanOrThrow();
  const enrollment = await learner.findEnrollment(userId, tahapan.id);
  const subjects = await academic.listSubjects(tahapan.id);

  const perSubject = [];
  for (const s of subjects) {
    perSubject.push({
      id: s.id,
      slug: s.slug,
      name: s.name,
      role: s.role,
      deliveryModel: s.deliveryModel,
      percent: await subjectProgressPercent(userId, s.id),
    });
  }

  return {
    tahapan: {
      id: tahapan.id,
      name: tahapan.name,
      title: tahapan.title,
      durationWeeks: tahapan.durationWeeks,
    },
    enrollment: enrollment
      ? { status: enrollment.status, progress: enrollment.progress, className: enrollment.className }
      : null,
    subjects: perSubject,
    upcomingMeetings: (await academic.listScheduledMeetings()).slice(0, 3),
    announcements: (await academic.listAnnouncements(tahapan.id)).slice(0, 3),
    nextAction: await getNextLearningAction(userId),
  };
}

export async function getNextLearningAction(userId: string) {
  const tahapan = await getRunningTahapanOrThrow();
  const all = await tahapanMaterialsWithProgress(userId, tahapan.id);

  const pending = all
    .filter((x) => x.status !== "completed" && x.material.publishStatus === "published")
    .sort(
      (a, b) => a.meeting.number - b.meeting.number || a.material.sequence - b.material.sequence,
    )[0];

  if (pending) {
    return {
      reason: "material",
      subjectName: pending.subject.name,
      meetingNumber: pending.meeting.number,
      title: `${pending.subject.name} — Pertemuan ${pending.meeting.number}: ${pending.material.title}`,
      detail: `${pending.material.type.toUpperCase()} · ${pending.material.durationMinutes} menit`,
      href: `/belajar/kelas/${pending.subject.slug}/pertemuan/${pending.meeting.number}`,
    };
  }

  const [next] = await academic.listScheduledMeetings(new Date());
  if (next) {
    return {
      reason: "meeting",
      subjectName: next.subjectName,
      meetingNumber: next.number,
      title: next.title,
      detail: next.startsAt?.toISOString() ?? "",
      href: "/belajar/jadwal",
    };
  }

  return {
    reason: "murojaah",
    subjectName: "",
    meetingNumber: 0,
    title: "Semua aktivitas selesai",
    detail: "Gunakan sisa waktu untuk murojaah materi sebelumnya.",
    href: "/belajar/murojaah",
  };
}

/** Hanya materi bertanda esensial — Jalur Mengejar Ketertinggalan. */
export async function getCatchUpPath(userId: string) {
  const tahapan = await getRunningTahapanOrThrow();
  const all = await tahapanMaterialsWithProgress(userId, tahapan.id);
  return all
    .filter((x) => x.material.isEssential && x.status !== "completed")
    .slice(0, 4)
    .map((x) => ({
      subjectName: x.subject.name,
      meetingNumber: x.meeting.number,
      title: x.material.title,
      type: x.material.type,
    }));
}

export async function getAdminOverview() {
  const tahapan = await getRunningTahapanOrThrow();
  const enrollments = await learner.listEnrollments(tahapan.id);
  const engagement = await learner.engagementCounts(tahapan.id);
  const competency = await learner.competencyCounts(tahapan.id);

  const atRisk = enrollments.filter(
    (e) =>
      e.engagement === "needs_attention" || e.engagement === "at_risk" || e.engagement === "inactive",
  );

  return {
    tahapan: { id: tahapan.id, name: tahapan.name, title: tahapan.title },
    totals: {
      participants: enrollments.length,
      onTrack: enrollments.filter((e) => e.engagement === "on_track").length,
      needsFollowUp: atRisk.length,
    },
    engagement,
    competency,
    needsFollowUp: atRisk,
  };
}

/** Ringkasan jumlah anak di tiap tingkat, untuk header halaman Kurikulum. */
export async function getCurriculumSummary(tahapanId: string) {
  const tree = await academic.contentTree(tahapanId);
  const meetings = tree.flatMap((s) => s.meetings);
  return {
    subjects: tree.length,
    meetings: meetings.length,
    materials: meetings.reduce((n, m) => n + m.materials.length, 0),
    assessments: meetings.reduce((n, m) => n + m.assessments.length, 0),
    published: meetings.filter((m) => m.publishStatus === "published").length,
  };
}
