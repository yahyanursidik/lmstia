/**
 * Seed data for Marhalah I'dad — Caturwulan 1.
 * Values transcribed from the TIA design canvas (TIA.dc.html) and
 * cross-checked against 02-CURRICULUM.md and the vibe-coding brief.
 *
 * This is the shape the Hono/Drizzle API will eventually return, so the
 * views already read from here rather than from inline literals.
 */

export type UnitStep = {
  nama: string;
  ket: string;
  durasi: string;
  done: boolean;
  current?: boolean;
};

/** The seven-part unit structure, fixed for every pekan. */
export const unitSteps: UnitStep[] = [
  { nama: "Sebelum Belajar", ket: "Pengantar dan tujuan pertemuan ini", durasi: "3 mnt", done: true },
  { nama: "Materi Utama", ket: "Video 18 menit + PDF ringkas", durasi: "25 mnt", done: true, current: true },
  { nama: "Latihan", ket: "Membaca dan menulis kalimat sederhana", durasi: "30 mnt", done: true },
  { nama: "Worksheet", ket: "Menghubungkan niat, ibadah, dan tauhid", durasi: "20 mnt", done: true },
  { nama: "Murojaah", ket: "Kosakata dan struktur pertemuan 5–7", durasi: "15 mnt", done: false },
  { nama: "Cek Pemahaman", ket: "5 pertanyaan singkat", durasi: "10 mnt", done: false },
  { nama: "Refleksi", ket: "Catatan pemahaman dan penerapan", durasi: "5 mnt", done: false },
];

export const cawu1Mapel = [
  {
    no: "01",
    nama: "Bahasa Arab 01",
    ket: "Membangun alat — membaca, menulis, kosakata, struktur dasar.",
    peran: "INTENSIF",
    intensif: true,
  },
  {
    no: "02",
    nama: "Aqidah 01",
    ket: "Membangun keyakinan — tauhid dan tujuan kehidupan.",
    peran: "FONDASI",
    intensif: false,
  },
  {
    no: "03",
    nama: "Adab Menuntut Ilmu",
    ket: "Membangun sikap — 1 materi pendek per pekan, 8–15 menit.",
    peran: "MANDIRI",
    intensif: false,
  },
];

export const prinsip = [
  { judul: "Bertahap", isi: "Tidak masuk ke pembahasan lanjutan sebelum fondasi cukup." },
  { judul: "Menguatkan Fondasi", isi: "Materi dipilih dari fondasi terpenting di setiap tahap." },
  { judul: "Ilmu Terhubung", isi: "Bahasa Arab, Aqidah, Fiqh, Hadits, dan Adab saling menguatkan." },
  { judul: "Menjaga Istiqamah", isi: "Beban belajar realistis dan sesuai kehidupan orang dewasa." },
];

export const polaDihindari = [
  "Semangat tinggi",
  "Beban menumpuk",
  "Tertinggal",
  "Merasa gagal",
  "Bosan",
  "Berhenti",
];

export const polaTIA = [
  "Mulai",
  "Belajar",
  "Berlatih",
  "Murojaah",
  "Menyelesaikan",
  "Beristirahat",
  "Melanjutkan",
];

export const ritme = [
  { hari: "SENIN", kegiatan: "Bahasa Arab — Kelas Materi", mode: "Online", tatapMuka: false },
  { hari: "RABU", kegiatan: "Bahasa Arab — Kelas Latihan", mode: "Online", tatapMuka: false },
  { hari: "SAB/AHAD", kegiatan: "Praktik dan Penguatan", mode: "Tatap muka", tatapMuka: true },
  { hari: "PEKANAN", kegiatan: "Aqidah & Adab Menuntut Ilmu", mode: "LMS mandiri", tatapMuka: false },
  { hari: "BULANAN", kegiatan: "Majlis Ta'sil Aqidah", mode: "Tatap muka", tatapMuka: true },
];

