/**
 * Seed content for Marhalah I'dad — Caturwulan 1.
 * Sources: 02-CURRICULUM.md (week structure), TIA-vibe-coding-brief.md §9
 * (Aqidah months, the 12 Adab titles), 05-LANDING-PAGE.md (public copy).
 *
 * This is the dataset the in-memory repository serves. When Neon is wired
 * up, `server/seed.ts` writes exactly these rows.
 */

import type {
  AcademicStage,
  Announcement,
  Course,
  FaqItem,
  Instructor,
  Lesson,
  Note,
  Participant,
  Registration,
  Session,
  Term,
  Week,
} from "./types";

export const CURRENT_WEEK = 8;
export const TOTAL_WEEKS = 12;

export const stages: AcademicStage[] = [
  { id: "st-idad", code: "IDAD", name: "I'dad", displayName: "Marhalah I'dad", description: "Tahap Persiapan — membangun alat dan fondasi awal menuntut ilmu.", sequence: 1 },
  { id: "st-tasis", code: "TASIS", name: "Ta'sis", displayName: "Marhalah Ta'sis", description: "Tahap Fondasi — memperkuat dasar Bahasa Arab dan ilmu syar'i.", sequence: 2 },
  { id: "st-tanmiyah", code: "TANMIYAH", name: "Tanmiyah", displayName: "Marhalah Tanmiyah", description: "Tahap Pengembangan — mulai membaca teks dan kajian kitab sederhana.", sequence: 3 },
  { id: "st-taqwiyah", code: "TAQWIYAH", name: "Taqwiyah", displayName: "Marhalah Taqwiyah", description: "Tahap Penguatan — pendalaman dan pembiasaan ilmu.", sequence: 4 },
  { id: "st-takhassus", code: "TAKHASSUS", name: "Takhassus", displayName: "Marhalah Takhassus", description: "Tahap Peminatan — fokus pada bidang ilmu pilihan.", sequence: 5 },
];

export const terms: Term[] = [
  {
    id: "tm-1",
    stageId: "st-idad",
    code: "IDAD-C1",
    slug: "caturwulan-1",
    name: "Caturwulan 1",
    title: "Membangun Fondasi Menuntut Ilmu",
    subtitle: "Bahasa Arab 01 · Aqidah 01 · Adab Menuntut Ilmu",
    startDate: "2026-07-06",
    endDate: "2026-09-27",
    durationWeeks: 12,
    status: "running",
    isPublic: true,
    sequence: 1,
  },
  {
    id: "tm-2",
    stageId: "st-idad",
    code: "IDAD-C2",
    slug: "caturwulan-2",
    name: "Caturwulan 2",
    title: "Membangun Fondasi Ibadah",
    subtitle: "Bahasa Arab 02 · Fiqh 01 · Adab Ibadah",
    startDate: "2026-10-12",
    endDate: "2027-01-03",
    durationWeeks: 12,
    status: "open",
    isPublic: true,
    sequence: 2,
  },
  {
    id: "tm-3",
    stageId: "st-idad",
    code: "IDAD-C3",
    slug: "caturwulan-3",
    name: "Caturwulan 3",
    title: "Menjaga dan Mengamalkan Ilmu",
    subtitle: "Bahasa Arab 03 · Hadits 01 · Adab dan Akhlak",
    startDate: "2027-01-18",
    endDate: "2027-04-11",
    durationWeeks: 12,
    status: "draft",
    isPublic: false,
    sequence: 3,
  },
];

export const instructors: Instructor[] = [
  {
    id: "in-1",
    name: "Ustadz Abu Hudzaifah",
    title: "Pengampu Bahasa Arab 01",
    focus: "Bahasa Arab",
    bio: "Mengampu kelas materi dan kelas latihan Bahasa Arab, dengan penekanan pada membaca dan menulis kalimat dasar.",
    initials: "AH",
  },
  {
    id: "in-2",
    name: "Ustadz Abdul Muhsin",
    title: "Pengampu Aqidah 01",
    focus: "Aqidah",
    bio: "Membimbing materi tauhid dan memimpin Majlis Ta'sil bulanan.",
    initials: "AM",
  },
  {
    id: "in-3",
    name: "Ustadz Salman Al-Faris",
    title: "Pengampu Adab Menuntut Ilmu",
    focus: "Adab",
    bio: "Menyusun materi pendamping mandiri dan mendampingi refleksi pekanan peserta.",
    initials: "SF",
  },
];

