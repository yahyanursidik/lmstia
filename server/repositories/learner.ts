import { and, asc, desc, eq, exists, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../db/client";
import * as s from "../db/schema";

export const findUserById = (id: string) => db.query.users.findFirst({ where: eq(s.users.id, id) });

export const findUserByEmail = (email: string) =>
  db.query.users.findFirst({ where: eq(s.users.email, email) });

export const listInstructors = () =>
  db.select().from(s.users).where(eq(s.users.role, "instructor"));

/**
 * Pengajar untuk halaman publik.
 *
 * Kolom dipilih eksplisit dan sengaja TIDAK memuat email, nomor WhatsApp,
 * domisili, atau apa pun yang bersifat pribadi — endpoint ini terbuka tanpa
 * autentikasi, jadi apa pun yang masuk ke sini terbaca siapa saja.
 */
export const listInstructorsPublic = () =>
  db
    .select({
      id: s.users.id,
      name: s.users.name,
      title: s.users.title,
      bio: s.users.bio,
      avatarUrl: s.users.avatarUrl,
    })
    .from(s.users)
    .where(
      and(
        eq(s.users.role, "instructor"),
        eq(s.users.accountStatus, "aktif"),
        /* Akun demo tidak pantas tampil sebagai pengajar di halaman publik. */
        eq(s.users.isDemo, false),
      ),
    )
    .orderBy(asc(s.users.name));

export const findEnrollment = (userId: string, tahapanId: string) =>
  db.query.enrollments.findFirst({
    where: and(eq(s.enrollments.userId, userId), eq(s.enrollments.tahapanId, tahapanId)),
  });

export const listEnrollments = (tahapanId: string) =>
  db
    .select({
      id: s.enrollments.id,
      userId: s.users.id,
      name: s.users.name,
      email: s.users.email,
      segment: s.users.segment,
      className: s.enrollments.className,
      status: s.enrollments.status,
      engagement: s.enrollments.engagement,
      competency: s.enrollments.competency,
      /*
       * Dihitung, bukan dibaca dari `enrollments.progress`. Kolom itu terisi
       * sekali saat penyemaian dan tidak pernah diperbarui oleh apa pun.
       */
      progress: sql<number>`(
        SELECT CASE WHEN count(*) = 0 THEN 0
               ELSE round(100.0 * count(*) filter (where ${s.materialProgress.status} = 'completed') / count(*))::int
               END
        FROM ${s.materials}
        JOIN ${s.meetings} ON ${s.meetings.id} = ${s.materials.meetingId}
        JOIN ${s.subjects} ON ${s.subjects.id} = ${s.meetings.subjectId}
        LEFT JOIN ${s.materialProgress}
          ON ${s.materialProgress.materialId} = ${s.materials.id}
         AND ${s.materialProgress.userId} = ${s.enrollments.userId}
        WHERE ${s.subjects.tahapanId} = ${s.enrollments.tahapanId}
          AND ${s.materials.publishStatus} = 'published'
      )`,
    })
    .from(s.enrollments)
    .innerJoin(s.users, eq(s.enrollments.userId, s.users.id))
    .where(eq(s.enrollments.tahapanId, tahapanId));

export const listProgressForMaterials = (userId: string, materialIds: string[]) =>
  materialIds.length
    ? db
        .select()
        .from(s.materialProgress)
        .where(
          and(eq(s.materialProgress.userId, userId), inArray(s.materialProgress.materialId, materialIds)),
        )
    : Promise.resolve([]);


/*
 * Progres seluruh mata pelajaran satu tahapan dalam SATU query.
 *
 * Versi sebelumnya menelusuri mata pelajaran → pertemuan → materi dengan
 * loop bersarang, sehingga satu tahapan berukuran normal menghasilkan
 * ratusan round-trip berurutan. Driver Neon berbasis HTTP: setiap query
 * adalah satu permintaan jaringan, jadi biayanya latensi × jumlah query —
 * cukup untuk melewati batas waktu fungsi serverless.
 *
 * `total` sengaja menghitung semua materi (bukan hanya yang published),
 * mempertahankan perilaku perhitungan sebelumnya.
 */
export const subjectProgressForTahapan = (userId: string, tahapanId: string) =>
  db
    .select({
      subjectId: s.subjects.id,
      total: sql<number>`count(*)::int`,
      done: sql<number>`(count(*) filter (where ${s.materialProgress.status} = 'completed'))::int`,
    })
    .from(s.materials)
    .innerJoin(s.meetings, eq(s.meetings.id, s.materials.meetingId))
    .innerJoin(s.subjects, eq(s.subjects.id, s.meetings.subjectId))
    .leftJoin(
      s.materialProgress,
      and(
        eq(s.materialProgress.materialId, s.materials.id),
        eq(s.materialProgress.userId, userId),
      ),
    )
    /*
     * Hanya materi terbit yang dihitung — definisi yang sama dipakai laporan
     * program di `report.ts`. Materi draf tidak pernah ditawarkan kepada
     * peserta, jadi memasukkannya ke penyebut membuat progres terlihat lebih
     * buruk daripada kenyataan; dan bila dua layar memakai definisi berbeda,
     * keduanya akan menampilkan angka yang saling bertentangan.
     */
    .where(and(eq(s.subjects.tahapanId, tahapanId), eq(s.materials.publishStatus, "published")))
    .groupBy(s.subjects.id);


/**
 * Seluruh materi satu tahapan, sudah diratakan bersama progres peserta,
 * dalam satu query. Urutan mengikuti nomor pertemuan lalu urutan materi.
 *
 * `status` bernilai null bila peserta belum pernah menyentuh materi; pemanggil
 * memetakannya ke "not_started".
 */
export const tahapanMaterialRows = (userId: string, tahapanId: string) =>
  db
    .select({
      subject: s.subjects,
      meeting: s.meetings,
      material: s.materials,
      status: s.materialProgress.status,
    })
    .from(s.materials)
    .innerJoin(s.meetings, eq(s.meetings.id, s.materials.meetingId))
    .innerJoin(s.subjects, eq(s.subjects.id, s.meetings.subjectId))
    .leftJoin(
      s.materialProgress,
      and(
        eq(s.materialProgress.materialId, s.materials.id),
        eq(s.materialProgress.userId, userId),
      ),
    )
    .where(eq(s.subjects.tahapanId, tahapanId))
    .orderBy(asc(s.meetings.number), asc(s.materials.sequence));

/** Upsert keyed on the (user, material) unique index. */
export async function setMaterialProgress(
  userId: string,
  materialId: string,
  status: "not_started" | "in_progress" | "completed" | "needs_review",
) {
  const now = new Date();
  const [row] = await db
    .insert(s.materialProgress)
    .values({
      userId,
      materialId,
      status,
      startedAt: status === "in_progress" ? now : null,
      completedAt: status === "completed" ? now : null,
    })
    .onConflictDoUpdate({
      target: [s.materialProgress.userId, s.materialProgress.materialId],
      set: { status, completedAt: status === "completed" ? now : null, updatedAt: now },
    })
    .returning();
  return row;
}

export const listBookmarks = (userId: string) =>
  db
    .select({
      materialId: s.materials.id,
      title: s.materials.title,
      type: s.materials.type,
      createdAt: s.bookmarks.createdAt,
    })
    .from(s.bookmarks)
    .innerJoin(s.materials, eq(s.bookmarks.materialId, s.materials.id))
    .where(eq(s.bookmarks.userId, userId));

export const addBookmark = (userId: string, materialId: string) =>
  db.insert(s.bookmarks).values({ userId, materialId }).onConflictDoNothing().returning();

export const removeBookmark = (userId: string, materialId: string) =>
  db
    .delete(s.bookmarks)
    .where(and(eq(s.bookmarks.userId, userId), eq(s.bookmarks.materialId, materialId)))
    .returning();

export const listNotes = (userId: string) =>
  db.select().from(s.notes).where(eq(s.notes.userId, userId));

export const createNote = (userId: string, materialId: string | null, body: string) =>
  db.insert(s.notes).values({ userId, materialId, body }).returning();

export async function engagementCounts(tahapanId: string) {
  return db
    .select({ engagement: s.enrollments.engagement, n: sql<number>`count(*)::int` })
    .from(s.enrollments)
    .where(eq(s.enrollments.tahapanId, tahapanId))
    .groupBy(s.enrollments.engagement);
}

export async function competencyCounts(tahapanId: string) {
  return db
    .select({ competency: s.enrollments.competency, n: sql<number>`count(*)::int` })
    .from(s.enrollments)
    .where(eq(s.enrollments.tahapanId, tahapanId))
    .groupBy(s.enrollments.competency);
}

export const writeAudit = (
  actorId: string | null,
  action: string,
  entity: string,
  entityId?: string,
) => db.insert(s.auditLogs).values({ actorId, action, entity, entityId });

/* --- Manajemen pengguna ------------------------------------------- */

/**
 * Kolom pengguna yang boleh keluar dari server.
 *
 * `passwordHash` sengaja tidak pernah masuk daftar ini. Memilih kolom secara
 * eksplisit — bukan `select()` lalu menghapus field — membuat kebocoran tidak
 * mungkin terjadi karena lupa, termasuk saat kolom baru ditambahkan nanti.
 */
const kolomPengguna = {
  id: s.users.id,
  name: s.users.name,
  email: s.users.email,
  role: s.users.role,
  phone: s.users.phone,
  country: s.users.country,
  province: s.users.province,
  city: s.users.city,
  education: s.users.education,
  accountStatus: s.users.accountStatus,
  segment: s.users.segment,
  title: s.users.title,
  bio: s.users.bio,
  avatarUrl: s.users.avatarUrl,
  isDemo: s.users.isDemo,
  lastLoginAt: s.users.lastLoginAt,
  createdAt: s.users.createdAt,
};

export type FilterPengguna = {
  q?: string;
  role?: "student" | "instructor" | "academic_admin" | "super_admin";
  accountStatus?: "aktif" | "nonaktif" | "ditangguhkan";
  programId?: string;
  tahapanId?: string;
};

/**
 * Menyusun syarat WHERE bersama untuk daftar dan penghitungan, supaya cacah
 * total selalu konsisten dengan halaman yang ditampilkan.
 */
function syaratPengguna(f: FilterPengguna) {
  const w = [];
  if (f.role) w.push(eq(s.users.role, f.role));
  if (f.accountStatus) w.push(eq(s.users.accountStatus, f.accountStatus));

  const q = f.q?.trim();
  if (q) {
    const pola = `%${q.replace(/[%_\\]/g, (m) => "\\" + m)}%`;
    w.push(
      or(
        ilike(s.users.name, pola),
        ilike(s.users.email, pola),
        ilike(s.users.phone, pola),
        ilike(s.users.city, pola),
      )!,
    );
  }

  /*
   * Penyaring program dan caturwulan bekerja lewat pendaftaran. Dipakai
   * subquery EXISTS, bukan JOIN, agar satu peserta tidak muncul berkali-kali
   * ketika ia terdaftar pada lebih dari satu tahapan.
   */
  if (f.tahapanId) {
    w.push(
      exists(
        db
          .select({ x: sql`1` })
          .from(s.enrollments)
          .where(
            and(eq(s.enrollments.userId, s.users.id), eq(s.enrollments.tahapanId, f.tahapanId)),
          ),
      ),
    );
  } else if (f.programId) {
    w.push(
      exists(
        db
          .select({ x: sql`1` })
          .from(s.enrollments)
          .innerJoin(s.tahapan, eq(s.tahapan.id, s.enrollments.tahapanId))
          .where(and(eq(s.enrollments.userId, s.users.id), eq(s.tahapan.programId, f.programId))),
      ),
    );
  }

  return w.length ? and(...w) : undefined;
}

/** Satu halaman pengguna beserta cacah total untuk paginasi. */
export async function listUsersPaged(f: FilterPengguna, page: number, perPage: number) {
  const where = syaratPengguna(f);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select(kolomPengguna)
      .from(s.users)
      .where(where)
      .orderBy(asc(s.users.name))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ total: sql<number>`count(*)::int` }).from(s.users).where(where),
  ]);
  return { rows, total };
}

