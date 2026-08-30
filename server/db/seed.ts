/**
 * Seed untuk hierarki konten lima tingkat:
 * Program → Tahapan → Mata Pelajaran → Pertemuan → Materi (+ kuis, link live).
 *
 * Idempoten: mengosongkan tabel yang dimilikinya lalu mengisi ulang.
 * Jalankan dengan `npm run db:seed`.
 */

import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "./client";
import * as s from "./schema";

const TOTAL_MEETINGS = 12;
const CURRENT_MEETING = 8;

/* --- judul pertemuan per mata pelajaran ------------------------- */

const ARAB = [
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
  "Evaluasi Akhir Tahapan",
];

const AQIDAH = [
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
  "Evaluasi Akhir Tahapan",
];

const ADAB = [
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

function meetingType(n: number) {
  if (n === 0) return "ORIENTATION" as const;
  if (n === 11) return "REVIEW" as const;
  if (n === 12) return "ASSESSMENT" as const;
  return "REGULAR" as const;
}

/** Materi contoh per pertemuan — menunjukkan keempat sumber yang didukung. */
function materialsFor(subjectIdx: number, n: number, title: string) {
  const base: {
    title: string;
    type: "pdf" | "audio" | "video" | "youtube" | "gdrive" | "article";
    url: string | null;
    minutes: number;
    essential: boolean;
  }[] = [];

  if (subjectIdx === 0) {
    // Bahasa Arab — rekaman kelas + ringkasan + lembar latihan.
    base.push(
      { title: `Rekaman Kelas Materi — ${title}`, type: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", minutes: 18, essential: true },
      { title: `Ringkasan Materi Pertemuan ${n}`, type: "pdf", url: "https://drive.google.com/file/d/1TIAringkasan/view", minutes: 8, essential: true },
      { title: `Lembar Kosakata Pertemuan ${n}`, type: "gdrive", url: "https://drive.google.com/file/d/1TIAkosakata/view", minutes: 6, essential: false },
    );
  } else if (subjectIdx === 1) {
    // Aqidah — bacaan + audio penguatan.
    base.push(
      { title: `Bacaan: ${title}`, type: "article", url: null, minutes: 12, essential: true },
      { title: `Audio Penguatan — ${title}`, type: "audio", url: "https://cdn.tia.id/audio/aqidah-" + n + ".mp3", minutes: 14, essential: true },
      { title: `Catatan Dalil Pertemuan ${n}`, type: "pdf", url: "https://drive.google.com/file/d/1TIAdalil/view", minutes: 5, essential: false },
    );
  } else {
    // Adab — materi pendek mandiri.
    base.push(
      { title: `Audio: ${title}`, type: "audio", url: "https://cdn.tia.id/audio/adab-" + n + ".mp3", minutes: 11, essential: true },
      { title: `Lembar Refleksi Pertemuan ${n}`, type: "gdrive", url: "https://drive.google.com/file/d/1TIArefleksi/view", minutes: 5, essential: false },
    );
  }
  return base;
}

async function reset() {
  await db.delete(s.assessmentAnswers);
  await db.delete(s.assessmentAttempts);
  await db.delete(s.assessmentQuestions);
  await db.delete(s.assessments);
  await db.delete(s.attendance);
  await db.delete(s.bookmarks);
  await db.delete(s.notes);
  await db.delete(s.materialProgress);
  await db.delete(s.materials);
  await db.delete(s.meetings);
  await db.delete(s.enrollments);
  await db.delete(s.announcements);
  await db.delete(s.subjects);
  await db.delete(s.tahapan);
  await db.delete(s.programs);
  await db.delete(s.auditLogs);
  await db.delete(s.authSessions);
  await db.delete(s.users);
}

/**
 * Seed ini MENGHAPUS seluruh isi tabel sebelum mengisi ulang. Itu aman pada
 * basis data kosong, dan menghancurkan pada basis data yang sudah dipakai —
 * termasuk konten yang dimasukkan lewat portal admin.
 *
 * Karena itu seed menolak berjalan bila sudah ada isinya, kecuali penghapusan
 * dinyatakan secara eksplisit. Sengaja tidak memakai flag yang mudah terketik
 * ulang dari riwayat shell.
 */
async function pastikanAmanUntukMenghapus() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed menolak berjalan dengan NODE_ENV=production.");
  }

  const [{ programs, tahapanCount, subjects, meetings, materials, users }] = await db
    .select({
      programs: sql<number>`(select count(*) from ${s.programs})::int`,
      tahapanCount: sql<number>`(select count(*) from ${s.tahapan})::int`,
      subjects: sql<number>`(select count(*) from ${s.subjects})::int`,
      meetings: sql<number>`(select count(*) from ${s.meetings})::int`,
      materials: sql<number>`(select count(*) from ${s.materials})::int`,
      users: sql<number>`(select count(*) from ${s.users})::int`,
    })
    .from(sql`(select 1) as _`);

  const total = programs + tahapanCount + subjects + meetings + materials + users;
  if (total === 0) return;

  if (process.env.SEED_HAPUS_SEMUA === "ya-saya-yakin") {
    console.warn("⚠  Menghapus data yang sudah ada atas permintaan eksplisit.");
    return;
  }

  const host = (process.env.DATABASE_URL ?? "").split("@")[1]?.split("/")[0] ?? "(tidak diketahui)";
  throw new Error(
    [
      "",
      "Seed DIBATALKAN — basis data ini sudah berisi data.",
      "",
      `  host      : ${host}`,
      `  program   : ${programs}`,
      `  tahapan   : ${tahapanCount}`,
      `  mapel     : ${subjects}`,
      `  pertemuan : ${meetings}`,
      `  materi    : ${materials}`,
      `  pengguna  : ${users}`,
      "",
      "Menjalankan seed akan MENGHAPUS semuanya, termasuk konten yang",
      "dimasukkan lewat portal admin. Bila memang itu yang diinginkan:",
      "",
      "  SEED_HAPUS_SEMUA=ya-saya-yakin npm run db:seed",
      "",
    ].join("\n"),
  );
}