export const courses: Course[] = [
  {
    id: "co-arab",
    code: "AR01",
    slug: "bahasa-arab-01",
    name: "Bahasa Arab 01",
    description:
      "Membangun alat — membaca, menulis, kosakata, dan struktur kalimat dasar sebagai bekal memahami teks syar'i.",
    role: "INTENSIVE",
    deliveryModel: "2 kelas online + 1 tatap muka pekanan",
    weeklyLoad: "2–3 jam / pekan",
    instructorId: "in-1",
    sequence: 1,
  },
  {
    id: "co-aqidah",
    code: "AQ01",
    slug: "aqidah-01",
    name: "Aqidah 01",
    description:
      "Membangun keyakinan — mengenal tujuan kehidupan, tauhid rububiyah dan uluhiyah, serta hubungan ilmu dan amal.",
    role: "FOUNDATION",
    deliveryModel: "Materi mandiri LMS + Majlis Ta'sil bulanan",
    weeklyLoad: "1–2 jam / pekan",
    instructorId: "in-2",
    sequence: 2,
  },
  {
    id: "co-adab",
    code: "AD01",
    slug: "adab-menuntut-ilmu",
    name: "Adab Menuntut Ilmu",
    description:
      "Membangun sikap — satu materi pendek setiap pekan disertai refleksi singkat untuk menjaga adab dan niat.",
    role: "COMPANION",
    deliveryModel: "Materi pendamping mandiri",
    weeklyLoad: "±30 menit / pekan",
    instructorId: "in-3",
    sequence: 3,
  },
];

/** Week titles per course. Index 0 is Pekan 0 (orientasi). */
const ARAB_WEEKS = [
  "Orientasi dan Pengenalan Huruf",
  "Huruf Hijaiyah dan Bunyi Dasar",
  "Harakat dan Membaca Suku Kata",
  "Menulis Huruf Bersambung",
  "Kata Benda dan Kata Tunjuk",
  "Kosakata Kehidupan Sehari-hari",
  "Kalimat Nominal Sederhana",
  "Dhamir dan Kepemilikan",
  "Untuk Siapa Kita Beribadah?",
  "Struktur Kalimat Lanjutan",
  "Membaca Paragraf Pendek",
  "Pekan Murojaah",
  "Evaluasi Akhir Caturwulan",
];

const AQIDAH_WEEKS = [
  "Orientasi Aqidah 01",
  "Mengapa Mempelajari Agama",
  "Tujuan Penciptaan Manusia",
  "Mengenal Allah sebagai Rabb",
  "Makna Ibadah",
  "Pengertian Tauhid",
  "Tauhid Rububiyah",
  "Tauhid Uluhiyah",
  "Hanya kepada Allah Kita Beribadah",
  "Ikhlas dan Mengikuti Rasulullah",
  "Ilmu, Iman, dan Amal",
  "Pekan Murojaah",
  "Evaluasi Akhir Caturwulan",
];

/** The 12 Adab titles, verbatim from the brief §9.2. */
const ADAB_WEEKS = [
  "Orientasi Adab Menuntut Ilmu",
  "Meluruskan niat dalam menuntut ilmu",
  "Keutamaan ilmu syar'i",
  "Ilmu sebelum ucapan dan amal",
  "Adab kepada Allah dalam menuntut ilmu",
  "Adab kepada guru",
  "Adab mendengar dan mencatat ilmu",
  "Adab bertanya",
  "Tidak tergesa-gesa dalam menuntut ilmu",
  "Murojaah dan menjaga ilmu",
  "Mengamalkan ilmu",
  "Menjaga istiqamah",
  "Muhasabah perjalanan menuntut ilmu",
];

const WEEK_TITLES: Record<string, string[]> = {
  "co-arab": ARAB_WEEKS,
  "co-aqidah": AQIDAH_WEEKS,
  "co-adab": ADAB_WEEKS,
};

function weekType(n: number) {
  if (n === 0) return "ORIENTATION" as const;
  if (n === 11) return "REVIEW" as const;
  if (n === 12) return "ASSESSMENT" as const;
  return "REGULAR" as const;
}

export const weeks: Week[] = courses.flatMap((c) =>
  Array.from({ length: TOTAL_WEEKS + 1 }, (_, n) => ({
    id: `wk-${c.id}-${n}`,
    courseId: c.id,
    number: n,
    title: WEEK_TITLES[c.id][n],
    type: weekType(n),
    // Materi lanjutan hanya terbuka setelah pekan berjalan (prinsip bertahap).
    locked: n > CURRENT_WEEK,
  })),
);

