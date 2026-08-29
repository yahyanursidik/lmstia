# Student LMS Specification

## Dashboard

```text
Caturwulan 1
Pekan 4 dari 12
33% selesai

Lanjutkan Belajar
Bahasa Arab 01
Latihan Pekan 4

Pekan Ini
✓ Materi Bahasa Arab
● Latihan Bahasa Arab
○ Tatap Muka
✓ Aqidah
○ Adab Menuntut Ilmu
```

## Next Learning Action

Endpoint:

```text
GET /api/v1/me/next-learning-action
```

Prioritas:
1. lesson belum selesai;
2. latihan aktif;
3. sesi yang segera berlangsung;
4. murojaah;
5. catch-up.

## Bahasa Arab

- Kelas Materi
- Kelas Latihan
- Tatap Muka

## Aqidah

- Materi mingguan
- Materi penguatan
- Majlis Ta’sil bulanan

## Adab

- 12 materi
- progress sederhana
- refleksi

## Lesson Types

```ts
type LessonType =
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
```

## Murojaah

Peserta dapat memilih **Simpan untuk Murojaah**.

## Catch-Up

Gunakan materi berlabel `is_essential = true` untuk jalur ringkas ketika peserta tertinggal.

## Notes

Catatan peserta private secara default.