/** Daftar ringkas untuk kotak pencarian dengan saran. */
export const suggestUsers = (q: string, limit = 8) =>
  db
    .select({ id: s.users.id, name: s.users.name, email: s.users.email, role: s.users.role })
    .from(s.users)
    .where(syaratPengguna({ q }))
    .orderBy(asc(s.users.name))
    .limit(limit);

export const findUserDetail = (id: string) =>
  db.select(kolomPengguna).from(s.users).where(eq(s.users.id, id));

export const updateUser = (id: string, v: Partial<typeof s.users.$inferInsert>) =>
  db
    .update(s.users)
    .set({ ...v, updatedAt: new Date() })
    .where(eq(s.users.id, id))
    .returning(kolomPengguna);

export const deleteUser = (id: string) =>
  db.delete(s.users).where(eq(s.users.id, id)).returning({ id: s.users.id });

/** Dipakai untuk mencegah super admin terakhir dihapus atau diturunkan. */
export const countSuperAdmins = async () => {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.users)
    .where(and(eq(s.users.role, "super_admin"), eq(s.users.accountStatus, "aktif")));
  return r.n;
};

/**
 * Cacah materi dan yang sudah selesai, per pertemuan, untuk satu mata
 * pelajaran — dalam satu query.
 */
export const meetingProgressForSubject = (userId: string, subjectId: string) =>
  db
    .select({
      meetingId: s.meetings.id,
      total: sql<number>`count(*)::int`,
      done: sql<number>`(count(*) filter (where ${s.materialProgress.status} = 'completed'))::int`,
    })
    .from(s.materials)
    .innerJoin(s.meetings, eq(s.meetings.id, s.materials.meetingId))
    .leftJoin(
      s.materialProgress,
      and(
        eq(s.materialProgress.materialId, s.materials.id),
        eq(s.materialProgress.userId, userId),
      ),
    )
    .where(and(eq(s.meetings.subjectId, subjectId), eq(s.materials.publishStatus, "published")))
    .groupBy(s.meetings.id);

