import { Hono } from "hono";
import { badRequest, notFound } from "../lib/errors";
import { ADMIN, requireAuth, requireRole } from "../middleware/auth";
import * as reg from "../repositories/registration";
import * as learner from "../repositories/learner";
import { uuidParam } from "../validators/schemas";
import { alamatPemanggil, catatPercobaanDaftar, sapuBerkala } from "../services/ratelimit";
import { hashPassword, sandiSementara } from "../services/auth";
import { MAKS_BYTE, adapter, tautanBerkas, ukuranBase64 } from "../services/storage";
import {
  formBody,
  formPatchBody,
  registrationBody,
  registrationListQuery,
  registrationPatchBody,
  buktiBody,
  pembayaranPatchBody,
} from "../validators/registration";

const conflict = (c: Parameters<typeof notFound>[0], message: string) =>
  c.json({ error: { code: "CONFLICT", message } }, 409);

const tutup = (c: Parameters<typeof notFound>[0], message: string) =>
  c.json({ error: { code: "REGISTRATION_CLOSED", message } }, 409);

/** Kode 23505 = pelanggaran indeks unik; Drizzle menaruhnya di `cause`. */
function bentrokUnik(e: unknown): boolean {
  const kode = (v: unknown) =>
    typeof v === "object" && v !== null ? (v as { code?: string }).code : undefined;
  const sebab = typeof e === "object" && e !== null ? (e as { cause?: unknown }).cause : undefined;
  return kode(e) === "23505" || kode(sebab) === "23505";
}

/**
 * Apakah formulir sedang menerima kiriman.
 *
 * Dihitung di server dan tidak pernah dipercayakan ke tampilan: status terbit
 * saja tidak cukup, rentang waktunya juga harus sedang berjalan.
 */
function sedangDibuka(f: { status: string; opensAt: Date | null; closesAt: Date | null }) {
  if (f.status !== "terbit") return { buka: false, alasan: "Pendaftaran belum dibuka." };
  const kini = Date.now();
  if (f.opensAt && kini < f.opensAt.getTime()) {
    return { buka: false, alasan: "Pendaftaran belum dibuka." };
  }
  if (f.closesAt && kini > f.closesAt.getTime()) {
    return { buka: false, alasan: "Pendaftaran sudah ditutup." };
  }
  return { buka: true, alasan: "" };
}

/* --- Publik --------------------------------------------------------- */

export const daftarRoutes = new Hono();

/** Daftar program yang pendaftarannya terbit — untuk halaman /daftar. */
daftarRoutes.get("/", async (c) => {
  const rows = await reg.listPublicForms();
  return c.json({
    data: rows.map((f) => ({ ...f, ...sedangDibuka(f) })),
  });
});

daftarRoutes.get("/:slug", async (c) => {
  const [form] = await reg.findPublicFormBySlug(c.req.param("slug"));
  if (!form || form.status === "draf") return notFound(c, "Formulir pendaftaran tidak ditemukan.");
  return c.json({ data: { ...form, ...sedangDibuka(form) } });
});

