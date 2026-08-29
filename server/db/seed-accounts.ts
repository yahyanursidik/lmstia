/**
 * Demo accounts for the login portal.
 *
 * Run with: npm run db:accounts
 *
 * These exist so the portal can be explored without wiring a real identity
 * provider. They are flagged `is_demo = true` in the database, and this script
 * refuses to run when NODE_ENV=production — demo credentials must never reach
 * a live deployment. Rotate or purge them before go-live.
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./client";
import * as s from "./schema";
import { hashPassword } from "../services/auth";

/** Shared across all demo accounts so it is easy to remember while testing. */
export const DEMO_PASSWORD = "TiaDemo#2026";

type Seed = {
  email: string;
  name: string;
  role: "student" | "instructor" | "academic_admin" | "super_admin";
  segment?: string;
};

const ACCOUNTS: Seed[] = [
  { email: "admin@tia.id", name: "Tim Akademik", role: "academic_admin" },
  { email: "super@tia.id", name: "Super Admin", role: "super_admin" },
  { email: "pengajar@tia.id", name: "Ustadz Abu Hudzaifah", role: "instructor" },
  { email: "peserta@tia.id", name: "Abdurrahman", role: "student", segment: "Profesional" },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Ditolak: akun demo tidak boleh dibuat di environment production.");
    process.exit(1);
  }

  const hash = await hashPassword(DEMO_PASSWORD);
  const term = await db.query.tahapan.findFirst({ where: eq(s.tahapan.status, "running") });

  for (const a of ACCOUNTS) {
    const existing = await db.query.users.findFirst({ where: eq(s.users.email, a.email) });

    let userId: string;
    if (existing) {
      await db
        .update(s.users)
        .set({ name: a.name, role: a.role, passwordHash: hash, isDemo: true, segment: a.segment ?? null })
        .where(eq(s.users.id, existing.id));
      userId = existing.id;
      console.log(`  diperbarui  ${a.email.padEnd(20)} ${a.role}`);
    } else {
      const [row] = await db
        .insert(s.users)
        .values({ email: a.email, name: a.name, role: a.role, passwordHash: hash, isDemo: true, segment: a.segment ?? null })
        .returning();
      userId = row.id;
      console.log(`  dibuat      ${a.email.padEnd(20)} ${a.role}`);
    }

    // The demo student needs an enrolment, otherwise the dashboard is empty.
    if (a.role === "student" && term) {
      const enrolled = await db.query.enrollments.findFirst({
        where: eq(s.enrollments.userId, userId),
      });
      if (!enrolled) {
        await db.insert(s.enrollments).values({
          userId,
          tahapanId: term.id,
          status: "active",
          engagement: "on_track",
          competency: "sudah_dikuasai",
          className: "I'dad A",
          progress: 66,
          approvedAt: new Date(),
          startedAt: new Date(),
        });
        console.log(`              → didaftarkan ke ${term.name}`);
      }
    }
  }

  console.log("");
  console.log("Akun demo siap. Kata sandi untuk semua akun:");
  console.log(`  ${DEMO_PASSWORD}`);
  console.log("");
  console.log("Ganti atau hapus akun ini sebelum produksi.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Gagal membuat akun demo:", e);
    process.exit(1);
  });