export const roadmap = [
  { marhalah: "I'dad", cawu: "Cawu 1", mapel: "Bahasa Arab 01 • Aqidah 01 • Adab Menuntut Ilmu" },
  { marhalah: "I'dad", cawu: "Cawu 2", mapel: "Bahasa Arab 02 • Fiqh 01 • Adab Ibadah" },
  { marhalah: "I'dad", cawu: "Cawu 3", mapel: "Bahasa Arab 03 • Hadits 01 • Adab dan Akhlak" },
  { marhalah: "Ta'sis", cawu: "Cawu 4", mapel: "Bahasa Arab 04 • Aqidah 02" },
  { marhalah: "Ta'sis", cawu: "Cawu 5", mapel: "Bahasa Arab 05 • Fiqh 02" },
  { marhalah: "Ta'sis", cawu: "Cawu 6", mapel: "Bahasa Arab 06 • Hadits 02" },
  {
    marhalah: "Tanmiyah",
    cawu: "Lanjutan",
    mapel: "Bahasa Arab lanjutan • Pembacaan teks • Kajian kitab sederhana",
  },
];

export const segmen = [
  {
    nama: "Profesional Muslim",
    usia: "± 25–45 TAHUN",
    butuh: "Belajar terstruktur yang kompatibel dengan pekerjaan dan keluarga.",
    nilai: "Ritme realistis dan fleksibel.",
  },
  {
    nama: "Mahasiswa Muslim",
    usia: "KAMPUS",
    butuh: "Fondasi Bahasa Arab dan ilmu syar'i yang runtut.",
    nilai: "Jalur bertahap dengan target jelas.",
  },
  {
    nama: "Ibu Rumah Tangga & Orang Tua",
    usia: "DARI RUMAH",
    butuh: "Fleksibilitas belajar dari rumah dengan arah yang jelas.",
    nilai: "LMS mandiri dan penguatan terjadwal.",
  },
  {
    nama: "Returning Learner",
    usia: "MEMULAI KEMBALI",
    butuh: "Menata kembali pengalaman dari banyak kajian yang belum runtut.",
    nilai: "Kesempatan memulai kembali dari fondasi.",
  },
];

export const infoPendaftaran = [
  { label: "Program", nilai: "TIA — Caturwulan 1" },
  { label: "Marhalah", nilai: "I'dad" },
  { label: "Durasi", nilai: "1 caturwulan · 12 pekan" },
  { label: "Beban belajar", nilai: "4–6 jam / pekan" },
];

/* --- Dasbor peserta ------------------------------------------- */

export const PEKAN_AKTIF = 8;
export const TOTAL_PEKAN = 12;

export const progresMapel = [
  { nama: "Bahasa Arab 01", peran: "Membangun alat · intensif", label: "PERTEMUAN 8 / 12", pct: 66 },
  { nama: "Aqidah 01", peran: "Membangun keyakinan · fondasi", label: "BULAN 2 / 3", pct: 58 },
  { nama: "Adab Menuntut Ilmu", peran: "Membangun sikap · mandiri", label: "7 / 12 MATERI", pct: 58 },
];

export const murojaahCatatan = [
  { topik: "Kosakata Pertemuan 5–6", status: "Sudah Dikuasai", perlu: false },
  { topik: "Menulis huruf bersambung", status: "Perlu Murojaah", perlu: true },
  { topik: "Tauhid rububiyah & uluhiyah", status: "Sudah Dikuasai", perlu: false },
];

/* --- Unit belajar --------------------------------------------- */

export const kosakata = [
  { ar: "الله", tr: "Allāh", id: "Allah" },
  { ar: "رَبّ", tr: "Rabb", id: "Tuhan" },
  { ar: "عَبْد", tr: "'abd", id: "Hamba" },
  { ar: "عِبَادَة", tr: "'ibādah", id: "Ibadah" },
  { ar: "نِيَّة", tr: "niyyah", id: "Niat" },
];

export const tujuanPembelajaran = [
  "Membaca dan menulis kalimat Arab sederhana.",
  "Mengenali kosakata inti tentang ibadah.",
  "Menghubungkan makna niat dengan tauhid.",
];

/* --- Dasbor admin --------------------------------------------- */

export const adminNav = [
  { nama: "Ringkasan Cawu", badge: "", aktif: true },
  { nama: "Peserta", badge: "64", aktif: false },
  { nama: "Kelas & Jadwal", badge: "6", aktif: false },
  { nama: "Unit & Konten", badge: "36", aktif: false },
  { nama: "Penilaian", badge: "", aktif: false },
  { nama: "Majlis Ta'sil", badge: "3", aktif: false },
  { nama: "Registrasi Cawu 2", badge: "", aktif: false },
];