/* --- Rekap admin: nilai & kehadiran -------------------------------- */

/**
 * Rekap nilai seluruh peserta satu tahapan, dalam satu query.
 *
 * Menghitung per peserta di aplikasi berarti satu query per orang; pada
 * driver HTTP itu berbanding lurus dengan jumlah peserta.
 */
export const nilaiRekap = (tahapanId: string) =>
  db
    .select({
      userId: s.users.id,
      name: s.users.name,
      email: s.users.email,
      className: s.enrollments.className,
      percobaan: sql<number>`count(${s.assessmentAttempts.id})::int`,
      dinilai: sql<number>`(count(*) filter (where ${s.assessmentAttempts.status} = 'dinilai'))::int`,
      lulus: sql<number>`(count(*) filter (where ${s.assessmentAttempts.passed} = true))::int`,
      rataRata: sql<number | null>`round(avg(${s.assessmentAttempts.score}))::int`,
    })
    .from(s.enrollments)
    .innerJoin(s.users, eq(s.users.id, s.enrollments.userId))
    .leftJoin(s.assessmentAttempts, eq(s.assessmentAttempts.userId, s.users.id))
    .where(eq(s.enrollments.tahapanId, tahapanId))
    .groupBy(s.users.id, s.users.name, s.users.email, s.enrollments.className)
    .orderBy(asc(s.users.name));