/** The seven-part unit structure, applied to every regular week. */
const UNIT_PARTS: {
  key: string;
  title: string;
  type: Lesson["type"];
  minutes: number;
  essential: boolean;
}[] = [
  { key: "sebelum-belajar", title: "Sebelum Belajar", type: "article", minutes: 3, essential: false },
  { key: "materi-utama", title: "Materi Utama", type: "video", minutes: 25, essential: true },
  { key: "latihan", title: "Latihan", type: "exercise", minutes: 30, essential: true },
  { key: "worksheet", title: "Worksheet", type: "worksheet", minutes: 20, essential: false },
  { key: "murojaah", title: "Murojaah", type: "review", minutes: 15, essential: false },
  { key: "cek-pemahaman", title: "Cek Pemahaman", type: "quiz", minutes: 10, essential: true },
  { key: "refleksi", title: "Refleksi", type: "reflection", minutes: 5, essential: false },
];

const PART_DESC: Record<string, string> = {
  "sebelum-belajar": "Pengantar dan tujuan pekan ini",
  "materi-utama": "Video dan PDF ringkas",
  latihan: "Latihan terarah sesuai materi pekan ini",
  worksheet: "Pertanyaan terarah yang menghubungkan antarmata pelajaran",
  murojaah: "Ringkasan dan pengulangan pekan sebelumnya",
  "cek-pemahaman": "5 pertanyaan singkat, bukan ujian",
  refleksi: "Catatan pemahaman, manfaat, dan penerapan",
};

export const lessons: Lesson[] = weeks.flatMap((w) => {
  // Companion course keeps a lighter unit: materi + refleksi only.
  const parts =
    w.courseId === "co-adab"
      ? UNIT_PARTS.filter((p) => p.key === "materi-utama" || p.key === "refleksi")
      : UNIT_PARTS;
  return parts.map((p, i) => ({
    id: `ls-${w.id}-${p.key}`,
    weekId: w.id,
    title: p.title,
    slug: `${w.id}-${p.key}`,
    type: p.type,
    description: PART_DESC[p.key],
    durationMinutes: p.minutes,
    sequence: i + 1,
    isRequired: p.key !== "refleksi",
    isEssential: p.essential,
    publishStatus:
      w.number <= 10 ? "published" : w.number === 11 ? "review" : ("draft" as const),
  }));
});

/**
 * Progress for the signed-in demo student: everything before the current
 * week is done; the current week is partially done (4 of 7).
 */
export const lessonProgress: Record<string, "completed" | "in_progress" | "not_started"> = (() => {
  const map: Record<string, "completed" | "in_progress" | "not_started"> = {};
  for (const l of lessons) {
    const w = weeks.find((x) => x.id === l.weekId)!;
    if (w.number < CURRENT_WEEK) map[l.id] = "completed";
    else if (w.number === CURRENT_WEEK) map[l.id] = l.sequence <= 4 ? "completed" : "not_started";
    else map[l.id] = "not_started";
  }
  // Aqidah pekan 8 belum disentuh — jadi dasbor punya pekerjaan tersisa.
  for (const l of lessons) {
    const w = weeks.find((x) => x.id === l.weekId)!;
    if (w.courseId === "co-aqidah" && w.number === CURRENT_WEEK) map[l.id] = "not_started";
  }
  return map;
})();

export const sessions: Session[] = [
  { id: "se-1", courseId: "co-arab", type: "ONLINE_CLASS", title: "Bahasa Arab — Kelas Materi", startsAt: "2026-08-31T19:30:00+07:00", dayLabel: "Senin, 31 Agustus", timeLabel: "19.30–20.45", locationType: "online", meetingUrl: "https://meet.tia.id/arab-materi", attendance: "hadir" },
  { id: "se-2", courseId: "co-arab", type: "ONLINE_PRACTICE", title: "Bahasa Arab — Kelas Latihan", startsAt: "2026-09-02T19:30:00+07:00", dayLabel: "Rabu, 2 September", timeLabel: "19.30–20.30", locationType: "online", meetingUrl: "https://meet.tia.id/arab-latihan" },
  { id: "se-3", courseId: "co-arab", type: "OFFLINE_CLASS", title: "Praktik dan Penguatan", startsAt: "2026-09-05T08:00:00+07:00", dayLabel: "Sabtu, 5 September", timeLabel: "08.00–10.00", locationType: "offline", address: "Masjid Al-Hikmah, Ruang Belajar 2" },
  { id: "se-4", courseId: "co-aqidah", type: "MAJLIS_TASIL", title: "Majlis Ta'sil — Hanya kepada Allah Kita Beribadah", startsAt: "2026-09-06T09:00:00+07:00", dayLabel: "Ahad, 6 September", timeLabel: "09.00–11.00", locationType: "offline", address: "Aula TIA, Lantai 2" },
  { id: "se-5", courseId: "co-arab", type: "ONLINE_CLASS", title: "Bahasa Arab — Kelas Materi", startsAt: "2026-09-07T19:30:00+07:00", dayLabel: "Senin, 7 September", timeLabel: "19.30–20.45", locationType: "online", meetingUrl: "https://meet.tia.id/arab-materi" },
  { id: "se-6", courseId: "co-arab", type: "ONLINE_PRACTICE", title: "Bahasa Arab — Kelas Latihan", startsAt: "2026-09-09T19:30:00+07:00", dayLabel: "Rabu, 9 September", timeLabel: "19.30–20.30", locationType: "online", meetingUrl: "https://meet.tia.id/arab-latihan" },
];

