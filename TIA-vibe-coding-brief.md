# Product Brief — TIA Learning Platform

> **Vibe coding brief** untuk membangun MVP platform pembelajaran Tarbiyah Sunnah Islamic Academy (TIA).

## 1. Ringkasan Produk

**Nama produk:** Tarbiyah Sunnah Islamic Academy (TIA)  
**Jenis:** Web app LMS responsif untuk pembelajaran Islam nonformal  
**Bahasa antarmuka:** Bahasa Indonesia  
**Target pengguna:** Muslim dewasa yang ingin membangun fondasi Bahasa Arab dan ilmu syar’i secara bertahap, terstruktur, terintegrasi, fleksibel, dan realistis.

**Janji utama:**

> Satu Caturwulan. Satu Fokus. Satu Tahap Tuntas.

TIA bukan kumpulan video kajian, tetapi jalur belajar yang memiliki struktur, target, aktivitas, evaluasi, pendampingan, rekam jejak, dan kesinambungan antartahap.

## 2. Tujuan MVP

Membangun pengalaman belajar yang membantu peserta:

1. memahami fokus caturwulan yang sedang dijalani;
2. mengetahui aktivitas terdekat tanpa terbebani roadmap panjang;
3. mengakses materi, latihan, worksheet, kuis, murojaah, dan refleksi;
4. memantau kemajuan berdasarkan caturwulan;
5. melihat capaian kompetensi dan rekomendasi tindak lanjut;
6. menyelesaikan satu tahap, beristirahat, lalu memutuskan apakah akan melanjutkan.

## 3. Prinsip Produk

- **Bertahap:** materi lanjutan dibuka setelah fondasi cukup.
- **Fokus:** satu caturwulan hanya menampilkan sedikit mata pelajaran utama.
- **Terintegrasi:** Bahasa Arab, Aqidah, Adab, dan worksheet saling terhubung.
- **Realistis:** target beban belajar 4–6 jam per pekan.
- **Murojaah:** pengulangan adalah bagian inti, bukan aktivitas tambahan.
- **Progress dekat:** tampilkan progres caturwulan, bukan persentase seluruh perjalanan bertahun-tahun.
- **Bahasa sederhana:** utamakan istilah Indonesia yang mudah dipahami.
- **Mobile-first:** mayoritas aktivitas harus nyaman dilakukan lewat ponsel.

## 4. Pengguna dan Peran

### 4.1 Peserta

Dapat melihat program aktif, mengikuti unit, mengirim latihan, mengerjakan kuis, menulis refleksi, melihat progres, dan mengakses laporan hasil belajar.

### 4.2 Pengajar

Dapat mengelola kelas yang diampu, melihat peserta, memeriksa latihan, memberi umpan balik, mencatat kehadiran, dan melihat peserta yang tertinggal.

### 4.3 Admin Akademik

Dapat mengelola program, caturwulan, mata pelajaran, unit, jadwal, pengajar, peserta, evaluasi, dan laporan.

> Untuk MVP awal, pengajar dan admin boleh memakai dashboard terpadu dengan hak akses berbeda.

## 5. Struktur Akademik

```text
Program TIA
└── Marhalah
    └── Caturwulan
        ├── Mata Pelajaran Intensif
        ├── Mata Pelajaran Fondasi
        └── Materi Pendamping Mandiri
            └── Unit Mingguan
                ├── Sebelum Belajar
                ├── Materi Utama
                ├── Latihan
                ├── Worksheet
                ├── Murojaah
                ├── Cek Pemahaman
                └── Refleksi
```

### Roadmap akademik

1. **I’dad** — Persiapan
2. **Ta’sis** — Fondasi
3. **Tanmiyah** — Pengembangan
4. **Taqwiyah** — Penguatan
5. **Takhassus** — Peminatan

Roadmap lengkap tersedia di halaman khusus, tetapi dashboard peserta hanya menonjolkan caturwulan aktif dan satu langkah berikutnya.

## 6. Scope Konten MVP

Gunakan **Marhalah I’dad — Caturwulan 1** sebagai seed data.

**Tema:** Membangun Fondasi Menuntut Ilmu  
**Durasi default:** 12 pekan  
**Pilar:**