/** Membuat pengguna baru; mengembalikan kolom yang aman dibaca klien. */
export const createUser = (v: typeof s.users.$inferInsert) =>
  db.insert(s.users).values(v).returning(kolomPengguna);

/* --- Riwayat & progres belajar peserta ------------------------------ */

/**
 * Progres belajar satu keikutsertaan, dihitung dari data sungguhan.
 *
 * `enrollments.progress` TIDAK dipakai. Kolom itu terisi sekali saat
 * penyemaian dan tidak pernah diperbarui oleh apa pun, sehingga setiap
 * peserta melihat angka yang sama selamanya — termasuk di dasbornya sendiri.
 * Angka yang salah lebih buruk daripada tidak ada angka, jadi penyebut dan
 * pembilangnya dihitung ulang di sini setiap kali diminta.
 *
 * Definisinya sengaja sama persis dengan laporan program di `report.ts`:
 * hanya materi berstatus terbit yang masuk penyebut. Materi draf tidak
 * pernah ditawarkan kepada peserta, jadi memasukkannya membuat progres
 * terlihat lebih buruk daripada kenyataan — dan dua definisi berbeda untuk
 * satu angka akan membuat dua layar saling bertentangan.
 */
const materiTerbit = sql<number>`(
  SELECT count(*) FROM ${s.materials}
  JOIN ${s.meetings} ON ${s.meetings.id} = ${s.materials.meetingId}
  JOIN ${s.subjects} ON ${s.subjects.id} = ${s.meetings.subjectId}
  WHERE ${s.subjects.tahapanId} = ${s.enrollments.tahapanId}
    AND ${s.materials.publishStatus} = 'published'
)::int`;

const materiSelesai = sql<number>`(
  SELECT count(*) FROM ${s.materialProgress}
  JOIN ${s.materials} ON ${s.materials.id} = ${s.materialProgress.materialId}
  JOIN ${s.meetings} ON ${s.meetings.id} = ${s.materials.meetingId}
  JOIN ${s.subjects} ON ${s.subjects.id} = ${s.meetings.subjectId}
  WHERE ${s.subjects.tahapanId} = ${s.enrollments.tahapanId}
    AND ${s.materialProgress.userId} = ${s.enrollments.userId}
    AND ${s.materialProgress.status} = 'completed'
    AND ${s.materials.publishStatus} = 'published'
)::int`;

