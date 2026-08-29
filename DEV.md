# TIA — Menjalankan Proyek

## Sekali saja

```bash
npm install
```

Salin `.env.example` menjadi `.env`, isi `DATABASE_URL` Neon, lalu:

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run db:accounts
```

## Harian

Frontend:

```bash
npm run dev
```

API (terminal terpisah):

```bash
npm run api
```

Frontend di `http://localhost:5173`, API di `http://localhost:8787/api/v1`.

## Akun demo

Kata sandi sama untuk semua akun: **`TiaDemo#2026`**

| Email | Peran | Diarahkan ke |
|---|---|---|
| `peserta@tia.id` | Peserta | `/belajar/dashboard` |
| `pengajar@tia.id` | Pengajar | `/admin/dashboard` |
| `admin@tia.id` | Admin Akademik | `/admin/dashboard` |
| `super@tia.id` | Super Admin | `/admin/dashboard` |

Di halaman `/login` tersedia tombol **Isikan** untuk mengisi kredensial secara
otomatis. Login diverifikasi di server, jadi API harus berjalan.

`npm run db:accounts` bersifat idempoten — aman dijalankan ulang.


## Struktur konten

```text
Program
└── Tahapan / Tingkatan
    └── Mata Pelajaran
        └── Pertemuan          (mode: online | offline | hybrid | mandiri)
            ├── Materi         (bisa lebih dari 1)
            ├── link live teaching
            └── Kuis / Ujian
```

Tipe materi yang didukung: PDF, Audio, Video, YouTube, Google Drive, Bacaan,
Tautan. Semuanya punya pratinjau di halaman Kurikulum admin — YouTube dan
Google Drive memakai URL embed masing-masing, audio/video memakai pemutar
bawaan peramban.

Kelola lewat menu **Struktur konten** di portal admin. Pengajar hanya dapat membaca; hanya
admin akademik dan super admin yang boleh mengubah struktur.
Seluruh hierarki dikelola dari satu menu: **Akademik → Program Belajar**
(halaman Portofolio Kurikulum). Klik sebuah kartu untuk masuk ke tingkat
berikutnya; jejak navigasi di atas daftar untuk kembali. Pencarian, penyaring
status, dan pilihan tampilan kartu/daftar berlaku di setiap tingkat.


## Perintah lain

| Perintah | Fungsi |
|---|---|
| `npm run typecheck` | Typecheck frontend |
| `npm run build` | Build produksi |
| `npm run db:generate` | Buat migration dari perubahan schema |
| `npm run db:studio` | Drizzle Studio |

## Catatan keamanan

- `DATABASE_URL` **tidak** memakai awalan `VITE_`. Variabel `VITE_*` ikut
  ter-bundle ke browser, sedangkan kredensial Neon hanya boleh dibaca API.
- Kata sandi disimpan sebagai digest **scrypt** bergaram — tidak pernah plain text.
- Browser hanya menyimpan token sesi buram. Peran selalu dibaca ulang dari basis
  data di server, sehingga memalsukan `localStorage` tidak menambah hak akses.
- Endpoint login dibatasi 8 percobaan per 5 menit per email.
- Pesan gagal login sengaja sama untuk email tidak dikenal dan kata sandi salah,
  agar akun tidak dapat dienumerasi.

### Sebelum produksi

Akun demo ditandai `is_demo = true` di tabel `users`, dan
`npm run db:accounts` menolak berjalan ketika `NODE_ENV=production`.
Tetap hapus akun tersebut sebelum go-live:

```sql
DELETE FROM users WHERE is_demo = true;
```
