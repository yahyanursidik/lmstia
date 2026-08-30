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
  const rows = await learner.tahapanMaterialRows(userId, tahapanId);
  return rows.map((r) => ({ ...r, status: r.status ?? "not_started" }));
}

/**
 * Persentase materi selesai untuk setiap mata pelajaran dalam satu tahapan.
 *
 * Dikembalikan sebagai peta, bukan dihitung per mata pelajaran, supaya
 * pemanggil tidak menambah satu round-trip untuk tiap barisnya.
 */
export async function subjectProgressMap(userId: string, tahapanId: string) {
  const rows = await learner.subjectProgressForTahapan(userId, tahapanId);
  return new Map(rows.map((r) => [r.subjectId, r.total ? Math.round((r.done / r.total) * 100) : 0]));
}

export async function getDashboard(userId: string) {
  const tahapan = await getRunningTahapanOrThrow();

  /*
   * Bagian-bagian ini saling bebas, jadi dijalankan bersamaan. Dengan driver
   * Neon berbasis HTTP, biaya endpoint ini adalah latensi × jumlah query
   * berurutan — bukan jumlah barisnya.
   */
  const [enrollment, subjects, persen, meetings, announcements, nextAction] = await Promise.all([
    learner.findEnrollment(userId, tahapan.id),
    academic.listSubjects(tahapan.id),
    subjectProgressMap(userId, tahapan.id),
    academic.listScheduledMeetings(),
    academic.listAnnouncements(tahapan.id),
    getNextLearningAction(userId, tahapan),
  ]);

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
    subjects: subjects.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      role: s.role,
      deliveryModel: s.deliveryModel,
      percent: persen.get(s.id) ?? 0,
    })),
    upcomingMeetings: meetings.slice(0, 3),
    announcements: announcements.slice(0, 3),
    nextAction,
  };
}

/**
 * `tahapanTerpakai` boleh diisi pemanggil yang sudah memuat tahapan berjalan,
 * agar tidak menambah round-trip yang sama dua kali.
 */
export async function getNextLearningAction(
  userId: string,
  tahapanTerpakai?: Awaited<ReturnType<typeof getRunningTahapanOrThrow>>,
) {
  const tahapan = tahapanTerpakai ?? (await getRunningTahapanOrThrow());
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

/**
 * Satu unit belajar: pertemuan beserta materi, kuis, dan progres pemanggil.
 *
 * Halaman pertemuan peserta sebelumnya membaca data contoh yang ditulis di
 * kode, sehingga materi yang dimasukkan admin tidak pernah tampil. Fungsi ini
 * menyediakan bentuk yang dibutuhkan halaman itu langsung dari basis data.
 */
export async function getUnitBelajar(userId: string, slug: string, number: number) {
  const [induk] = await academic.findMeetingBySlugAndNumber(slug, number);
  if (!induk) throw new NotFoundError("Pertemuan tidak ditemukan");

  const { meeting } = induk;

  /*
   * Terkunci ditentukan data, bukan ditebak dari nomor: `isLocked` disetel
   * admin, dan pertemuan yang belum terbit juga belum layak dibuka.
   */
  const terkunci = meeting.isLocked || meeting.publishStatus !== "published";

  const [nomor, materials, assessments] = await Promise.all([
    academic.listMeetingNumbers(induk.subjectId),
    terkunci ? Promise.resolve([]) : academic.listMaterials(meeting.id),
    terkunci ? Promise.resolve([]) : academic.listAssessments(meeting.id),
  ]);

  const progres = terkunci
    ? []
    : await learner.listProgressForMaterials(
        userId,
        materials.map((m) => m.id),
      );
  const statusMateri = new Map(progres.map((p) => [p.materialId, p.status]));

  /* Hanya materi terbit yang ditawarkan; draf milik admin, bukan peserta. */
  const terbit = materials.filter((m) => m.publishStatus === "published");

  const dapatDibuka = nomor.filter((n) => !n.isLocked && n.publishStatus === "published");
  const posisi = dapatDibuka.findIndex((n) => n.number === number);

  return {
    subject: {
      id: induk.subjectId,
      name: induk.subjectName,
      slug: induk.subjectSlug,
      code: induk.subjectCode,
    },
    meeting: {
      id: meeting.id,
      number: meeting.number,
      title: meeting.title,
      description: meeting.description,
      type: meeting.type,
      mode: meeting.mode,
      liveUrl: terkunci ? null : meeting.liveUrl,
      livePlatform: meeting.livePlatform,
      location: meeting.location,
      startsAt: meeting.startsAt,
      durationMinutes: meeting.durationMinutes,
    },
    locked: terkunci,
    materials: terbit.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      type: m.type,
      url: m.url,
      content: m.content,
      durationMinutes: m.durationMinutes,
      isEssential: m.isEssential,
      sequence: m.sequence,
      status: statusMateri.get(m.id) ?? "not_started",
    })),
    assessments: assessments
      .filter((a) => a.publishStatus === "published")
      .map((a) => ({ id: a.id, title: a.title, kind: a.kind, kkm: a.kkm, durationMinutes: a.durationMinutes })),
    nav: {
      prev: posisi > 0 ? dapatDibuka[posisi - 1]!.number : null,
      next: posisi >= 0 && posisi < dapatDibuka.length - 1 ? dapatDibuka[posisi + 1]!.number : null,
      total: dapatDibuka.length,
      urutan: posisi + 1,
    },
    selesai: terbit.filter((m) => statusMateri.get(m.id) === "completed").length,
  };
}
