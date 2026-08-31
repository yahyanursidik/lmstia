import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../db/client";
import * as s from "../db/schema";

/** Repository bank soal. */

export type FilterBank = {
  q?: string;
  type?: "multiple_choice" | "true_false" | "essay";
  difficulty?: "mudah" | "sedang" | "sulit";
  topic?: string;
};

function syarat(f: FilterBank) {
  const w = [];
  if (f.type) w.push(eq(s.questionBank.type, f.type));
  if (f.difficulty) w.push(eq(s.questionBank.difficulty, f.difficulty));
  if (f.topic) w.push(eq(s.questionBank.topic, f.topic));

  const q = f.q?.trim();
  if (q) {
    const pola = `%${q.replace(/[%_\\]/g, (m) => "\\" + m)}%`;
    w.push(
      or(
        ilike(s.questionBank.prompt, pola),
        ilike(s.questionBank.topic, pola),
        ilike(s.questionBank.tags, pola),
      )!,
    );
  }
  return w.length ? and(...w) : undefined;
}

export async function listPaged(f: FilterBank, page: number, perPage: number) {
  const where = syarat(f);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(s.questionBank)
      .where(where)
      .orderBy(desc(s.questionBank.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ total: sql<number>`count(*)::int` }).from(s.questionBank).where(where),
  ]);
  return { rows, total };
}

/** Daftar topik yang sudah dipakai, untuk penyaring dan saran. */
export const listTopics = () =>
  db
    .selectDistinct({ topic: s.questionBank.topic })
    .from(s.questionBank)
    .where(sql`${s.questionBank.topic} is not null and ${s.questionBank.topic} <> ''`)
    .orderBy(asc(s.questionBank.topic));

export const findQuestion = (id: string) =>
  db.query.questionBank.findFirst({ where: eq(s.questionBank.id, id) });

export const createQuestion = (v: typeof s.questionBank.$inferInsert) =>
  db.insert(s.questionBank).values(v).returning();

export const createMany = (rows: (typeof s.questionBank.$inferInsert)[]) =>
  db.insert(s.questionBank).values(rows).returning({ id: s.questionBank.id });

export const updateQuestion = (id: string, v: Partial<typeof s.questionBank.$inferInsert>) =>
  db
    .update(s.questionBank)
    .set({ ...v, updatedAt: new Date() })
    .where(eq(s.questionBank.id, id))
    .returning();

export const deleteQuestion = (id: string) =>
  db.delete(s.questionBank).where(eq(s.questionBank.id, id)).returning({ id: s.questionBank.id });

export const findMany = (ids: string[]) =>
  ids.length
    ? db.select().from(s.questionBank).where(inArray(s.questionBank.id, ids))
    : Promise.resolve([]);

/**
 * Menyalin soal bank ke sebuah asesmen.
 *
 * Isinya benar-benar disalin, bukan dirujuk. Bila soal asesmen ikut berubah
 * setiap kali soal banknya disunting, ujian yang sudah lewat dan percobaan
 * yang sudah dinilai ikut berubah diam-diam — dan nilai yang sudah keluar
 * menjadi tidak dapat dipertanggungjawabkan. `bankQuestionId` hanya jejak
 * asal-usul.
 */
export async function salinKeAsesmen(assessmentId: string, ids: string[]) {
  const soal = await findMany(ids);
  if (soal.length === 0) return [];

  const [{ terakhir }] = await db
    .select({ terakhir: sql<number>`coalesce(max(${s.assessmentQuestions.sequence}), 0)::int` })
    .from(s.assessmentQuestions)
    .where(eq(s.assessmentQuestions.assessmentId, assessmentId));

  /* Urutan mengikuti urutan id yang dikirim, bukan urutan baris dari basis data. */
  const urut = ids.map((id) => soal.find((q) => q.id === id)).filter(Boolean) as typeof soal;

  return db
    .insert(s.assessmentQuestions)
    .values(
      urut.map((q, i) => ({
        assessmentId,
        type: q.type,
        prompt: q.prompt,
        options: q.options,
        answerKey: q.answerKey,
        explanation: q.explanation,
        points: q.points,
        sequence: terakhir + i + 1,
        bankQuestionId: q.id,
      })),
    )
    .returning({ id: s.assessmentQuestions.id });
}
