/**
 * Format CSV untuk impor bank soal, beserta pembacanya.
 *
 * Dipisah dari komponen agar dapat diuji dan dipakai ulang, dan karena
 * penguraian CSV punya cukup banyak kasus sudut untuk berdiri sendiri.
 */

export type TipeSoal = "multiple_choice" | "true_false" | "essay";

export type BarisImpor = {
  type: TipeSoal;
  prompt: string;
  options?: string[];
  answerKey?: string | null;
  explanation?: string | null;
  points: number;
  topic?: string | null;
  tags?: string | null;
  difficulty: "mudah" | "sedang" | "sulit";
};

export type HasilBaris =
  | { nomor: number; ok: true; data: BarisImpor }
  | { nomor: number; ok: false; masalah: string[]; mentah: string[] };

export const KOLOM = [
  "tipe",
  "pertanyaan",
  "pilihan1",
  "pilihan2",
  "pilihan3",
  "pilihan4",
  "pilihan5",
  "kunci",
  "pembahasan",
  "poin",
  "topik",
  "tag",
  "tingkat",
] as const;

/**
 * Template contoh.
 *
 * Sengaja memuat satu baris untuk tiap tipe: membaca satu contoh nyata jauh
 * lebih cepat dipahami daripada membaca keterangan kolom.
 */
export const TEMPLATE_CSV = [
  KOLOM.join(","),
  `pg,"Huruf pertama hijaiyah?",Alif,Ba,Ta,,,1,"Alif adalah huruf pertama.",2,Bahasa Arab,"hijaiyah,dasar",mudah`,
  `bs,"Murojaah adalah bagian inti belajar.",,,,,,BENAR,"Bukan tambahan.",1,Adab,murojaah,mudah`,
  `esai,"Jelaskan makna niat dalam menuntut ilmu.",,,,,,,"Dinilai manual.",5,Adab,niat,sulit`,
].join("\n");

const TIPE: Record<string, TipeSoal> = {
  pg: "multiple_choice",
  "pilihan ganda": "multiple_choice",
  multiple_choice: "multiple_choice",
  bs: "true_false",
  "benar-salah": "true_false",
  "benar salah": "true_false",
  true_false: "true_false",
  esai: "essay",
  essay: "essay",
};

const TINGKAT: Record<string, BarisImpor["difficulty"]> = {
  mudah: "mudah",
  sedang: "sedang",
  sulit: "sulit",
};

/**
 * Pembaca CSV sederhana yang menghormati tanda kutip.
 *
 * Ditulis sendiri, bukan menarik pustaka: yang dibutuhkan hanya tanda kutip
 * ganda, koma di dalam kutip, dan kutip ganda berlipat sebagai escape.
 */
export function uraiCsv(teks: string): string[][] {
  const baris: string[][] = [];
  let sel = "";
  let kolom: string[] = [];
  let dalamKutip = false;

  const bersih = teks.replace(/\r\n?/g, "\n");

  for (let i = 0; i < bersih.length; i++) {
    const c = bersih[i]!;
    if (dalamKutip) {
      if (c === '"') {
        if (bersih[i + 1] === '"') {
          sel += '"';
          i++;
        } else dalamKutip = false;
      } else sel += c;
      continue;
    }
    if (c === '"') dalamKutip = true;
    else if (c === ",") {
      kolom.push(sel);
      sel = "";
    } else if (c === "\n") {
      kolom.push(sel);
      baris.push(kolom);
      kolom = [];
      sel = "";
    } else sel += c;
  }
  if (sel !== "" || kolom.length) {
    kolom.push(sel);
    baris.push(kolom);
  }
  return baris.filter((r) => r.some((x) => x.trim() !== ""));
}

/**
 * Mengubah CSV menjadi baris siap impor, dengan masalah per baris.
 *
 * Kunci pilihan ganda ditulis manusia sebagai nomor 1–5; disimpan sebagai
 * indeks 0-basis. Menuntut admin menulis "0" untuk pilihan pertama adalah
 * sumber salah isi yang tidak perlu.
 */
export function bacaBaris(teks: string): HasilBaris[] {
  const baris = uraiCsv(teks);
  if (baris.length === 0) return [];

  /* Baris pertama dianggap judul kolom bila kata "tipe" ada di dalamnya. */
  const adaJudul = baris[0]!.some((c) => c.trim().toLowerCase() === "tipe");
  const isi = adaJudul ? baris.slice(1) : baris;

  return isi.map((kolom, i) => {
    const nomor = i + 1 + (adaJudul ? 1 : 0);
    const ambil = (n: number) => (kolom[n] ?? "").trim();
    const masalah: string[] = [];

    const tipe = TIPE[ambil(0).toLowerCase()];
    if (!tipe) masalah.push(`Tipe "${ambil(0)}" tidak dikenal — pakai pg, bs, atau esai`);

    const prompt = ambil(1);
    if (prompt.length < 3) masalah.push("Pertanyaan wajib diisi");

    const pilihan = [ambil(2), ambil(3), ambil(4), ambil(5), ambil(6)].filter(Boolean);
    const kunciMentah = ambil(7);

    let answerKey: string | null = null;
    if (tipe === "multiple_choice") {
      if (pilihan.length < 2) masalah.push("Pilihan ganda perlu minimal 2 pilihan");
      const n = Number(kunciMentah);
      if (!Number.isInteger(n) || n < 1 || n > pilihan.length) {
        masalah.push(
          pilihan.length
            ? `Kunci harus nomor 1–${pilihan.length}, bukan "${kunciMentah}"`
            : "Kunci tidak dapat diperiksa karena pilihan kosong",
        );
      } else answerKey = String(n - 1);
    } else if (tipe === "true_false") {
      const k = kunciMentah.toLowerCase();
      if (["benar", "true", "b", "ya"].includes(k)) answerKey = "true";
      else if (["salah", "false", "s", "tidak"].includes(k)) answerKey = "false";
      else masalah.push(`Kunci benar-salah harus BENAR atau SALAH, bukan "${kunciMentah}"`);
      if (pilihan.length) masalah.push("Benar-salah tidak memakai kolom pilihan");
    } else if (tipe === "essay") {
      if (kunciMentah) masalah.push("Esai tidak boleh punya kunci jawaban");
      if (pilihan.length) masalah.push("Esai tidak memakai kolom pilihan");
    }

    const poinMentah = ambil(9);
    const poin = poinMentah === "" ? 1 : Number(poinMentah);
    if (!Number.isInteger(poin) || poin < 1 || poin > 100) {
      masalah.push(`Poin harus bilangan bulat 1–100, bukan "${poinMentah}"`);
    }

    const tingkatMentah = ambil(12).toLowerCase();
    const difficulty = tingkatMentah === "" ? "sedang" : TINGKAT[tingkatMentah];
    if (!difficulty) masalah.push(`Tingkat "${ambil(12)}" tidak dikenal — pakai mudah, sedang, atau sulit`);

    if (masalah.length || !tipe || !difficulty) {
      return { nomor, ok: false, masalah, mentah: kolom };
    }

    return {
      nomor,
      ok: true,
      data: {
        type: tipe,
        prompt,
        options: tipe === "multiple_choice" ? pilihan : undefined,
        answerKey,
        explanation: ambil(8) || null,
        points: poin,
        topic: ambil(10) || null,
        tags: ambil(11) || null,
        difficulty,
      },
    };
  });
}
