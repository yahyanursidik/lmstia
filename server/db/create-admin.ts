/**
 * Membuat akun admin sungguhan (bukan demo).
 *
 * Jalankan:
 *   ADMIN_EMAIL=... ADMIN_NAME="..." ADMIN_PASSWORD='...' npm run db:admin
 *
 * Kata sandi dibaca dari environment, bukan dari argumen baris perintah,
 * supaya tidak ikut tersimpan di riwayat shell. Skrip ini tidak pernah
 * mencetak kata sandinya kembali.
 *
 * Ini prasyarat sebelum akun demo dihapus: tanpa satu pun super admin
 * non-demo, portal admin terkunci dan tidak ada jalan masuk kembali.
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./client";
import * as s from "./schema";
import { hashPassword } from "../services/auth";

/*
 * Kata sandi demo ditulis ulang di sini, TIDAK diimpor dari `seed-accounts`.
 * Modul itu memanggil `main()` di tingkat atas, sehingga sekadar mengimpornya
 * akan menyemai ulang seluruh akun demo — persis yang ingin dihindari skrip ini.
 */
const SANDI_DEMO = "TiaDemo#2026";

/** Berhenti tanpa mencetak jejak tumpukan — pesannya sudah dicetak sendiri. */
class Batal extends Error {}

const PANJANG_MINIMAL = 12;

const PERAN = ["super_admin", "academic_admin", "instructor", "student"] as const;
type Peran = (typeof PERAN)[number];

function baca() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const nama = process.env.ADMIN_NAME?.trim();
  const sandi = process.env.ADMIN_PASSWORD;
  const peran = (process.env.ADMIN_ROLE?.trim() ?? "super_admin") as Peran;

  const salah: string[] = [];
  if (!email) salah.push("ADMIN_EMAIL wajib diisi");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) salah.push("ADMIN_EMAIL bukan alamat email yang sah");
  if (!nama) salah.push("ADMIN_NAME wajib diisi");
  if (!sandi) salah.push("ADMIN_PASSWORD wajib diisi");
  else {
    if (sandi.length < PANJANG_MINIMAL) {
      salah.push(`ADMIN_PASSWORD minimal ${PANJANG_MINIMAL} karakter`);
    }
    /* Kata sandi demo beredar di dokumentasi dan riwayat percakapan. */
    if (sandi === SANDI_DEMO) salah.push("ADMIN_PASSWORD tidak boleh memakai kata sandi demo");
  }
  if (!PERAN.includes(peran)) salah.push(`ADMIN_ROLE harus salah satu dari: ${PERAN.join(", ")}`);

  if (salah.length) {
    console.error("\nAkun admin tidak dibuat:\n");
    for (const p of salah) console.error("  - " + p);
    console.error(
      [
        "",
        "Contoh:",
        "",
        "  ADMIN_EMAIL=admin@domain-anda.id \\",
        '  ADMIN_NAME="Nama Lengkap" \\',
        "  ADMIN_PASSWORD='kata sandi panjang yang hanya Anda tahu' \\",
        "  npm run db:admin",
        "",
      ].join("\n"),
    );
    process.exitCode = 1;
    throw new Batal();
  }

  return { email: email!, nama: nama!, sandi: sandi!, peran };
}

async function main() {
  const { email, nama, sandi, peran } = baca();
  const hash = await hashPassword(sandi);

  const ada = await db.query.users.findFirst({ where: eq(s.users.email, email) });

  if (ada) {
    await db
      .update(s.users)
      .set({
        name: nama,
        role: peran,
        passwordHash: hash,
        isDemo: false,
        accountStatus: "aktif",
        updatedAt: new Date(),
      })
      .where(eq(s.users.id, ada.id));
    console.log(`Akun diperbarui : ${email} (${peran})`);
  } else {
    await db.insert(s.users).values({
      email,
      name: nama,
      role: peran,
      passwordHash: hash,
      isDemo: false,
      accountStatus: "aktif",
    });
    console.log(`Akun dibuat     : ${email} (${peran})`);
  }

  const superAktif = await db.query.users.findMany({
    where: eq(s.users.role, "super_admin"),
  });
  const nonDemo = superAktif.filter((u) => !u.isDemo && u.accountStatus === "aktif");
  console.log(`Super admin non-demo yang aktif sekarang: ${nonDemo.length}`);
  if (nonDemo.length) {
    console.log("\nSilakan uji masuk dengan akun ini sebelum menghapus akun demo.");
  }
}

/*
 * Memakai `exitCode` dan bukan `process.exit()`: keluar paksa saat driver
 * HTTP Neon masih memegang handle memicu assertion libuv di Windows, dan
 * kode keluarnya jadi tidak dapat dipercaya oleh skrip pemanggil.
 */
main().catch((e) => {
  if (e instanceof Batal) return;
  console.error("Gagal:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