export const participants: Participant[] = [
  { id: "pa-1", name: "Fauzan Hakim", email: "fauzan@example.com", segment: "Profesional", className: "I'dad A", attendance: "5/8", exercises: "4/8", competency: "Perlu Murojaah", engagement: "needs_attention", lastActiveDays: 8 },
  { id: "pa-2", name: "Ummu Salamah", email: "ummu@example.com", segment: "Ibu Rumah Tangga", className: "I'dad B", attendance: "4/8", exercises: "3/8", competency: "Belum Dikuasai", engagement: "at_risk", lastActiveDays: 15 },
  { id: "pa-3", name: "Ridwan Abdullah", email: "ridwan@example.com", segment: "Mahasiswa", className: "I'dad A", attendance: "7/8", exercises: "4/8", competency: "Perlu Murojaah", engagement: "needs_attention", lastActiveDays: 7 },
  { id: "pa-4", name: "Hafizh Nurdin", email: "hafizh@example.com", segment: "Returning", className: "I'dad C", attendance: "3/8", exercises: "2/8", competency: "Belum Dikuasai", engagement: "at_risk", lastActiveDays: 19 },
  { id: "pa-5", name: "Aisyah Rahmah", email: "aisyah@example.com", segment: "Profesional", className: "I'dad B", attendance: "6/8", exercises: "5/8", competency: "Perlu Murojaah", engagement: "needs_attention", lastActiveDays: 9 },
  { id: "pa-6", name: "Zulfikar Mahmud", email: "zulfikar@example.com", segment: "Profesional", className: "I'dad A", attendance: "5/8", exercises: "5/8", competency: "Perlu Murojaah", engagement: "needs_attention", lastActiveDays: 7 },
  { id: "pa-7", name: "Abdurrahman", email: "abdurrahman@example.com", segment: "Profesional", className: "I'dad A", attendance: "8/8", exercises: "7/8", competency: "Sudah Dikuasai", engagement: "on_track", lastActiveDays: 0 },
  { id: "pa-8", name: "Khadijah Amini", email: "khadijah@example.com", segment: "Ibu Rumah Tangga", className: "I'dad B", attendance: "8/8", exercises: "8/8", competency: "Sudah Dikuasai", engagement: "on_track", lastActiveDays: 1 },
  { id: "pa-9", name: "Ilyas Munandar", email: "ilyas@example.com", segment: "Mahasiswa", className: "I'dad C", attendance: "7/8", exercises: "7/8", competency: "Sudah Dikuasai", engagement: "on_track", lastActiveDays: 2 },
  { id: "pa-10", name: "Maryam Salsabila", email: "maryam@example.com", segment: "Mahasiswa", className: "I'dad B", attendance: "2/8", exercises: "1/8", competency: "Belum Dikuasai", engagement: "inactive", lastActiveDays: 26 },
];

export const registrations: Registration[] = [
  { id: "rg-1", name: "Yusuf Ramadhan", email: "yusuf@example.com", segment: "Profesional", submittedAt: "28 Agustus 2026", status: "menunggu" },
  { id: "rg-2", name: "Nabila Husna", email: "nabila@example.com", segment: "Mahasiswa", submittedAt: "27 Agustus 2026", status: "menunggu" },
  { id: "rg-3", name: "Umar Faruq", email: "umar@example.com", segment: "Returning", submittedAt: "26 Agustus 2026", status: "disetujui" },
  { id: "rg-4", name: "Halimah Sa'diyah", email: "halimah@example.com", segment: "Ibu Rumah Tangga", submittedAt: "25 Agustus 2026", status: "disetujui" },
  { id: "rg-5", name: "Bilal Anwar", email: "bilal@example.com", segment: "Mahasiswa", submittedAt: "24 Agustus 2026", status: "ditolak" },
];

