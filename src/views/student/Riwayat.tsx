import { useResource } from "../../lib/useApi";
import { EmptyState, PageHeader } from "../../components/ui";
import {
  RingkasanRiwayat,
  RiwayatBelajar,
  type BarisRiwayat,
} from "../../components/RiwayatBelajar";

/**
 * Riwayat belajar peserta sendiri.
 *
 * Memakai komponen yang sama dengan profil peserta di portal admin, sehingga
 * angka yang dilihat peserta persis sama dengan yang dilihat pengajarnya —
 * tidak ada dua versi kebenaran tentang progres seseorang.
 *
 * Sumbernya `/me/riwayat`, yang tidak menerima parameter id: peserta hanya
 * dapat melihat riwayatnya sendiri, dan tanpa parameter tidak ada yang bisa
 * ditebak.
 */
export default function Riwayat() {
  const daftar = useResource<BarisRiwayat[]>("/me/riwayat");
  const rows = daftar.data ?? [];

  return (
    <div className="shell" style={{ paddingBlock: "34px 70px" }}>
      <PageHeader
        eyebrow="Riwayat"
        title="Perjalanan Belajar Saya"
        lead="Setiap caturwulan yang pernah Anda ikuti, beserta materi yang sudah diselesaikan, kehadiran, dan nilainya."
      />

      {daftar.loading && <div style={{ color: "var(--color-faint)" }}>Memuat riwayat…</div>}
      {daftar.error && <div role="alert">{daftar.error}</div>}

      {daftar.data && rows.length === 0 && (
        <EmptyState
          title="Belum ada riwayat"
          hint="Riwayat muncul setelah Anda terdaftar pada sebuah caturwulan."
        />
      )}

      {rows.length > 0 && (
        <>
          <div style={{ marginBottom: 22 }}>
            <RingkasanRiwayat rows={rows} />
          </div>
          <RiwayatBelajar rows={rows} />
        </>
      )}
    </div>
  );
}