| Mata pelajaran | Peran | Intensitas |
|---|---|---|
| Bahasa Arab 01 | Membangun alat | Intensif |
| Aqidah 01 | Membangun keyakinan | Fondasi |
| Adab Menuntut Ilmu | Membangun sikap | Pendamping mandiri |

### Ritme mingguan

- **Senin:** Bahasa Arab — Kelas Materi, online, 60–75 menit.
- **Rabu:** Bahasa Arab — Kelas Latihan, online, 45–60 menit.
- **Sabtu/Ahad:** Bahasa Arab — Praktik dan penguatan, tatap muka.
- **Sepanjang pekan:** Aqidah dan Adab melalui LMS.
- **Akhir bulan:** Majlis Ta’sil Aqidah, tatap muka.

## 7. User Journey Utama

```text
Daftar Cawu 1
→ Orientasi
→ Belajar mingguan
→ Latihan dan umpan balik
→ Murojaah
→ Evaluasi akhir
→ Lihat capaian
→ Jeda 1–2 pekan
→ Putuskan melanjutkan
→ Daftar Cawu 2
```

### First-time onboarding

1. Sambutan dan positioning singkat.
2. Tampilkan fokus Cawu 1, durasi, dan estimasi beban belajar.
3. Peserta memilih preferensi pengingat.
4. Tampilkan cara belajar: **Belajar → Latihan → Murojaah → Amal → Refleksi**.
5. Tombol utama: **Mulai Pekan 1**.

## 8. Halaman dan Fitur MVP

### 8.1 Login

- Login email dan kata sandi atau magic link.
- Lupa kata sandi.
- Redirect berdasarkan peran.

### 8.2 Dashboard Peserta

Prioritaskan informasi berikut:

- sapaan singkat;
- nama program dan caturwulan aktif;
- tema akademik;
- progress seperti **“8 dari 12 pekan selesai”**;
- aktivitas berikutnya;
- tugas yang perlu diselesaikan;
- jadwal kelas terdekat;
- tombol **Lanjutkan Belajar**;
- ringkasan progres per mata pelajaran;
- pengingat murojaah.

Jangan tampilkan “Program TIA 7% selesai”. Gunakan status lokal seperti **“Cawu 1 — 75%”** atau **“Cawu 1 selesai”**.

### 8.3 Halaman Caturwulan

- Tujuan dan capaian caturwulan.
- Daftar mata pelajaran.
- Timeline 12 pekan.
- Status setiap pekan: terkunci, tersedia, berjalan, selesai, perlu murojaah.
- Jadwal kegiatan dan tenggat.
- Pekan murojaah dan evaluasi akhir.

### 8.4 Halaman Mata Pelajaran

- Deskripsi dan capaian.
- Pengajar.
- Daftar unit mingguan.
- Persentase penyelesaian mata pelajaran.
- Nilai atau status kompetensi bila tersedia.

### 8.5 Halaman Unit Belajar

Susunan baku:

1. **Sebelum Belajar** — pengantar dan tujuan.
2. **Materi Utama** — video, audio, atau PDF.
3. **Latihan** — isian, unggahan, atau checklist.
4. **Worksheet** — pertanyaan terarah.
5. **Murojaah** — ringkasan dan pengulangan.
6. **Cek Pemahaman** — kuis ringan.
7. **Refleksi** — pemahaman, manfaat, dan penerapan.

Fitur:

- status selesai per aktivitas;
- tombol sebelumnya/berikutnya;
- simpan otomatis;
- estimasi waktu;
- lampiran materi;
- umpan balik pengajar;
- tandai untuk dimurojaah;
- progress unit.

### 8.6 Jadwal

- Tampilan agenda dan kalender.
- Filter berdasarkan mata pelajaran.
- Label online/tatap muka.
- Link pertemuan untuk kelas online.
- Lokasi untuk kelas tatap muka.
- Status hadir, izin, sakit, atau tidak hadir.

### 8.7 Evaluasi dan Hasil Belajar

Komponen default:

| Komponen | Bobot |
|---|---:|
| Kehadiran dan keterlibatan | 20% |
| Latihan dan worksheet | 30% |
| Kuis atau cek pemahaman | 20% |
| Evaluasi akhir | 30% |

Kategori hasil:

- **Sudah Dikuasai** — lanjutkan dan pertahankan melalui murojaah.
- **Perlu Murojaah** — ulangi bagian penting dan perbaiki latihan.
- **Belum Dikuasai** — ikuti penguatan dan pendampingan.

Laporan akhir berisi:

- ringkasan penyelesaian;
- capaian per mata pelajaran;
- kompetensi yang sudah dikuasai;
- materi yang perlu dimurojaah;
- umpan balik pengajar;
- rekomendasi tindak lanjut;
- status kelayakan sertifikat.

### 8.8 Jalur Mengejar Ketertinggalan

Sediakan mode **Kejar Ketertinggalan** berisi materi esensial:

- 1 video inti;
- 1 PDF ringkas;
- 1 latihan wajib;
- 1 cek pemahaman.

Mode ini harus terasa suportif, bukan menghukum.

### 8.9 Penutupan Caturwulan

Setelah evaluasi selesai:

- tampilkan pesan keberhasilan;
- tampilkan **“Caturwulan 1 — Selesai”**;
- berikan laporan perkembangan;
- tampilkan rekomendasi murojaah;
- sediakan unduhan syahadah jika memenuhi syarat;
- jelaskan jeda 1–2 pekan;
- tampilkan CTA **Lihat Caturwulan Berikutnya** tanpa pendaftaran otomatis.

### 8.10 Dashboard Pengajar/Admin

- ringkasan kelas;
- daftar peserta dan progres;
- peserta berisiko tertinggal;
- kehadiran;
- antrean tugas yang perlu diperiksa;
- input nilai dan umpan balik;
- CRUD program, caturwulan, mata pelajaran, unit, konten, jadwal, dan kuis;
- ekspor laporan CSV.

## 9. Seed Content

### 9.1 Aqidah 01

- **Bulan 1 — Mengenal Tujuan Kehidupan**  
  Mengapa mempelajari agama, tujuan penciptaan manusia, mengenal Allah sebagai Rabb, makna ibadah, hubungan ilmu dan ibadah.  
  Majlis Ta’sil: *Untuk Apa Kita Diciptakan?*

- **Bulan 2 — Hanya kepada Allah Kita Beribadah**  
  Pengertian tauhid, rububiyah, uluhiyah, pengantar nama dan sifat Allah, serta ibadah hanya kepada Allah.  
  Majlis Ta’sil: *Hanya kepada Allah Kita Beribadah*.

- **Bulan 3 — Ilmu, Iman, dan Amal**  
  Pengantar iman, hubungan ilmu dan amal, ikhlas, mengikuti Rasulullah, dan istiqamah.  
  Majlis Ta’sil: *Ilmu, Iman, dan Amal*.

### 9.2 Adab Menuntut Ilmu — 12 Pekan

1. Meluruskan niat dalam menuntut ilmu.
2. Keutamaan ilmu syar’i.
3. Ilmu sebelum ucapan dan amal.
4. Adab kepada Allah dalam menuntut ilmu.
5. Adab kepada guru.
6. Adab mendengar dan mencatat ilmu.
7. Adab bertanya.
8. Tidak tergesa-gesa dalam menuntut ilmu.
9. Murojaah dan menjaga ilmu.
10. Mengamalkan ilmu.
11. Menjaga istiqamah.
12. Muhasabah perjalanan menuntut ilmu.

### 9.3 Contoh Integrasi Tema

**Tema:** Untuk Siapa Kita Beribadah?

- Aqidah membahas makna ibadah.
- Bahasa Arab mengenalkan kosakata *Allah, Rabb, ‘abd, ‘ibadah,* dan *niyyah*.
- Adab membahas meluruskan niat.
- Worksheet menanyakan hubungan niat, ibadah, dan tauhid.

## 10. Model Data Minimum

