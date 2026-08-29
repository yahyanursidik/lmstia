# Information Architecture

## Public Routes

```text
/
├── /program
├── /caturwulan
├── /caturwulan/:slug
├── /cara-belajar
├── /pengajar
├── /faq
├── /daftar
└── /login
```

## Student Routes

```text
/belajar
├── /dashboard
├── /caturwulan
├── /kelas/:courseSlug
├── /kelas/:courseSlug/pekan/:week
├── /pelajaran/:lessonSlug
├── /latihan/:activityId
├── /murojaah
├── /jadwal
├── /progress
├── /catatan
└── /profil
```

## Instructor Routes

```text
/pengajar
├── /dashboard
├── /kelas
├── /peserta
├── /kehadiran
├── /tugas
├── /evaluasi
└── /jadwal
```

## Admin Routes

```text
/admin
├── /dashboard
├── /peserta
├── /pendaftaran
├── /caturwulan
├── /mata-pelajaran
├── /kurikulum
├── /pekan
├── /materi
├── /pertemuan
├── /worksheet
├── /quiz
├── /kehadiran
├── /nilai
├── /pengajar
├── /pengumuman
└── /laporan
```

## Navigasi Peserta

Desktop:
- Belajar
- Caturwulan
- Jadwal
- Murojaah
- Progress
- Bantuan
- Profil

Mobile bottom navigation:
- Belajar
- Jadwal
- Murojaah
- Profil
