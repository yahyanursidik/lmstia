/**
 * Password hashing and server-side sessions.
 *
 * scrypt from Node's stdlib — deliberately no extra dependency, and
 * deliberately not a bare SHA: scrypt is memory-hard, so stolen hashes stay
 * expensive to crack. Passwords are never stored or logged in plain text.
 *
 * This is the interim implementation for Fase 04. Swapping in Better Auth
 * means replacing this file plus `identify` in middleware/auth.ts; everything
 * downstream already reads `c.get("user")`.
 */

import { randomBytes, randomUUID, scrypt as _scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "../db/client";
import * as s from "../db/schema";

const scrypt = promisify(_scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEYLEN = 64;
const SESSION_DAYS = 7;

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(plain, salt, KEYLEN);
  return `${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(plain: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await scrypt(plain, salt, KEYLEN);
  // Constant-time compare so response timing does not leak the hash.
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "student" | "instructor" | "academic_admin" | "super_admin";
};

/**
 * Verifies credentials. Returns null for both "no such user" and "wrong
 * password" so the response cannot be used to enumerate accounts.
 */
export async function authenticate(email: string, password: string): Promise<SessionUser | null> {
  const user = await db.query.users.findFirst({
    where: eq(s.users.email, email.trim().toLowerCase()),
  });
  if (!user) {
    // Spend comparable time on a miss to blunt timing-based enumeration.
    await scrypt(password, "decoy-salt", KEYLEN);
    return null;
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;

  await db.update(s.users).set({ lastLoginAt: new Date() }).where(eq(s.users.id, user.id));
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = `${randomUUID()}.${randomBytes(32).toString("hex")}`;
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(s.authSessions).values({ userId, token, expiresAt });
  return { token, expiresAt };
}

/** Resolves a bearer token to a user, loading the role fresh from the row. */
export async function resolveSession(token: string): Promise<SessionUser | null> {
  const row = await db.query.authSessions.findFirst({
    where: and(eq(s.authSessions.token, token), gt(s.authSessions.expiresAt, new Date())),
  });
  if (!row) return null;

  const user = await db.query.users.findFirst({ where: eq(s.users.id, row.userId) });
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function destroySession(token: string) {
  await db.delete(s.authSessions).where(eq(s.authSessions.token, token));
}

/** Housekeeping: drop expired rows so the table does not grow forever. */
export async function purgeExpiredSessions() {
  await db.delete(s.authSessions).where(lt(s.authSessions.expiresAt, new Date()));
}