const hitungKehadiran = (status: string) => sql<number>`(
  SELECT count(*) FROM ${s.attendance}
  JOIN ${s.meetings} ON ${s.meetings.id} = ${s.attendance.meetingId}
  JOIN ${s.subjects} ON ${s.subjects.id} = ${s.meetings.subjectId}
  WHERE ${s.subjects.tahapanId} = ${s.enrollments.tahapanId}
    AND ${s.attendance.userId} = ${s.enrollments.userId}
    AND ${s.attendance.status} = ${sql.raw(`'${status}'`)}
)::int`;

/**
 * Riwayat lengkap seorang peserta: setiap caturwulan yang pernah diikuti,
 * beserta progres, kehadiran, dan nilainya.
 *
 * Seluruhnya satu pernyataan. Driver Neon berbasis HTTP membayar satu
 * perjalanan jaringan per kueri ke Singapura, jadi mengambil rekap per baris
 * riwayat akan mengubah satu halaman profil menjadi belasan perjalanan.
 *
 * Diurutkan dari yang terbaru: riwayat dibaca mundur, dan caturwulan yang
 * sedang berjalan hampir selalu yang dicari lebih dulu.
 */
export const riwayatPeserta = (userId: string) =>
  db
    .select({
      id: s.enrollments.id,
      status: s.enrollments.status,
      engagement: s.enrollments.engagement,
      competency: s.enrollments.competency,
      className: s.enrollments.className,
      halaqohId: s.enrollments.halaqohId,
      halaqohName: s.halaqoh.name,
      halaqohCode: s.halaqoh.code,
      tahapanId: s.tahapan.id,
      tahapanName: s.tahapan.name,
      tahapanStatus: s.tahapan.status,
      tahapanSequence: s.tahapan.sequence,
      programId: s.programs.id,
      programName: s.programs.name,
      /* Tanggal sudah lama ada di tabel tetapi tidak pernah ditampilkan.
         Tanpa ini riwayat hanya daftar nama, bukan urutan waktu. */
      registeredAt: s.enrollments.registeredAt,
      approvedAt: s.enrollments.approvedAt,
      startedAt: s.enrollments.startedAt,
      completedAt: s.enrollments.completedAt,
      lastActiveAt: s.enrollments.lastActiveAt,
      materiTotal: materiTerbit,
      materiSelesai,
      hadir: hitungKehadiran("hadir"),
      izin: hitungKehadiran("izin"),
      sakit: hitungKehadiran("sakit"),
      alpa: hitungKehadiran("alpa"),
      asesmenSelesai: sql<number>`(
        SELECT count(*) FROM ${s.assessmentAttempts}
        JOIN ${s.assessments} ON ${s.assessments.id} = ${s.assessmentAttempts.assessmentId}
        WHERE ${s.assessmentAttempts.userId} = ${s.enrollments.userId}
          AND ${s.assessmentAttempts.status} = 'dinilai'
          AND ${s.assessments.tahapanId} = ${s.enrollments.tahapanId}
      )::int`,
      /* Rata-rata hanya dari percobaan yang sudah dinilai; yang masih
         menunggu penilaian esai bernilai null dan tidak boleh dianggap nol. */
      nilaiRata: sql<number | null>`(
        SELECT round(avg(${s.assessmentAttempts.score}))::int
        FROM ${s.assessmentAttempts}
        JOIN ${s.assessments} ON ${s.assessments.id} = ${s.assessmentAttempts.assessmentId}
        WHERE ${s.assessmentAttempts.userId} = ${s.enrollments.userId}
          AND ${s.assessmentAttempts.status} = 'dinilai'
          AND ${s.assessmentAttempts.score} IS NOT NULL
          AND ${s.assessments.tahapanId} = ${s.enrollments.tahapanId}
      )`,
    })
    .from(s.enrollments)
    .innerJoin(s.tahapan, eq(s.tahapan.id, s.enrollments.tahapanId))
    .innerJoin(s.programs, eq(s.programs.id, s.tahapan.programId))
    .leftJoin(s.halaqoh, eq(s.halaqoh.id, s.enrollments.halaqohId))
    .where(eq(s.enrollments.userId, userId))
    .orderBy(desc(s.enrollments.registeredAt), desc(s.tahapan.sequence));
