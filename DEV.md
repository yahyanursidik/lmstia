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



## Kuis / Ujian

Menempel pada **tepat satu** dari empat tingkat hierarki:

| Tingkat | Contoh |
|---|---|
| Program | Uji penempatan, lintas seluruh tahapan |
| Tahapan | Evaluasi akhir caturwulan, lintas mata pelajaran |
| Mata Pelajaran | Ujian akhir satu mata pelajaran |
| Pertemuan | Kuis pekanan |
Tiga tipe soal: pilihan ganda, benar-salah, dan esai. Setiap kuis punya **KKM**
sendiri (0–100).

| Tipe | Penilaian |
|---|---|
| Pilihan ganda | Otomatis oleh server |
| Benar–salah | Otomatis oleh server |
| Esai | Manual oleh pengajar |

Selama masih ada esai yang belum dinilai, percobaan berstatus
`menunggu_penilaian` dan peserta hanya melihat **nilai sementara** dari bagian
objektif. Nilai akhir dan status KKM baru ditetapkan setelah seluruh esai
diberi poin.

- Peserta: **Nilai** → pilih kuis → kerjakan → hasil
- Pengajar: **Penilaian Esai** → antrean → beri poin dan umpan balik
- Admin: **Kuis & Ujian** → buat, atur KKM, kelola soal, lihat rekap hasil

  Formulir selalu dimulai dari **Program**, lalu Tahapan → Mata Pelajaran →
  Pertemuan. Tiap tingkat memuat dari induk yang dipilih, sehingga daftar
  tidak pernah bercampur antarprogram. Semua pemilih mendukung ketik-untuk-
  mencari dan navigasi papan ketik.
- Admin (alternatif): **Program Belajar** → pertemuan → *Kelola soal*

Kunci jawaban tidak pernah dikirim ke peserta sebelum percobaan selesai
dinilai, dan hanya bila kuis mengaktifkan umpan balik (showFeedback).


## Deploy ke Netlify

Frontend dan API berada di satu domain: berkas statis disajikan dari
`dist`, sedangkan API Hono berjalan sebagai Netlify Function pada
`/api/*` (lihat `netlify/functions/api.ts`). Karena satu domain, klien
memanggil jalur relatif `/api/v1` dan tidak ada CORS lintas asal.

**Wajib:** set variabel berikut di Netlify → Site settings → Environment
variables, lalu deploy ulang.

| Variabel | Nilai |
|---|---|
| `DATABASE_URL` | connection string Neon |

Jangan set `VITE_API_URL` kecuali API dipasang di domain terpisah.
Nilai mutlak seperti `http://localhost:8787` akan membuat produksi gagal,
karena di browser pengunjung itu menunjuk komputer mereka sendiri.

Migrasi dan seed dijalankan dari mesin lokal terhadap basis data yang sama
(`npm run db:migrate`, `npm run db:seed`, `npm run db:accounts`) — tidak
dijalankan otomatis saat deploy.


### Peringatan: `db:seed` bersifat menghapus

`npm run db:seed` mengosongkan SELURUH tabel lalu mengisi ulang dengan data
contoh. Pada basis data yang sudah dipakai, ini menghancurkan konten yang
dimasukkan lewat portal admin.

Seed kini menolak berjalan bila basis data sudah berisi data, dan menolak
sepenuhnya saat `NODE_ENV=production`. Untuk sengaja mengosongkan:

```bash
SEED_HAPUS_SEMUA=ya-saya-yakin npm run db:seed
```

Basis data lokal dan produksi memakai Neon yang sama, jadi perintah yang
dijalankan dari mesin lokal langsung berdampak ke produksi.


### Menyiapkan akun admin sungguhan

Akun demo (`npm run db:accounts`) hanya untuk menjelajah portal dan harus
hilang sebelum go-live. Sebelum menghapusnya, buat dulu admin sungguhan —
tanpa itu portal admin terkunci permanen, karena tidak ada pendaftaran admin
maupun reset kata sandi.

