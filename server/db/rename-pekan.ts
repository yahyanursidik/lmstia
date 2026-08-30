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
  { tabel: "materials", kolom: ["title", "description"] },
  { tabel: "meetings", kolom: ["title", "description"] },
  { tabel: "announcements", kolom: ["title", "body"] },
  { tabel: "subjects", kolom: ["name", "description"] },
  { tabel: "tahapan", kolom: ["name", "title", "description"] },
];

const DARI = "Pekan Murojaah";
const KE = "Pertemuan Murojaah";
const DARI_KECIL = "pekan murojaah";
const KE_KECIL = "pertemuan murojaah";

async function main() {
  const terapkan = process.env.TERAPKAN === "ya";
  let total = 0;

  for (const { tabel, kolom } of ATURAN) {
    for (const k of kolom) {
      const cocok = await db.execute(
        sql`SELECT count(*)::int AS n FROM ${sql.identifier(tabel)}
            WHERE ${sql.identifier(k)} ILIKE ${"%" + DARI_KECIL + "%"}`,
      );
      const baris = (cocok as unknown as { rows?: { n: number }[] }).rows ?? (cocok as unknown as { n: number }[]);
      const n = Number(baris[0]?.n ?? 0);
      if (!n) continue;

      total += n;
      console.log(`  ${tabel}.${k}: ${n} baris`);

      if (terapkan) {
        await db.execute(
          sql`UPDATE ${sql.identifier(tabel)}
              SET ${sql.identifier(k)} = replace(replace(${sql.identifier(k)}, ${DARI}, ${KE}), ${DARI_KECIL}, ${KE_KECIL})
              WHERE ${sql.identifier(k)} ILIKE ${"%" + DARI_KECIL + "%"}`,
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