export const announcements: Announcement[] = [
  { id: "an-1", title: "Majlis Ta'sil bulan ini dimajukan ke Ahad, 6 September", body: "Majlis Ta'sil Aqidah bulan kedua dimajukan satu pekan. Tempat tetap di Aula TIA lantai 2, pukul 09.00.", audience: "Peserta", publishedAt: "27 Agustus 2026", status: "published" },
  { id: "an-2", title: "Pekan 11 adalah Pekan Murojaah — tidak ada materi baru", body: "Gunakan pekan murojaah untuk mengulang kosakata dan struktur pekan 5–10, serta menyelesaikan latihan yang tertinggal.", audience: "Peserta", publishedAt: "24 Agustus 2026", status: "published" },
  { id: "an-3", title: "Registrasi Caturwulan 2 dibuka setelah evaluasi akhir", body: "Peserta yang menyelesaikan Caturwulan 1 dapat mendaftar Caturwulan 2. Tidak ada pendaftaran otomatis.", audience: "Semua", publishedAt: "20 Agustus 2026", status: "published" },
  { id: "an-4", title: "Panduan pengumpulan worksheet pekan 9", body: "Draf panduan, menunggu review pengampu.", audience: "Peserta", publishedAt: "—", status: "draft" },
];

export const notes: Note[] = [
  { id: "no-1", lessonTitle: "Kalimat Sederhana dan Kosakata Ibadah", courseName: "Bahasa Arab 01", body: "Perbedaan 'abd dan 'ibadah: 'abd adalah pelakunya, 'ibadah adalah perbuatannya. Perlu diulang.", createdAt: "26 Agustus 2026", bookmarkedForReview: true },
  { id: "no-2", lessonTitle: "Tauhid Rububiyah", courseName: "Aqidah 01", body: "Rububiyah = mengesakan Allah dalam perbuatan-Nya. Uluhiyah = mengesakan Allah dalam ibadah kita.", createdAt: "22 Agustus 2026", bookmarkedForReview: true },
  { id: "no-3", lessonTitle: "Menulis Huruf Bersambung", courseName: "Bahasa Arab 01", body: "Masih sering keliru pada huruf yang tidak bisa disambung setelahnya: alif, dal, dzal, ra, zai, waw.", createdAt: "12 Agustus 2026", bookmarkedForReview: true },
  { id: "no-4", lessonTitle: "Adab kepada guru", courseName: "Adab Menuntut Ilmu", body: "Poin yang paling mengena: tidak memotong penjelasan, dan bertanya setelah selesai.", createdAt: "8 Agustus 2026", bookmarkedForReview: false },
];

export const faq: FaqItem[] = [
  { q: "Apakah saya harus mengikuti seluruh jenjang TIA?", a: "Tidak. Pendaftaran dilakukan per caturwulan. Anda cukup berkomitmen untuk satu caturwulan terlebih dahulu, lalu memutuskan untuk melanjutkan setelah selesai." },
  { q: "Bagaimana jika saya tertinggal?", a: "LMS menyediakan Jalur Mengejar Ketertinggalan berisi materi esensial: satu video inti, satu PDF ringkas, satu latihan wajib, dan satu cek pemahaman. Jalur ini bersifat suportif, bukan hukuman." },
  { q: "Apakah semua kelas berlangsung live?", a: "Tidak. Sebagian materi dipelajari mandiri melalui LMS. Bahasa Arab memiliki dua kelas online dan satu pertemuan tatap muka pekanan, sedangkan Aqidah dan Adab sebagian besar mandiri." },
  { q: "Berapa beban belajar per pekan?", a: "Sekitar 4–6 jam per pekan, sudah termasuk kelas, latihan, worksheet, dan murojaah. Beban ini dirancang realistis bagi orang dewasa yang bekerja atau kuliah." },
  { q: "Apakah ada evaluasi dan sertifikat?", a: "Ada. Setiap caturwulan diakhiri dengan pekan murojaah dan evaluasi akhir. Peserta yang memenuhi syarat menerima laporan capaian dan Syahadah Penyelesaian." },
  { q: "Apa yang terjadi setelah caturwulan selesai?", a: "Tersedia jeda 1–2 pekan sebagai bagian dari desain pembelajaran. Setelah itu Anda dapat memutuskan untuk mendaftar caturwulan berikutnya." },
];

/** Attendance % per pekan; 0 = pekan belum berjalan. */
export const engagementByWeek = [96, 92, 90, 88, 84, 80, 82, 86, 0, 0, 0, 0];
