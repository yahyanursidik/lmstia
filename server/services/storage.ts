/**
 * Penyimpanan berkas unggahan.
 *
 * Satu-satunya tempat di seluruh kode yang tahu di mana byte berkas berada.
 * Rute dan repositori hanya memanggil `simpan`, `baca`, dan `hapus`; mereka
 * tidak pernah menyentuh kolom `data_base64` maupun kunci objek. Itulah yang
 * membuat lapisnya bisa ditukar tanpa menyentuh alur pembayaran.
 *
 * Lapis bawaan — `postgres` — menyimpan isi berkas di basis data sebagai
 * base64. Netlify Functions tidak punya penyimpanan berkas sendiri, dan
 * penyimpanan objek belum dikonfigurasi, jadi ini yang berjalan hari ini
 * tanpa konfigurasi apa pun.
 *
 * Base64, bukan `bytea`: driver Neon berbasis HTTP mengembalikan `bytea`
 * sebagai string heksadesimal berawalan `\\x` yang harus diurai manual, dan
 * nilainya tetap melintas sebagai teks di JSON. Base64 membuat biaya itu
 * kasatmata alih-alih tersembunyi, dan nilainya langsung dapat dipakai
 * sebagai data URL.
 *
 * Menukar ke penyimpanan objek nanti: tulis `AdapterObjek` di bawah,
 * kembalikan `{ storage: "objek", objectKey }` dari `simpan`, dan arahkan
 * `adapter` padanya. Baris lama tetap terbaca karena `baca` memilih jalannya
 * dari kolom `storage` tiap baris, bukan dari adapter yang sedang aktif.
 */

export type BerkasMasuk = {
  fileName: string;
  contentType: string;
  /** Isi berkas yang sudah di-base64, tanpa awalan `data:`. */
  base64: string;
};

export type LokasiBerkas = {
  storage: "postgres" | "objek";
  dataBase64: string | null;
  objectKey: string | null;
  sizeBytes: number;
};

export type BarisBerkas = {
  storage: string;
  dataBase64: string | null;
  objectKey: string | null;
  contentType: string;
};

/**
 * Batas ukuran unggahan.
 *
 * Dua megabita cukup untuk tangkapan layar atau foto struk, dan menahan
 * basis data dari membengkak selama isinya masih ikut di sana. Diperiksa
 * terhadap ukuran byte sebenarnya, bukan panjang string base64 — base64
 * sekitar sepertiga lebih panjang, dan memakai panjangnya akan menolak
 * berkas yang sebetulnya masih di bawah batas.
 */
export const MAKS_BYTE = 2 * 1024 * 1024;

/** Jenis berkas yang diterima sebagai bukti transfer. */
export const JENIS_DITERIMA = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export const ukuranBase64 = (base64: string) => Math.floor((base64.length * 3) / 4);

export interface Adapter {
  simpan(b: BerkasMasuk): Promise<LokasiBerkas>;
  hapus(baris: BarisBerkas): Promise<void>;
}

/** Lapis bawaan: isi berkas ikut tersimpan di basis data. */
const adapterPostgres: Adapter = {
  async simpan(b) {
    return {
      storage: "postgres",
      dataBase64: b.base64,
      objectKey: null,
      sizeBytes: ukuranBase64(b.base64),
    };
  },
  /* Tidak ada yang perlu dibereskan: barisnya sendiri yang memuat isinya,
     dan baris itu dihapus oleh pemanggil. */
  async hapus() {},
};

export const adapter: Adapter = adapterPostgres;

/**
 * Mengubah satu baris berkas menjadi sesuatu yang dapat ditampilkan peramban.
 *
 * Memilih jalannya dari kolom `storage` baris itu, bukan dari adapter yang
 * sedang aktif — supaya berkas lama tetap terbaca setelah lapisnya ditukar.
 */
export function tautanBerkas(baris: BarisBerkas): string | null {
  if (baris.storage === "postgres" && baris.dataBase64) {
    return `data:${baris.contentType};base64,${baris.dataBase64}`;
  }
  /* Penyimpanan objek nanti mengembalikan presigned URL di sini. */
  return null;
}
