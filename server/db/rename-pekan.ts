/**
 * Menyelesaikan penggantian istilah "Pekan" → "Pertemuan" pada teks yang
 * tersimpan DI BASIS DATA.
 *
 * Penggantian di kode tidak menyentuh judul materi, pertemuan, dan pengumuman
 * yang sudah tercatat sebagai data. Skrip ini melengkapinya.
 *
 * Jalankan:
 *   npm run db:rename-pekan              # pratinjau saja, tidak mengubah apa pun
 *   TERAPKAN=ya npm run db:rename-pekan  # benar-benar menyimpan
 *
 * Pratinjau adalah bawaan karena ini menyentuh konten yang Anda tulis sendiri;
 * lebih baik melihat daftarnya dulu daripada menemukan hasilnya setelah fakta.
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "./client";

/**
 * Hanya "Pekan Murojaah" yang diganti — itu nama sebuah unit kurikulum.
 * Kata "pekan" sebagai satuan waktu ("jeda 1–2 pekan", "jam / pekan") sengaja
 * dibiarkan, karena mengubahnya justru membuat kalimatnya salah.
 */
const ATURAN: { tabel: string; kolom: string[] }[] = [
  { tabel: "materials", kolom: ["title", "description", "content"] },
  { tabel: "meetings", kolom: ["title", "description"] },
  { tabel: "announcements", kolom: ["title", "body"] },
  { tabel: "subjects", kolom: ["name", "description"] },
  { tabel: "tahapan", kolom: ["name", "title", "description"] },
  { tabel: "assessment_questions", kolom: ["prompt", "explanation"] },
];

/*
 * Kolom yang sengaja TIDAK didaftarkan karena isinya satuan waktu:
 * `subjects.weekly_load` ("2–3 jam / pekan") dan
 * `subjects.delivery_model` ("1 tatap muka pekanan").
 *
 * Kolom yang didaftarkan pun aman: aturannya hanya mencocokkan frasa
 * "pekan murojaah", sehingga kalimat seperti "bagian tetap setiap pekan"
 * pada penjelasan soal tidak ikut tersentuh.
 */

/**
 * Pencocokan memakai regex, bukan `replace()`.
 *
 * `replace()` di Postgres peka huruf besar-kecil, sedangkan pencariannya
 * `ILIKE`. Akibatnya varian seperti "Pekan murojaah" ikut terhitung tetapi
 * tidak pernah tergantikan — skrip melaporkan baris diperbarui padahal
 * tidak ada yang berubah.
 *
 * Pola ini menangkap huruf pertama (`P` atau `p`) dan mengembalikannya apa
 * adanya, sehingga kapitalisasi kalimat aslinya terjaga:
 *   "Pekan Murojaah" → "Pertemuan Murojaah"
 *   "pekan murojaah" → "pertemuan murojaah"
 */
const POLA = "([Pp])ekan(\\s+[Mm]urojaah)";
const PENGGANTI = "\\1ertemuan\\2";
const CARI = "pekan murojaah";

async function main() {
  const terapkan = process.env.TERAPKAN === "ya";
  let total = 0;

  for (const { tabel, kolom } of ATURAN) {
    for (const k of kolom) {
      const cocok = await db.execute(
        sql`SELECT count(*)::int AS n FROM ${sql.identifier(tabel)}
            WHERE ${sql.identifier(k)} ILIKE ${"%" + CARI + "%"}`,
      );
      const baris = (cocok as unknown as { rows?: { n: number }[] }).rows ?? (cocok as unknown as { n: number }[]);
      const n = Number(baris[0]?.n ?? 0);
      if (!n) continue;

      total += n;
      console.log(`  ${tabel}.${k}: ${n} baris`);

      if (terapkan) {
        await db.execute(
          sql`UPDATE ${sql.identifier(tabel)}
              SET ${sql.identifier(k)} = regexp_replace(${sql.identifier(k)}, ${POLA}, ${PENGGANTI}, 'g')
              WHERE ${sql.identifier(k)} ILIKE ${"%" + CARI + "%"}`,
        );
      }
    }
  }

  if (!total) {
    console.log('Tidak ada teks "Pekan Murojaah" tersisa di basis data.');
    return;
  }

  console.log(
    terapkan
      ? `\n${total} baris diperbarui.`
      : `\n${total} baris akan diubah. Ini baru pratinjau — jalankan dengan TERAPKAN=ya untuk menyimpan.`,
  );
}

main().catch((e) => {
  console.error("Gagal:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