export const kpi = [
  { label: "PESERTA AKTIF", nilai: "64", delta: "dari 71 terdaftar", tone: "muted" as const },
  { label: "KEHADIRAN PERTEMUAN 8", nilai: "86%", delta: "+4% dari pekan lalu", tone: "good" as const },
  { label: "LATIHAN SELESAI", nilai: "73%", delta: "−6% dari pekan lalu", tone: "warn" as const },
  { label: "BERISIKO BERHENTI", nilai: "7", delta: "perlu pendampingan", tone: "warn" as const },
];

/** Attendance % per pekan; 0 = pekan belum berjalan. */
export const keterlibatan = [96, 92, 90, 88, 84, 80, 82, 86, 0, 0, 0, 0];

export const kategoriHasil = [
  {
    nama: "Sudah Dikuasai",
    n: "38 peserta",
    pct: 59,
    color: "var(--color-forest)",
    tindak: "Lanjutkan dan pertahankan melalui murojaah.",
  },
  {
    nama: "Perlu Murojaah",
    n: "19 peserta",
    pct: 30,
    color: "#b08833",
    tindak: "Ulangi bagian penting dan perbaiki latihan.",
  },
  {
    nama: "Belum Dikuasai",
    n: "7 peserta",
    pct: 11,
    color: "#a5553f",
    tindak: "Ikuti penguatan dan pendampingan.",
  },
];

export type StatusPeserta = "Perlu Murojaah" | "Belum Dikuasai";

export type BarisPeserta = {
  nama: string;
  kelas: string;
  segmen: string;
  hadir: string;
  latihan: string;
  status: StatusPeserta;
  aksi: string;
};

export const pesertaPendampingan: BarisPeserta[] = [
  { nama: "Fauzan H.", kelas: "I'dad A · Bahasa Arab 01", segmen: "Profesional", hadir: "5/8", latihan: "4/8", status: "Perlu Murojaah", aksi: "Kirim jalur" },
  { nama: "Ummu Salamah", kelas: "I'dad B · Bahasa Arab 01", segmen: "Ibu Rumah Tangga", hadir: "4/8", latihan: "3/8", status: "Belum Dikuasai", aksi: "Jadwalkan" },
  { nama: "Ridwan A.", kelas: "I'dad A · Bahasa Arab 01", segmen: "Mahasiswa", hadir: "7/8", latihan: "4/8", status: "Perlu Murojaah", aksi: "Kirim jalur" },
  { nama: "Hafizh N.", kelas: "I'dad C · Bahasa Arab 01", segmen: "Returning", hadir: "3/8", latihan: "2/8", status: "Belum Dikuasai", aksi: "Jadwalkan" },
  { nama: "Aisyah R.", kelas: "I'dad B · Bahasa Arab 01", segmen: "Profesional", hadir: "6/8", latihan: "5/8", status: "Perlu Murojaah", aksi: "Kirim jalur" },
  { nama: "Zulfikar M.", kelas: "I'dad A · Bahasa Arab 01", segmen: "Profesional", hadir: "5/8", latihan: "5/8", status: "Perlu Murojaah", aksi: "Kirim jalur" },
];

export const STATUS_TONE: Record<StatusPeserta, { bg: string; fg: string }> = {
  "Perlu Murojaah": { bg: "#f6eddb", fg: "#8a6a25" },
  "Belum Dikuasai": { bg: "#f7e6e0", fg: "#8d4632" },
};

export const kesiapanKonten = [
  { pekan: "PERTEMUAN 9", judul: "Bahasa Arab 01 — Struktur kalimat lanjutan", status: "Siap", fg: "var(--color-forest)" },
  { pekan: "PERTEMUAN 10", judul: "Aqidah 01 — Ikhlas dan mengikuti Rasulullah", status: "Siap", fg: "var(--color-forest)" },
  { pekan: "PERTEMUAN 11", judul: "Pertemuan Murojaah — tanpa materi baru", status: "Perlu review", fg: "#8a6a25" },
  { pekan: "PERTEMUAN 12", judul: "Evaluasi Akhir Caturwulan + Muhasabah", status: "Draf", fg: "#8d4632" },
];

/** Bobot evaluasi akhir caturwulan — brief §8.7. */
export const bobotEvaluasi = [
  { komponen: "Kehadiran & keterlibatan", bobot: "20%" },
  { komponen: "Latihan & worksheet", bobot: "30%" },
  { komponen: "Quiz / cek pemahaman", bobot: "20%" },
  { komponen: "Evaluasi akhir", bobot: "30%" },
];