daftarRoutes.post("/:slug", async (c) => {
  const [form] = await reg.findPublicFormBySlug(c.req.param("slug"));
  if (!form || form.status === "draf") return notFound(c, "Formulir pendaftaran tidak ditemukan.");

  const keadaan = sedangDibuka(form);
  if (!keadaan.buka) return tutup(c, keadaan.alasan);

  const p = registrationBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);

  /*
   * Penghitung baru dinaikkan setelah formulir terbukti dibuka DAN isiannya
   * lolos validasi.
   *
   * Sebelumnya kiriman yang cacat ikut dihitung, sehingga pendaftar yang
   * salah ketik kata sandi beberapa kali terkunci sebelum sempat mendaftar —
   * padahal yang hendak dicegah pembatas ini adalah pendaftaran massal, bukan
   * salah ketik.
   */
  const ip = alamatPemanggil((n) => c.req.header(n));
  await sapuBerkala();
  const batas = await catatPercobaanDaftar(ip, c.req.param("slug"));
  if (batas.ditolak) {
    const menit = Math.ceil(batas.sisaDetik / 60);
    return c.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `Terlalu banyak pendaftaran dari perangkat ini. Coba lagi dalam ${menit} menit.`,
        },
      },
      429,
      { "Retry-After": String(batas.sisaDetik) },
    );
  }

  /*
   * Email yang sudah punya akun tidak boleh menimpa akun itu lewat formulir
   * publik — itu jalan mudah untuk mengambil alih akun orang lain. Yang
   * bersangkutan diminta masuk memakai akunnya sendiri.
   */
  const sudahAda = await learner.findUserByEmail(p.data.email);
  if (sudahAda) {
    return conflict(
      c,
      "Email ini sudah memiliki akun. Silakan masuk, atau hubungi admin bila lupa kata sandi.",
    );
  }

  const { password, ...isian } = p.data;

  /* Enrol otomatis ke caturwulan yang sedang berjalan pada program ini. */
  const tahapanId = await reg.tahapanBerjalan(form.programId);

  try {
    await reg.daftarMandiri({
      ...isian,
      formId: form.id,
      tahapanId,
      passwordHash: await hashPassword(password),
      /* Biaya disalin apa adanya saat mendaftar. Formulir gratis memberi
         null, dan itulah yang menandai pendaftaran sebagai dibebaskan. */
      feeAmount: form.isPaid ? (form.feeAmount ?? null) : null,
      /* Kolom opsional diratakan ke null: undefined tidak punya arti di SQL. */
      country: isian.country ?? null,
      province: isian.province ?? null,
      city: isian.city ?? null,
      education: isian.education ?? null,
      segment: isian.segment ?? null,
      reason: isian.reason ?? null,
      /* Bunyi pernyataan disimpan apa adanya: teksnya bisa berubah nanti,
       * sedangkan yang disetujui pendaftar adalah versi hari ini. */
      commitmentSnapshot: form.commitmentText,
    });
  } catch (e) {
    if (bentrokUnik(e)) {
      return conflict(c, "Email ini sudah terdaftar pada program tersebut.");
    }
    throw e;
  }

  /*
   * Tautan grup baru diberikan di sini — setelah kiriman benar-benar tercatat.
   * Hanya tautan yang sesuai jenis kelamin pendaftar yang dikirim.
   */
  const penuh = await reg.findForm(form.id);
  const tautanGrup = p.data.gender === "ikhwan" ? penuh?.waIkhwanUrl : penuh?.waAkhwatUrl;

  /*
   * Rincian rekening menyusul di sini, satu langkah dengan tautan grup, dan
   * dengan alasan yang sama: keduanya hanya berguna bagi orang yang benar-
   * benar mendaftar, dan memajangnya di konfigurasi publik berarti siapa pun
   * dapat memanennya.
   */
  const pembayaran =
    penuh?.isPaid && penuh.feeAmount
      ? {
          feeAmount: penuh.feeAmount,
          bankName: penuh.bankName,
          bankAccountNumber: penuh.bankAccountNumber,
          bankAccountHolder: penuh.bankAccountHolder,
          paymentNote: penuh.paymentNote,
          dueDays: penuh.paymentDueDays,
        }
      : null;

  return c.json(
    {
      data: {
        ok: true,
        gender: p.data.gender,
        programName: form.programName,
        tautanGrup: tautanGrup ?? null,
        /* Dipakai halaman berhasil untuk mengarahkan pendaftar langsung masuk. */
        email: p.data.email,
        terdaftarKelas: tahapanId !== null,
        pembayaran,
      },
    },
    201,
  );
});

/* --- Admin ---------------------------------------------------------- */

export const registrationAdminRoutes = new Hono().use("*", requireRole(...ADMIN));

registrationAdminRoutes.get("/forms", async (c) => c.json({ data: await reg.listForms() }));

registrationAdminRoutes.post("/forms", async (c) => {
  const p = formBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);
  try {
    const [row] = await reg.createForm(p.data);
    await learner.writeAudit(c.get("user")!.id, "registration_form.create", "registration_form", row.id);
    return c.json({ data: row }, 201);
  } catch (e) {
    if (bentrokUnik(e)) return conflict(c, "Tautan itu sudah dipakai formulir lain.");
    throw e;
  }
});

