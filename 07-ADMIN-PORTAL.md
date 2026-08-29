# Admin Portal Specification

## Dashboard

Fokus pada data yang dapat ditindaklanjuti:
- jumlah peserta;
- peserta aktif;
- perlu perhatian;
- tertinggal;
- kehadiran rendah;
- materi belum terbit;
- sesi terdekat.

## Resources

- Caturwulan
- Mata Pelajaran
- Modul
- Pekan
- Lesson
- Aktivitas
- Peserta
- Enrollment
- Pengajar
- Pertemuan
- Kehadiran
- Worksheet
- Quiz
- Pengumuman

## Curriculum Builder

```text
Caturwulan 1

Bahasa Arab 01
├── Bulan 1
│   ├── Pekan 1
│   ├── Pekan 2
│   ├── Pekan 3
│   └── Pekan 4
├── Bulan 2
└── Bulan 3
```

Admin dapat tambah, urutkan, publish/unpublish, tandai essential, dan atur prasyarat.

## Early Warning

Status:
- on_track
- needs_attention
- at_risk
- inactive

Contoh rule:
- 7 hari tanpa aktivitas → needs_attention
- 14 hari tanpa aktivitas → at_risk
- tertinggal ≥ 2 pekan → at_risk

## Refine

Gunakan Refine sebagai headless resource/data layer. UI tetap custom Tailwind.