```bash
# PowerShell
$env:ADMIN_EMAIL="admin@domain-anda.id"; $env:ADMIN_NAME="Nama Lengkap"; npm run db:admin

# bash
ADMIN_EMAIL=admin@domain-anda.id ADMIN_NAME="Nama Lengkap" npm run db:admin
```

Kata sandi dibaca dari environment, bukan argumen, supaya tidak tersimpan di
riwayat shell. Setelah menguji masuk dengan akun itu:

```bash
HAPUS_AKUN_DEMO=ya-saya-yakin npm run db:purge-demo
```

`db:purge-demo` menolak berjalan selama belum ada super admin non-demo yang
aktif, dan menyebutkan data apa saja yang ikut terhapus lewat cascade.


### Bank Soal

Soal di bank sengaja tidak terikat program, tahapan, atau mata pelajaran —
itu justru alasan bank soal ada. Pengelompokannya memakai topik dan tag.

Saat dipakai pada kuis atau ujian, isi soal **disalin**, bukan dirujuk.
Menyunting soal di bank tidak mengubah asesmen yang sudah memakainya,
sehingga ujian yang sudah lewat dan nilai yang sudah keluar tetap utuh.
Kolom `assessment_questions.bank_question_id` hanya jejak asal-usul.

Impor memakai CSV. Template dapat diunduh dari halaman Bank Soal, dan
seluruh baris divalidasi di browser lebih dulu: baris bermasalah ditandai
beserta alasannya dan tidak ikut terkirim. Di server, satu baris tidak sah
membatalkan seluruh impor — impor separuh jalan meninggalkan bank dalam
keadaan yang sulit ditelusuri.

Kunci pilihan ganda ditulis manusia sebagai nomor pilihan (1–5) dan
disimpan sebagai indeks 0-basis.


### Laporan progres peserta

`/admin/laporan` menampilkan progres setiap peserta pada satu program:
penyelesaian materi, kehadiran, dan hasil asesmen, dengan rincian per mata
pelajaran dan daftar percobaan kuis.

Setiap metrik dihitung satu query untuk SELURUH peserta sekaligus, bukan
satu query per peserta. Pada driver Neon berbasis HTTP, menghitung per
peserta membuat jumlah perjalanan jaringan tumbuh seiring jumlah peserta.

Dua keputusan yang memengaruhi angkanya:

- Materi berstatus draf tidak masuk penyebut. Peserta tidak pernah
  ditawari materi itu, jadi menghitungnya membuat progres terlihat lebih
  buruk daripada kenyataan.
- Rata-rata nilai hanya menghitung percobaan yang sudah dinilai. Percobaan
  yang masih menunggu penilaian esai bernilai null dan tidak dianggap nol.

Halaman ini juga mengunduh CSV berisi seluruh baris, dengan BOM UTF-8 agar
Excel membacanya dengan benar.


### Merotasi kredensial basis data

Rotasi dilakukan di Neon Console lebih dulu:
**Roles → neondb_owner → Reset password**. Salin connection string barunya,
lalu:

```bash
DATABASE_URL_BARU='postgresql://...' npm run db:rotate
```

Nilainya dibaca dari environment, bukan argumen, supaya tidak masuk riwayat
shell. Skrip menguji koneksi **sebelum** menimpa `.env`, menyimpan cadangan
ke `.env.bak`, dan tidak pernah mencetak kata sandinya kembali.

Setelah itu perbarui `DATABASE_URL` di **Netlify → Environment variables**
lalu deploy ulang. Sampai langkah itu selesai, situs produksi gagal
menyambung — kredensial lama sudah tidak berlaku begitu direset di Neon.

### Batasan yang perlu diketahui

Rate limit login disimpan di tabel `login_attempts`, bukan di memori proses,
sehingga hitungannya dibagi seluruh instance serverless. Ada dua penghitung:
per alamat IP (30 percobaan / 5 menit) dan per akun dari alamat itu (8).

Formulir pendaftaran publik memakai pembatas yang sama: 12 kiriman per jam
per alamat IP, dan 5 per formulir. Jendelanya lebih panjang daripada halaman
masuk karena mendaftar adalah tindakan yang jarang.

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
