/**
 * Naskah beranda yang tidak punya padanan di basis data.
 *
 * Berkas ini dulu memuat seluruh data contoh aplikasi. Setelah semua halaman
 * membaca basis data, yang tersisa hanya dua daftar naskah pemasaran: peta
 * jalan program dan segmen pembaca. Keduanya sengaja tetap di kode — belum
 * ada penyunting untuk keduanya di portal, jadi memindahkannya ke basis data
 * justru membuatnya lebih sulit diubah.
 */

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
