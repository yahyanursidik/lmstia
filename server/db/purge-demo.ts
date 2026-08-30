/**
 * Menghapus seluruh akun demo sebelum go-live.
 *
 * Jalankan:
 *   npm run db:purge-demo
 *
 * `DELETE FROM users WHERE is_demo = true` yang polos berbahaya: bila satu-
 * satunya super admin adalah akun demo, portal admin langsung terkunci dan
 * tidak ada jalan masuk kembali — tidak ada pendaftaran admin maupun reset
 * kata sandi. Skrip ini menolak berjalan dalam keadaan itu, dan menyebutkan
 * apa saja yang akan ikut terhapus lewat ON DELETE CASCADE.
 */

import "dotenv/config";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "./client";
import * as s from "./schema";

async function main() {
  const demo = await db.query.users.findMany({ where: eq(s.users.isDemo, true) });

  if (demo.length === 0) {
    console.log("Tidak ada akun demo. Tidak ada yang perlu dihapus.");
    return;
  }

  const penjaga = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.users)
    .where(
      and(
        eq(s.users.role, "super_admin"),
        eq(s.users.isDemo, false),
        eq(s.users.accountStatus, "aktif"),
      ),
    );
  const superNonDemo = penjaga[0]!.n;

  console.log(`Akun demo yang akan dihapus: ${demo.length}`);
  for (const u of demo) console.log(`  ${u.role.padEnd(15)} ${u.email}`);

  const ids = demo.map((u) => u.id);
  const cacah = async (tabel: typeof s.enrollments | typeof s.materialProgress | typeof s.assessmentAttempts | typeof s.notes) => {
    const [r] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(tabel)
      .where(inArray(tabel.userId, ids));
    return r!.n;
  };

  const ikut = {
    pendaftaran: await cacah(s.enrollments),
    progres: await cacah(s.materialProgress),
    percobaan: await cacah(s.assessmentAttempts),
    catatan: await cacah(s.notes),
  };

  console.log(
    `\nIkut terhapus (cascade): pendaftaran ${ikut.pendaftaran}, progres ${ikut.progres}, ` +
      `percobaan kuis ${ikut.percobaan}, catatan ${ikut.catatan}`,
  );

  if (superNonDemo === 0) {
    console.error(
      [
        "",
        "DIBATALKAN — tidak ada super admin non-demo yang aktif.",
        "",
        "Menghapus akun demo sekarang akan mengunci portal admin secara permanen:",
        "tidak ada pendaftaran admin dan tidak ada reset kata sandi.",
        "",
        "Buat dulu akun admin sungguhan:",
        "",
        "  ADMIN_EMAIL=admin@domain-anda.id \\",
        '  ADMIN_NAME="Nama Lengkap" \\',
        "  ADMIN_PASSWORD='kata sandi panjang yang hanya Anda tahu' \\",
        "  npm run db:admin",
        "",
        "Uji masuk dengan akun itu, baru jalankan perintah ini lagi.",
        "",
      ].join("\n"),
    );
    process.exitCode = 1;
    return;
  }

  if (process.env.HAPUS_AKUN_DEMO !== "ya-saya-yakin") {
    console.log(
      [
        "",
        `Ada ${superNonDemo} super admin non-demo yang aktif, jadi penghapusan aman dilakukan.`,
        "Penghapusan tetap perlu dinyatakan secara eksplisit:",
        "",
        "  HAPUS_AKUN_DEMO=ya-saya-yakin npm run db:purge-demo",
        "",
      ].join("\n"),
    );
    return;
  }

  const dihapus = await db
    .delete(s.users)
    .where(eq(s.users.isDemo, true))
    .returning({ email: s.users.email });

  console.log(`\n${dihapus.length} akun demo dihapus.`);
}

/*
 * Memakai `exitCode` dan bukan `process.exit()`: keluar paksa saat driver
 * HTTP Neon masih memegang handle memicu assertion libuv di Windows, dan
 * kode keluarnya jadi tidak dapat dipercaya oleh skrip pemanggil.
 */
main().catch((e) => {
  console.error("Gagal:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