registrationAdminRoutes.patch("/forms/:id", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);

  const p = formPatchBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);

  /*
   * Rentang waktu diperiksa terhadap gabungan nilai lama dan baru: mengubah
   * satu ujung saja tetap bisa membuat rentangnya terbalik.
   */
  const lama = await reg.findForm(id.data.id);
  if (!lama) return notFound(c, "Formulir tidak ditemukan.");
  const buka = p.data.opensAt !== undefined ? p.data.opensAt : lama.opensAt;
  const tutupPada = p.data.closesAt !== undefined ? p.data.closesAt : lama.closesAt;
  if (buka && tutupPada && tutupPada <= buka) {
    return badRequest(c, {
      issues: [{ path: ["closesAt"], message: "Waktu tutup harus setelah waktu buka" }],
    } as never);
  }

  try {
    const [row] = await reg.updateForm(id.data.id, p.data);
    await learner.writeAudit(c.get("user")!.id, "registration_form.update", "registration_form", row.id);
    return c.json({ data: row });
  } catch (e) {
    if (bentrokUnik(e)) return conflict(c, "Tautan itu sudah dipakai formulir lain.");
    throw e;
  }
});

registrationAdminRoutes.delete("/forms/:id", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);
  const [row] = await reg.deleteForm(id.data.id);
  if (!row) return notFound(c, "Formulir tidak ditemukan.");
  await learner.writeAudit(c.get("user")!.id, "registration_form.delete", "registration_form", id.data.id);
  return c.body(null, 204);
});

registrationAdminRoutes.get("/", async (c) => {
  const p = registrationListQuery.safeParse(c.req.query());
  if (!p.success) return badRequest(c, p.error);
  const { page, perPage, ...filter } = p.data;
  const { rows, total } = await reg.listRegistrationsPaged(filter, page, perPage);
  return c.json({
    data: rows,
    meta: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
  });
});

registrationAdminRoutes.get("/rekap", async (c) => {
  const formId = c.req.query("formId");
  return c.json({ data: await reg.registrationCounts(formId || undefined) });
});

registrationAdminRoutes.get("/:id", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);
  const [row] = await reg.findRegistration(id.data.id);
  return row ? c.json({ data: row }) : notFound(c, "Pendaftaran tidak ditemukan.");
});

registrationAdminRoutes.patch("/:id", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);

  const p = registrationPatchBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);

  const aktor = c.get("user")!;

  /*
   * Menyetujui bukan sekadar membalik kolom status. Pendaftar harus benar-
   * benar punya akun dan terdaftar pada caturwulan berjalan — kalau tidak,
   * "disetujui" hanya label yang tidak berakibat apa pun.
   */
  if (p.data.status === "disetujui") {
    const [pendaftaran] = await reg.findRegistration(id.data.id);
    if (!pendaftaran) return notFound(c, "Pendaftaran tidak ditemukan.");

    const form = await reg.findForm(pendaftaran.formId);
    const tahapanId = form ? await reg.tahapanBerjalan(form.programId) : null;

    /*
     * Kata sandi dibangkitkan untuk pendaftar yang belum punya akun — mereka
     * mendaftar sebelum formulir meminta kata sandi sendiri. Nilainya hanya
     * dikembalikan bila akunnya memang baru dibuat.
     */
    const sandi = sandiSementara();
    const hasil = await reg.setujuiPendaftaran(
      id.data.id,
      tahapanId,
      aktor.id,
      await hashPassword(sandi),
      p.data.note ?? null,
    );
    if (!hasil) return notFound(c, "Pendaftaran tidak ditemukan.");

    await learner.writeAudit(aktor.id, "registration.approve", "registration", id.data.id);
    return c.json({
      data: {
        id: id.data.id,
        status: "disetujui",
        userId: hasil.userId,
        akunBaru: hasil.akunBaru,
        enrolBaru: hasil.enrolBaru,
        /* Ditampilkan sekali kepada admin untuk diteruskan ke pendaftar. */
        sandiSementara: hasil.akunBaru ? sandi : null,
        tanpaCaturwulan: tahapanId === null,
      },
    });
  }

  const [row] = await reg.updateRegistration(id.data.id, {
    ...p.data,
    ...(p.data.status ? { reviewedAt: new Date(), reviewedBy: aktor.id } : {}),
  });
  if (!row) return notFound(c, "Pendaftaran tidak ditemukan.");
  await learner.writeAudit(aktor.id, "registration.review", "registration", row.id);
  return c.json({ data: row });
});

registrationAdminRoutes.delete("/:id", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);
  const [row] = await reg.deleteRegistration(id.data.id);
  if (!row) return notFound(c, "Pendaftaran tidak ditemukan.");
  await learner.writeAudit(c.get("user")!.id, "registration.delete", "registration", id.data.id);
  return c.body(null, 204);
});

