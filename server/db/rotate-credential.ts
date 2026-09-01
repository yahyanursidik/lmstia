/**
 * Mengganti DATABASE_URL di `.env` dengan kredensial baru.
 *
 * Jalankan:
 *   DATABASE_URL_BARU='postgresql://...' npm run db:rotate
 *
 * Nilai barunya dibaca dari environment, bukan argumen baris perintah, supaya
 * tidak tersimpan di riwayat shell. Skrip ini tidak pernah mencetak kata
 * sandinya kembali — hanya host dan empat karakter terakhir, secukupnya untuk
 * memastikan yang terpasang memang yang dimaksud.
 *
 * Berkas lama disalin ke `.env.bak` sebelum ditimpa, sehingga selalu ada jalan
 * kembali bila kredensial barunya ternyata keliru.
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const BERKAS = path.resolve(process.cwd(), ".env");

const samar = (url: string) => {
  try {
    const u = new URL(url);
    return `${u.username}@${u.hostname} (sandi ***${(u.password || "").slice(-4)})`;
  } catch {
    return "(tidak dapat dibaca)";
  }
};

async function main() {
  const baru = process.env.DATABASE_URL_BARU?.trim();

  if (!baru) {
    console.error(
      [
        "",
        "DATABASE_URL_BARU belum diisi.",
        "",
        "Rotasi kata sandi dilakukan di Neon Console terlebih dahulu:",
        "  Neon Console → project → Roles → neondb_owner → Reset password",
        "",
        "Lalu salin connection string barunya dan jalankan:",
        "",
        "  DATABASE_URL_BARU='postgresql://...' npm run db:rotate",
        "",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  let url: URL;
  try {
    url = new URL(baru);
  } catch {
    console.error("DATABASE_URL_BARU bukan URL yang sah.");
    process.exitCode = 1;
    return;
  }
  if (!url.protocol.startsWith("postgres")) {
    console.error("DATABASE_URL_BARU harus berupa connection string PostgreSQL.");
    process.exitCode = 1;
    return;
  }

  const lama = process.env.DATABASE_URL ?? "";
  if (baru === lama) {
    console.error("Kredensial barunya sama persis dengan yang sekarang — tidak ada yang dirotasi.");
    process.exitCode = 1;
    return;
  }

  /*
   * Diuji SEBELUM `.env` ditimpa. Menulis kredensial yang ternyata tidak bisa
   * menyambung berarti menukar satu masalah dengan masalah lain.
   */
  process.stdout.write("Menguji koneksi dengan kredensial baru… ");
  try {
    const sql = neon(baru);
    const [r] = await sql`SELECT current_user AS peran, current_database() AS basis`;
    console.log(`berhasil (${r.peran}@${r.basis})`);
  } catch (e) {
    console.log("GAGAL");
    console.error("\nKredensial baru tidak dapat menyambung:", e instanceof Error ? e.message : e);
    console.error("`.env` TIDAK diubah.");
    process.exitCode = 1;
    return;
  }

  if (!fs.existsSync(BERKAS)) {
    console.error(`Berkas ${BERKAS} tidak ditemukan.`);
    process.exitCode = 1;
    return;
  }

  const isi = fs.readFileSync(BERKAS, "utf8");
  fs.writeFileSync(BERKAS + ".bak", isi);

  const baris = isi.split(/\r?\n/);
  let ketemu = false;
  const hasil = baris.map((b) => {
    if (/^\s*DATABASE_URL\s*=/.test(b)) {
      ketemu = true;
      return `DATABASE_URL="${baru}"`;
    }
    return b;
  });
  if (!ketemu) hasil.push(`DATABASE_URL="${baru}"`);

  fs.writeFileSync(BERKAS, hasil.join("\n"));

  console.log("\nSebelum :", samar(lama));
  console.log("Sesudah :", samar(baru));
  console.log("\nCadangan berkas lama: .env.bak");
  console.log(
    [
      "",
      "Belum selesai — produksi masih memakai kredensial lama:",
      "",
      "  1. Netlify → Site settings → Environment variables → DATABASE_URL",
      "     ganti dengan nilai yang sama, lalu deploy ulang.",
      "  2. Hapus .env.bak setelah yakin semuanya berjalan.",
      "",
      "Situs produksi akan gagal menyambung sampai langkah 1 selesai.",
      "",
    ].join("\n"),
  );
}

main().catch((e) => {
  console.error("Gagal:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