async function main() {
  await pastikanAmanUntukMenghapus();
  console.log("→ mengosongkan data lama…");
  await reset();

  console.log("→ users");
  const instructors = await db
    .insert(s.users)
    .values([
      // Urutan disamakan dengan src/domain/seed.ts agar tidak membingungkan.
      // Aqidah dan Adab diampu pengajar yang sama — satu catatan, dua mata pelajaran.
      { name: "Ustadz Abu Haidar As-Sundawy حفظه الله", email: "abu.haidar@tia.id", role: "instructor" },
      { name: "Ustadz M. Hilman Al-Fiqhy, M.A. حفظه الله", email: "hilman.alfiqhy@tia.id", role: "instructor" },
    ])
    .returning();

  const studentRows = [
    { name: "Abdurrahman", email: "abdurrahman@example.com", segment: "Profesional", cls: "I'dad A", eng: "on_track", comp: "sudah_dikuasai" },
    { name: "Fauzan Hakim", email: "fauzan@example.com", segment: "Profesional", cls: "I'dad A", eng: "needs_attention", comp: "perlu_murojaah" },
    { name: "Ummu Salamah", email: "ummu@example.com", segment: "Ibu Rumah Tangga", cls: "I'dad B", eng: "at_risk", comp: "belum_dikuasai" },
    { name: "Ridwan Abdullah", email: "ridwan@example.com", segment: "Mahasiswa", cls: "I'dad A", eng: "needs_attention", comp: "perlu_murojaah" },
    { name: "Hafizh Nurdin", email: "hafizh@example.com", segment: "Returning", cls: "I'dad C", eng: "at_risk", comp: "belum_dikuasai" },
    { name: "Aisyah Rahmah", email: "aisyah@example.com", segment: "Profesional", cls: "I'dad B", eng: "needs_attention", comp: "perlu_murojaah" },
    { name: "Zulfikar Mahmud", email: "zulfikar@example.com", segment: "Profesional", cls: "I'dad A", eng: "needs_attention", comp: "perlu_murojaah" },
    { name: "Khadijah Amini", email: "khadijah@example.com", segment: "Ibu Rumah Tangga", cls: "I'dad B", eng: "on_track", comp: "sudah_dikuasai" },
    { name: "Ilyas Munandar", email: "ilyas@example.com", segment: "Mahasiswa", cls: "I'dad C", eng: "on_track", comp: "sudah_dikuasai" },
    { name: "Maryam Salsabila", email: "maryam@example.com", segment: "Mahasiswa", cls: "I'dad B", eng: "inactive", comp: "belum_dikuasai" },
  ] as const;

  const students = await db
    .insert(s.users)
    .values(studentRows.map((r) => ({ name: r.name, email: r.email, role: "student" as const, segment: r.segment })))
    .returning();

  console.log("→ program");
  const [program] = await db
    .insert(s.programs)
    .values({
      name: "Tarbiyah Sunnah Islamic Academy",
      slug: "tia",
      description:
        "Program pembelajaran Islam bertahap bagi Muslim dewasa: Bahasa Arab dan ilmu syar'i melalui tahapan yang terarah dan realistis.",
      status: "active",
      sequence: 1,
    })
    .returning();

  console.log("→ tahapan");
  const tahapanRows = await db
    .insert(s.tahapan)
    .values([
      {
        programId: program.id,
        code: "IDAD-1",
        slug: "caturwulan-1",
        name: "Caturwulan 1 — Marhalah I'dad",
        title: "Membangun Fondasi Menuntut Ilmu",
        subtitle: "Bahasa Arab 01 · Aqidah 01 · Adab Menuntut Ilmu",
        startDate: new Date("2026-07-06"),
        endDate: new Date("2026-09-27"),
        durationWeeks: 12,
        status: "running",
        isPublic: true,
        sequence: 1,
      },
      {
        programId: program.id,
        code: "IDAD-2",
        slug: "caturwulan-2",
        name: "Caturwulan 2 — Marhalah I'dad",
        title: "Membangun Fondasi Ibadah",
        subtitle: "Bahasa Arab 02 · Fiqh 01 · Adab Ibadah",
        startDate: new Date("2026-10-12"),
        endDate: new Date("2027-01-03"),
        durationWeeks: 12,
        status: "open",
        isPublic: true,
        sequence: 2,
      },
      {
        programId: program.id,
        code: "IDAD-3",
        slug: "caturwulan-3",
        name: "Caturwulan 3 — Marhalah I'dad",
        title: "Menjaga dan Mengamalkan Ilmu",
        subtitle: "Bahasa Arab 03 · Hadits 01 · Adab dan Akhlak",
        durationWeeks: 12,
        status: "draft",
        isPublic: false,
        sequence: 3,
      },
    ])
    .returning();
  const cawu1 = tahapanRows[0];

  console.log("→ mata pelajaran");
  const subjects = await db
    .insert(s.subjects)
    .values([
      {
        tahapanId: cawu1.id,
        code: "AR01",
        slug: "bahasa-arab-01",
        name: "Bahasa Arab 01",
        description: "Membangun alat — membaca, menulis, kosakata, dan struktur kalimat dasar.",
        role: "INTENSIVE",
        deliveryModel: "2 kelas online + 1 tatap muka pekanan",
        weeklyLoad: "2–3 jam / pekan",
        instructorId: instructors[1].id,
        sequence: 1,
      },
      {
        tahapanId: cawu1.id,
        code: "AQ01",
        slug: "aqidah-01",
        name: "Aqidah 01",
        description: "Membangun keyakinan — tujuan kehidupan, tauhid rububiyah dan uluhiyah.",
        role: "FOUNDATION",
        deliveryModel: "Materi mandiri LMS + Majlis Ta'sil bulanan",
        weeklyLoad: "1–2 jam / pekan",
        instructorId: instructors[0].id,
        sequence: 2,
      },
      {
        tahapanId: cawu1.id,
        code: "AD01",
        slug: "adab-menuntut-ilmu",
        name: "Adab Menuntut Ilmu",
        description: "Membangun sikap — satu materi pendek setiap pertemuan disertai refleksi.",
        role: "COMPANION",
        deliveryModel: "Materi pendamping mandiri",
        weeklyLoad: "±30 menit / pekan",
        instructorId: instructors[0].id,
        sequence: 3,
      },
    ])
    .returning();

  const titles = [ARAB, AQIDAH, ADAB];

  console.log("→ pertemuan + materi + kuis");
  let nMeetings = 0;
  let nMaterials = 0;
  let nAssessments = 0;
  let nQuestions = 0;

  for (let si = 0; si < subjects.length; si++) {
    const subject = subjects[si];

    const meetingRows = await db
      .insert(s.meetings)
      .values(
        Array.from({ length: TOTAL_MEETINGS + 1 }, (_, n) => {
          // Bahasa Arab hybrid; Aqidah & Adab mandiri, kecuali Majlis Ta'sil bulanan.
          const isMajlis = si === 1 && n > 0 && n % 4 === 0;
          const mode = si === 0 ? ("hybrid" as const) : isMajlis ? ("offline" as const) : ("mandiri" as const);
          return {
            subjectId: subject.id,
            number: n,
            title: titles[si][n],
            description: `Pertemuan ${n} — ${titles[si][n]}`,
            type: meetingType(n),
            mode,
            liveUrl: si === 0 ? "https://meet.tia.id/bahasa-arab-01" : isMajlis ? null : null,
            livePlatform: si === 0 ? "Google Meet" : null,
            location: isMajlis ? "Aula TIA, Lantai 2" : si === 0 ? "Masjid Al-Hikmah (sesi tatap muka)" : null,
            startsAt: n > 0 ? new Date(Date.UTC(2026, 6, 6 + (n - 1) * 7, 12, 30)) : null,
            durationMinutes: si === 0 ? 75 : isMajlis ? 120 : 30,
            attendanceEnabled: si === 0 || isMajlis,
            sequence: n,
            isLocked: n > CURRENT_MEETING,
            publishStatus: (n <= 10 ? "published" : n === 11 ? "review" : "draft") as
              | "published"
              | "review"
              | "draft",
            publishedAt: n <= 10 ? new Date() : null,
          };
        }),
      )
      .returning();
    nMeetings += meetingRows.length;

    for (const m of meetingRows) {
      const mats = materialsFor(si, m.number, m.title);
      const inserted = await db
        .insert(s.materials)
        .values(
          mats.map((x, i) => ({
            meetingId: m.id,
            title: x.title,
            description: x.type === "article" ? "Bacaan ringkas untuk pertemuan ini." : null,
            type: x.type,
            url: x.url,
            content: x.type === "article" ? `Pembahasan ${m.title}.` : null,
            durationMinutes: x.minutes,
            sequence: i + 1,
            isRequired: true,
            isEssential: x.essential,
            publishStatus: m.publishStatus,
          })),
        )
        .returning();
      nMaterials += inserted.length;

      // Progres peserta demo: sebelum pertemuan berjalan = selesai.
      const demo = students[0];
      if (m.number <= CURRENT_MEETING) {
        await db.insert(s.materialProgress).values(
          inserted.map((mat) => ({
            userId: demo.id,
            materialId: mat.id,
            status: (m.number < CURRENT_MEETING || (si !== 1 && mat.sequence <= 2)
              ? "completed"
              : "not_started") as "completed" | "not_started",
            completedAt: m.number < CURRENT_MEETING ? new Date() : null,
          })),
        );
      }

      // Kuis pekanan melekat pada pertemuan. Ujian akhir mata pelajaran
      // dipasang terpisah setelah loop, karena menempel pada subject.
      if (m.type === "REGULAR") {
        const [a] = await db
          .insert(s.assessments)
          .values({
            meetingId: m.id,
            kind: "kuis",
            title: `Cek Pemahaman Pertemuan ${m.number}`,
            description:
              "Beberapa pertanyaan singkat untuk melihat bagian mana yang perlu murojaah.",
            kkm: 70,
            durationMinutes: 10,
            weight: 20,
            maxAttempts: 0,
            showFeedback: true,
            publishStatus: m.publishStatus,
          })
          .returning();
        nAssessments++;

        // Satu contoh dari tiap tipe soal.
        await db.insert(s.assessmentQuestions).values([
          {
            assessmentId: a.id,
            type: "multiple_choice",
            prompt: `Apa inti pembahasan pada pertemuan "${m.title}"?`,
            options: JSON.stringify([
              "Membangun fondasi pemahaman sebelum melangkah lebih jauh",
              "Menghafal seluruh istilah tanpa memahaminya",
              "Mempercepat materi agar segera selesai",
              "Melewati latihan bila sudah merasa paham",
            ]),
            answerKey: "0",
            explanation: "Fondasi didahulukan; kecepatan bukan tujuan.",
            points: 2,
            sequence: 1,
          },
          {
            assessmentId: a.id,
            type: "true_false",
            prompt: "Murojaah adalah bagian inti kurikulum, bukan aktivitas tambahan.",
            answerKey: "true",
            explanation: "Murojaah dirancang sebagai bagian tetap setiap pekan.",
            points: 1,
            sequence: 2,
          },
          {
            assessmentId: a.id,
            type: "essay",
            prompt: `Tuliskan satu hal yang Anda pahami dari pertemuan "${m.title}", dan satu hal yang masih perlu diperjelas.`,
            points: 3,
            sequence: 3,
          },
        ]);
        nQuestions += 3;
      }
    }

    // Ujian akhir menempel pada MATA PELAJARAN, bukan pertemuan — mencakup
    // seluruh pertemuan di dalamnya.
    const [ujian] = await db
      .insert(s.assessments)
      .values({
        subjectId: subject.id,
        kind: "ujian",
        title: `Ujian Akhir — ${subject.name}`,
        description: "Evaluasi akhir yang mencakup seluruh pertemuan mata pelajaran ini.",
        kkm: 75,
        durationMinutes: 60,
        weight: 30,
        maxAttempts: 1,
        shuffleQuestions: true,
        showFeedback: false,
        publishStatus: "published",
      })
      .returning();
    nAssessments++;

    await db.insert(s.assessmentQuestions).values([
      {
        assessmentId: ujian.id,
        type: "multiple_choice",
        prompt: `Manakah yang paling tepat menggambarkan tujuan ${subject.name}?`,
        options: JSON.stringify([
          "Membangun kemampuan dasar secara bertahap dan tuntas",
          "Menyelesaikan seluruh materi secepat mungkin",
          "Mengumpulkan sebanyak mungkin catatan",
          "Menghafal tanpa perlu memahami",
        ]),
        answerKey: "0",
        explanation: "Tujuannya bertahap dan tuntas, bukan cepat.",
        points: 4,
        sequence: 1,
      },
      {
        assessmentId: ujian.id,
        type: "true_false",
        prompt: "Peserta dapat melanjutkan ke tahapan berikutnya tanpa menyelesaikan evaluasi akhir.",
        answerKey: "false",
        explanation: "Evaluasi akhir adalah syarat penutup tahapan.",
        points: 2,
        sequence: 2,
      },
      {
        assessmentId: ujian.id,
        type: "essay",
        prompt: `Jelaskan perjalanan belajar Anda pada ${subject.name}: apa yang sudah dikuasai, dan apa yang masih perlu dimurojaah.`,
        points: 6,
        sequence: 3,
      },
    ]);
    nQuestions += 3;
  }

  // Asesmen lintas mata pelajaran: satu di tingkat tahapan, satu di tingkat
  // program — menunjukkan keempat tingkat penempelan terpakai.
  console.log("→ asesmen tahapan & program");

  const [evaluasiTahapan] = await db
    .insert(s.assessments)
    .values({
      tahapanId: cawu1.id,
      kind: "ujian",
      title: `Evaluasi Akhir ${cawu1.name}`,
      description:
        "Evaluasi penutup caturwulan yang mencakup seluruh mata pelajaran: Bahasa Arab, Aqidah, dan Adab.",
      kkm: 75,
      durationMinutes: 90,
      weight: 30,
      maxAttempts: 1,
      shuffleQuestions: true,
      showFeedback: false,
      publishStatus: "published",
    })
    .returning();
  nAssessments++;

  await db.insert(s.assessmentQuestions).values([
    {
      assessmentId: evaluasiTahapan.id,
      type: "multiple_choice",
      prompt: "Apa prinsip utama sistem caturwulan di TIA?",
      options: JSON.stringify([
        "Satu caturwulan adalah unit belajar yang utuh dan tuntas",
        "Peserta wajib menyelesaikan seluruh marhalah sekaligus",
        "Materi dipercepat agar selesai lebih awal",
        "Peserta otomatis lanjut ke caturwulan berikutnya",
      ]),
      answerKey: "0",
      explanation: "Komitmen selalu per caturwulan, bukan per program.",
      points: 5,
      sequence: 1,
    },
    {
      assessmentId: evaluasiTahapan.id,
      type: "true_false",
      prompt: "Pekan murojaah tidak memuat materi baru.",
      answerKey: "true",
      explanation: "Pekan 11 khusus untuk mengulang.",
      points: 3,
      sequence: 2,
    },
    {
      assessmentId: evaluasiTahapan.id,
      type: "essay",
      prompt:
        "Uraikan keterkaitan antara Bahasa Arab, Aqidah, dan Adab yang Anda rasakan sepanjang caturwulan ini.",
      points: 12,
      sequence: 3,
    },
  ]);
  nQuestions += 3;

  const [ujiPenempatan] = await db
    .insert(s.assessments)
    .values({
      programId: program.id,
      kind: "ujian",
      title: "Uji Penempatan Program TIA",
      description:
        "Menentukan tahapan yang paling sesuai bagi calon peserta sebelum mendaftar caturwulan.",
      kkm: 60,
      durationMinutes: 45,
      maxAttempts: 1,
      shuffleQuestions: false,
      showFeedback: true,
      publishStatus: "published",
    })
    .returning();
  nAssessments++;

  await db.insert(s.assessmentQuestions).values([
    {
      assessmentId: ujiPenempatan.id,
      type: "true_false",
      prompt: "Saya sudah dapat membaca huruf hijaiyah berharakat.",
      answerKey: "true",
      points: 2,
      sequence: 1,
    },
    {
      assessmentId: ujiPenempatan.id,
      type: "multiple_choice",
      prompt: "Seberapa banyak waktu belajar yang realistis bagi Anda setiap pekan?",
      options: JSON.stringify(["Kurang dari 2 jam", "2–4 jam", "4–6 jam", "Lebih dari 6 jam"]),
      answerKey: "2",
      explanation: "Beban belajar TIA dirancang sekitar 4–6 jam per pekan.",
      points: 2,
      sequence: 2,
    },
  ]);
  nQuestions += 2;

  console.log("→ pendaftaran");
  await db.insert(s.enrollments).values(
    students.map((u, i) => ({
      userId: u.id,
      tahapanId: cawu1.id,
      status: "active" as const,
      engagement: studentRows[i].eng,
      competency: studentRows[i].comp,
      className: studentRows[i].cls,
      progress: Math.round((CURRENT_MEETING / TOTAL_MEETINGS) * 100),
      approvedAt: new Date(),
      startedAt: new Date(),
    })),
  );

  console.log("→ pengumuman");
  await db.insert(s.announcements).values([
    { tahapanId: cawu1.id, title: "Majlis Ta'sil bulan ini dimajukan ke Ahad, 6 September", body: "Tempat tetap di Aula TIA lantai 2, pukul 09.00.", audience: "Peserta", status: "published", publishedAt: new Date("2026-08-27") },
    { tahapanId: cawu1.id, title: "Pertemuan 11 adalah Pekan Murojaah — tidak ada materi baru", body: "Gunakan pekan murojaah untuk mengulang pertemuan 5–10.", audience: "Peserta", status: "published", publishedAt: new Date("2026-08-24") },
    { tahapanId: cawu1.id, title: "Registrasi Caturwulan 2 dibuka setelah evaluasi akhir", body: "Tidak ada pendaftaran otomatis.", audience: "Semua", status: "published", publishedAt: new Date("2026-08-20") },
    { tahapanId: cawu1.id, title: "Panduan pengumpulan worksheet pertemuan 9", body: "Draf panduan, menunggu review pengampu.", audience: "Peserta", status: "draft" },
  ]);

  console.log("→ catatan");
  const anyMaterial = await db.query.materials.findFirst({ where: eq(s.materials.type, "pdf") });
  if (anyMaterial) {
    await db.insert(s.notes).values({
      userId: students[0].id,
      materialId: anyMaterial.id,
      body: "Perbedaan 'abd dan 'ibadah: 'abd adalah pelakunya, 'ibadah adalah perbuatannya.",
    });
    await db.insert(s.bookmarks).values({ userId: students[0].id, materialId: anyMaterial.id });
  }

  console.log("");
  console.log("Selesai:");
  console.log(`  program        : 1`);
  console.log(`  tahapan        : ${tahapanRows.length}`);
  console.log(`  mata pelajaran : ${subjects.length}`);
  console.log(`  pertemuan      : ${nMeetings}`);
  console.log(`  materi         : ${nMaterials}`);
  console.log(`  kuis/ujian     : ${nAssessments}`);
  console.log(`  users          : ${instructors.length + students.length}`);
  console.log("");
  console.log("Jalankan `npm run db:accounts` untuk membuat ulang akun demo.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Seed gagal:", e);
    process.exit(1);
  });