/* --- Pembayaran: peserta ------------------------------------------- */

/**
 * Jalur pembayaran milik peserta yang sedang masuk.
 *
 * Sengaja berada di balik autentikasi, bukan di jalur publik bersama
 * formulir. Pendaftaran mandiri sudah membuatkan akun, jadi pendaftar selalu
 * punya cara masuk — sementara titik unggah tanpa autentikasi berarti siapa
 * pun dapat menitipkan berkas ke server ini.
 */
export const pembayaranSayaRoutes = new Hono().use("*", requireAuth());

/** Tagihan peserta beserta rincian rekening dan bukti yang sudah dikirim. */
pembayaranSayaRoutes.get("/", async (c) => {
  const aktor = c.get("user")!;
  const baris = await reg.tagihanPengguna(aktor.id);
  return c.json({ data: baris });
});

pembayaranSayaRoutes.post("/:id/bukti", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);

  const p = buktiBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);

  /*
   * Kepemilikan diperiksa lewat pendaftaran, bukan lewat id yang dikirim.
   * Tanpa ini, siapa pun yang sudah masuk dapat menempelkan bukti pada
   * tagihan orang lain hanya dengan menebak id.
   */
  const aktor = c.get("user")!;
  const milik = (await reg.tagihanPengguna(aktor.id)).find((t) => t.id === id.data.id);
  if (!milik) return notFound(c, "Tagihan tidak ditemukan.");
  if (milik.paymentStatus === "lunas" || milik.paymentStatus === "dibebaskan") {
    return conflict(c, "Pembayaran ini sudah selesai; tidak perlu mengirim bukti lagi.");
  }

  const sizeBytes = ukuranBase64(p.data.base64);
  if (sizeBytes > MAKS_BYTE) {
    return badRequest(c, {
      issues: [
        {
          path: ["base64"],
          message: `Ukuran berkas ${(sizeBytes / 1024 / 1024).toFixed(1)} MB melebihi batas 2 MB`,
        },
      ],
    } as never);
  }

  const lokasi = await adapter.simpan(p.data);
  const proofId = await reg.simpanBukti({
    registrationId: id.data.id,
    fileName: p.data.fileName,
    contentType: p.data.contentType,
    ...lokasi,
  });
  if (!proofId) return notFound(c, "Tagihan tidak ditemukan.");

  return c.json({ data: { id: proofId, status: "menunggu_verifikasi" } }, 201);
});

/* --- Pembayaran: admin --------------------------------------------- */

registrationAdminRoutes.get("/:id/bukti", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);
  const [bukti] = await reg.buktiTerakhir(id.data.id);
  if (!bukti) return notFound(c, "Belum ada bukti transfer untuk pendaftaran ini.");
  return c.json({
    data: {
      id: bukti.id,
      fileName: bukti.fileName,
      contentType: bukti.contentType,
      sizeBytes: bukti.sizeBytes,
      uploadedAt: bukti.uploadedAt,
      /* Dibentuk dari kolom `storage` baris itu sendiri, sehingga berkas
         lama tetap terbaca setelah lapis penyimpanan ditukar. */
      tautan: tautanBerkas(bukti),
    },
  });
});

registrationAdminRoutes.patch("/:id/pembayaran", async (c) => {
  const id = uuidParam.safeParse({ id: c.req.param("id") });
  if (!id.success) return badRequest(c, id.error);
  const p = pembayaranPatchBody.safeParse(await c.req.json().catch(() => ({})));
  if (!p.success) return badRequest(c, p.error);

  const aktor = c.get("user")!;
  const [row] = await reg.putuskanPembayaran(id.data.id, {
    paymentStatus: p.data.paymentStatus,
    paymentNote: p.data.paymentNote ?? null,
    verifiedBy: aktor.id,
  });
  if (!row) return notFound(c, "Pendaftaran tidak ditemukan.");
  await learner.writeAudit(aktor.id, "pembayaran.putuskan", "registration", row.id);
  return c.json({ data: row });
});

registrationAdminRoutes.get("/pembayaran/rekap", async (c) => {
  const formId = c.req.query("formId");
  return c.json({ data: await reg.rekapPembayaran(formId || undefined) });
});
