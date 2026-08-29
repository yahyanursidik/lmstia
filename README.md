# TIA — Tarbiyah Sunnah Islamic Academy

Landing page dan LMS untuk program pembelajaran Islam bertahap bagi Muslim dewasa.

> **Satu Caturwulan. Satu Fokus. Satu Tahap Tuntas.**

## Stack

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · React Router · Hono · Zod ·
Drizzle ORM · Neon PostgreSQL

## Struktur konten

```text
Program
└── Tahapan / Tingkatan
    └── Mata Pelajaran
        └── Pertemuan          (online | offline | hybrid | mandiri)
            ├── Materi         (PDF · Audio · Video · YouTube · Drive · Bacaan)
            ├── link live teaching
            └── Kuis / Ujian
```

Seluruh hierarki dikelola dari satu halaman: **Admin → Program Belajar**.

## Menjalankan

```bash
npm install
```

Salin `.env.example` menjadi `.env`, isi `DATABASE_URL` Neon, lalu:

```bash
npm run db:migrate && npm run db:seed && npm run db:accounts
```

Jalankan frontend dan API di dua terminal:

```bash
npm run dev
```

```bash
npm run api
```

Panduan lengkap, akun demo, dan catatan keamanan ada di [DEV.md](DEV.md).

## Dokumentasi

Spesifikasi produk ada di berkas bernomor `00-README.md` sampai
`15-ACCEPTANCE-CRITERIA.md`.

## Keamanan

`DATABASE_URL` tidak memakai awalan `VITE_` agar tidak ikut ter-bundle ke
browser. Kata sandi disimpan sebagai digest scrypt bergaram, dan otorisasi
selalu diverifikasi di server. Akun demo ditandai `is_demo` dan harus dihapus
sebelum produksi.