```text
User
- id
- name
- email
- role: student | teacher | admin
- avatar_url
- notification_preferences

Program
- id
- name
- description
- status

Marhalah
- id
- program_id
- name
- order
- focus

Term (Caturwulan)
- id
- marhalah_id
- name
- theme
- start_date
- end_date
- duration_weeks
- status

Course
- id
- term_id
- name
- type: intensive | foundation | companion
- description
- teacher_id

Unit
- id
- course_id
- week_number
- title
- objectives
- estimated_minutes
- publish_at
- status

Activity
- id
- unit_id
- type: intro | video | audio | pdf | exercise | worksheet | review | quiz | reflection
- title
- content
- resource_url
- required
- order

Enrollment
- id
- user_id
- term_id
- status
- enrolled_at
- completed_at

ActivityProgress
- id
- enrollment_id
- activity_id
- status: not_started | in_progress | completed | needs_review
- started_at
- completed_at
- response

Assessment
- id
- course_id
- type
- title
- weight
- max_score

Submission
- id
- assessment_id
- user_id
- content
- attachment_url
- score
- feedback
- status

Session
- id
- course_id
- title
- mode: online | onsite
- starts_at
- ends_at
- meeting_url
- location

Attendance
- id
- session_id
- user_id
- status: present | excused | sick | absent

CompetencyResult
- id
- user_id
- course_id
- competency
- category: mastered | needs_review | not_mastered
- note

Certificate
- id
- enrollment_id
- certificate_number
- issued_at
- file_url
```

## 11. Aturan Bisnis

- Progress unit dihitung dari aktivitas wajib yang selesai.
- Progress caturwulan dihitung dari penyelesaian unit dan asesmen wajib, bukan seluruh roadmap TIA.
- Unit dapat dibuka berdasarkan tanggal atau prasyarat.
- Peserta tetap dapat mengakses materi lama untuk murojaah.
- Satu pekan sebelum evaluasi akhir ditetapkan sebagai pekan murojaah tanpa materi besar baru.
- Sertifikat hanya tersedia jika syarat minimum admin terpenuhi.
- Kelanjutan ke caturwulan berikutnya memerlukan keputusan peserta; jangan auto-enroll.
- Mode tertinggal menampilkan materi esensial tanpa menghapus akses ke materi lengkap.
- Perubahan nilai dan umpan balik menyimpan waktu serta editor terakhir.

## 12. Desain Antarmuka

### Arah visual

- Tenang, modern, hangat, akademik, dan tidak berlebihan.
- Dominan putih dengan permukaan abu sangat muda.
- Biru sebagai aksen utama; hijau untuk selesai/positif; oranye untuk perhatian; merah hanya untuk risiko atau error.
- Gunakan ruang kosong yang cukup, border lembut, radius 8–12 px, dan shadow minimal.
- Hindari ornamen visual religius yang ramai atau generik.

### Token warna awal

```css
--text-primary: #2C2C2B;
--text-secondary: #7D7A75;
--canvas: #FFFFFF;
--surface: #F9F8F7;
--border: #E6E5E3;
--blue: #2783DE;
--blue-soft: #E5F2FC;
--green: #46A171;
--green-soft: #E8F1EC;
--orange: #D5803B;
--orange-soft: #FBEBDE;
--red: #E56458;
--red-soft: #FCE9E7;
```

### Navigasi peserta

**Desktop sidebar:** Beranda, Caturwulan Saya, Jadwal, Hasil Belajar, Roadmap, Profil.  
**Mobile bottom navigation:** Beranda, Belajar, Jadwal, Hasil, Profil.

### Komponen penting

- kartu “Lanjutkan Belajar”;
- progress bar caturwulan;
- timeline pekan;
- kartu mata pelajaran;
- activity checklist;
- video/audio/PDF viewer;
- worksheet form;
- quiz renderer;
- badge status kompetensi;
- kalender agenda;
- feedback panel;
- empty, loading, error, offline, dan locked states.

### Aksesibilitas

- WCAG AA;
- target sentuh minimal 44 × 44 px;
- navigasi keyboard dan focus state yang jelas;
- label form eksplisit;
- warna bukan satu-satunya penanda status;
- transkrip/caption untuk video bila tersedia;
- layout responsif tanpa horizontal scroll.

## 13. Stack yang Disarankan

Gunakan stack berikut bila tidak ada preferensi lain:

- **Framework:** Next.js 15+ dengan App Router dan TypeScript.
- **UI:** Tailwind CSS + shadcn/ui.
- **Database/Auth/Storage:** Supabase.
- **Forms:** React Hook Form + Zod.
- **Video:** embed provider atau object storage; jangan membangun transcoding pada MVP.
- **PDF:** browser viewer.
- **Charts:** Recharts untuk ringkasan progres sederhana.
- **Email:** Resend atau provider setara.
- **Deployment:** Vercel.

