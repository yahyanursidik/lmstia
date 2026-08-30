import { sql } from "drizzle-orm";
import { db } from "../db/client";

/**
 * Pembatas laju yang hitungannya disimpan di basis data.
 *
 * Versi lama memakai `Map` di memori proses. Di Netlify Function tiap
 * permintaan bisa mendarat pada instance berbeda, sehingga hitungannya
 * selalu kosong dan pembatasnya praktis tidak ada. Basis data adalah satu-
 * satunya keadaan yang benar-benar dibagi oleh seluruh instance di sini.
 */

const JENDELA_MENIT = 5;

/** Batas per jendela: satu alamat IP, dan satu akun dari alamat itu. */
const BATAS_IP = 30;
const BATAS_AKUN = 8;

export type HasilBatas = { ditolak: boolean; sisaDetik: number };

/**
 * Menaikkan kedua penghitung dalam SATU pernyataan.
 *
 * Digabung bukan sekadar demi kerapian: driver Neon berbasis HTTP, jadi tiap
 * pernyataan adalah satu perjalanan jaringan, dan jalur masuk tidak pantas
 * membayar dua. `ON CONFLICT ... DO UPDATE` membuat kenaikannya atomik,
 * sehingga dua permintaan yang tiba bersamaan tidak saling menimpa.
 */
export async function catatPercobaanMasuk(ip: string, email: string): Promise<HasilBatas> {
  const kunciIp = `ip:${ip}`;
  const kunciAkun = `akun:${ip}:${email.toLowerCase()}`;

  const hasil = await db.execute(sql`
    INSERT INTO login_attempts (key, n, reset_at)
    VALUES
      (${kunciIp},   1, now() + interval '${sql.raw(String(JENDELA_MENIT))} minutes'),
      (${kunciAkun}, 1, now() + interval '${sql.raw(String(JENDELA_MENIT))} minutes')
    ON CONFLICT (key) DO UPDATE SET
      n = CASE
            WHEN login_attempts.reset_at < now() THEN 1
            ELSE login_attempts.n + 1
          END,
      reset_at = CASE
            WHEN login_attempts.reset_at < now()
            THEN now() + interval '${sql.raw(String(JENDELA_MENIT))} minutes'
            ELSE login_attempts.reset_at
          END
    RETURNING key, n, extract(epoch from (reset_at - now()))::int AS sisa
  `);

  const baris = (hasil as unknown as { rows?: Baris[] }).rows ?? (hasil as unknown as Baris[]);

  let ditolak = false;
  let sisaDetik = JENDELA_MENIT * 60;
  for (const r of baris) {
    const batas = r.key === kunciIp ? BATAS_IP : BATAS_AKUN;
    if (Number(r.n) > batas) {
      ditolak = true;
      sisaDetik = Math.max(1, Number(r.sisa));
    }
  }
  return { ditolak, sisaDetik };
}

type Baris = { key: string; n: number | string; sisa: number | string };

/** Dipanggil setelah masuk berhasil, agar percobaan yang sah tidak menumpuk. */
export async function bersihkanPercobaan(ip: string, email: string) {
  await db.execute(sql`
    DELETE FROM login_attempts WHERE key = ${`akun:${ip}:${email.toLowerCase()}`}
  `);
}

/**
 * Membuang baris kedaluwarsa sesekali.
 *
 * Dijalankan secara acak, bukan pada tiap permintaan: tabel ini kecil dan
 * baris lama tidak berbahaya, sedangkan menambah satu query ke setiap upaya
 * masuk berbiaya nyata pada driver HTTP.
 */
export async function sapuBerkala() {
  if (Math.random() > 0.02) return;
  await db.execute(sql`DELETE FROM login_attempts WHERE reset_at < now() - interval '1 hour'`);
}

/**
 * Alamat pemanggil di belakang proxy Netlify.
 *
 * `x-forwarded-for` dapat berisi rantai; yang pertama adalah klien asli.
 * Nilainya dikirim klien dan bisa dipalsukan, jadi pembatas per-akun tetap
 * dipertahankan sebagai lapis kedua.
 */
export function alamatPemanggil(header: (n: string) => string | undefined): string {
  const rantai = header("x-forwarded-for");
  if (rantai) return rantai.split(",")[0]!.trim();
  return header("x-nf-client-connection-ip") ?? header("cf-connecting-ip") ?? "lokal";
}