## 14. Non-Goals MVP

- Aplikasi mobile native.
- Live streaming internal.
- Forum komunitas kompleks.
- Gamifikasi dengan poin dan leaderboard.
- Marketplace program.
- AI tutor otomatis.
- Payment gateway penuh.
- Multi-tenant untuk banyak lembaga.
- Sistem authoring SCORM/xAPI.

## 15. Prioritas Implementasi

### P0 — Wajib

- autentikasi dan role;
- dashboard peserta;
- struktur program → marhalah → caturwulan → course → unit → activity;
- pemutar/penampil materi;
- progress aktivitas dan unit;
- worksheet, kuis sederhana, dan refleksi;
- jadwal;
- dashboard admin dasar;
- laporan hasil belajar sederhana;
- responsive mobile/desktop.

### P1 — Setelah P0 stabil

- kehadiran;
- feedback pengajar;
- mode mengejar ketertinggalan;
- sertifikat PDF;
- notifikasi email;
- ekspor CSV;
- roadmap lengkap.

### P2 — Lanjutan

- analitik pembelajaran;
- automasi peserta berisiko;
- integrasi kalender;
- diskusi per unit;
- rekomendasi murojaah personal.

## 16. Acceptance Criteria MVP

MVP dianggap berhasil jika:

1. peserta dapat login dan langsung memahami fokus caturwulan aktif;
2. peserta dapat membuka unit, mengonsumsi materi, mengisi aktivitas, dan melanjutkan dari posisi terakhir;
3. dashboard menampilkan progres sebagai pekan/caturwulan, bukan progres program jangka panjang;
4. peserta dapat mengerjakan worksheet, kuis, dan refleksi dari perangkat mobile;
5. pengajar dapat melihat progres peserta dan memberi nilai/umpan balik;
6. admin dapat membuat serta menerbitkan struktur dan konten caturwulan tanpa mengubah kode;
7. laporan akhir menampilkan capaian dan kategori kompetensi;
8. semua halaman utama memiliki loading, empty, error, dan permission states;
9. UI berfungsi baik pada lebar sekitar 390 px dan desktop;
10. tidak ada horizontal scroll, elemen tumpang tindih, atau kontrol tanpa label.

## 17. Instruksi untuk Coding Agent

1. Bangun **vertical slice P0** terlebih dahulu: login → dashboard → course → unit → aktivitas → progres.
2. Gunakan seed data I’dad Cawu 1 dari brief ini.
3. Buat arsitektur yang mudah diperluas, tetapi hindari overengineering.
4. Gunakan server components secara default; client components hanya untuk interaksi.
5. Terapkan Row Level Security bila memakai Supabase.
6. Simpan status progress secara idempotent.
7. Sertakan database migrations, seed script, `.env.example`, dan README setup.
8. Buat reusable components dan typed data access layer.
9. Sertakan minimal unit test untuk perhitungan progres dan integration test untuk alur penyelesaian aktivitas.
10. Pastikan data contoh tidak memakai informasi pribadi nyata.

## 18. Deliverables Teknis

- source code;
- skema database dan migration;
- seed data;
- autentikasi dan role-based access;
- halaman peserta dan admin;
- responsive states;
- test dasar;
- README instalasi lokal;
- `.env.example`;
- daftar asumsi dan technical debt.

## 19. Copy Utama

**Hero:**

> Mulai dari fondasi. Belajar dengan tertib. Jaga istiqamah.

**Subheadline:**

> Program pembelajaran Islam bertahap bagi Muslim dewasa untuk membangun fondasi Bahasa Arab dan ilmu syar’i melalui sistem yang terarah, terintegrasi, dan fleksibel.

**CTA utama:** Mulai Pekan Ini  
**CTA dashboard:** Lanjutkan Belajar  
**Status selesai:** Alhamdulillah, satu tahap telah Anda selesaikan.  
**CTA kelanjutan:** Lihat Caturwulan Berikutnya

---

**Sumber brief:** halaman “Desain Program Tarbiyah Sunnah Islamic Academy (TIA)” di Notion.  
**Versi:** MVP brief v1.0  
**Tanggal:** 29 Agustus 2026
