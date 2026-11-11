import { Badge, Meter, mono } from "./ui";

/**
 * Riwayat belajar: setiap caturwulan yang pernah diikuti, beserta progres,
 * kehadiran, dan nilainya.
 *
 * Dipakai bersama oleh profil peserta di portal admin dan halaman riwayat
 * milik peserta sendiri. Satu komponen untuk keduanya supaya angka yang
 * dilihat admin dan yang dilihat peserta tidak pernah berbeda bentuk maupun
 * cara menghitungnya.
 */

export type BarisRiwayat = {
  id: string;
  status: string;
  engagement: string;
  competency: string | null;
  halaqohName: string | null;
  halaqohCode: string | null;
  className: string | null;
  tahapanId: string;
  tahapanName: string;
  tahapanStatus: string;
  programId: string;
  programName: string;
  registeredAt: string | null;
  approvedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastActiveAt: string | null;
  materiTotal: number;
  materiSelesai: number;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  asesmenSelesai: number;
  nilaiRata: number | null;
};

const STATUS_LABEL: Record<string, string> = {
  registered: "Terdaftar",
  approved: "Disetujui",
  active: "Berjalan",
  completed: "Selesai",
  withdrawn: "Mengundurkan diri",
};

const STATUS_NADA: Record<string, { bg: string; fg: string }> = {
  registered: { bg: "#efe9df", fg: "#6d665c" },
  approved: { bg: "#f7eddc", fg: "#8a6520" },
  active: { bg: "#e4ede4", fg: "#2f5638" },
  completed: { bg: "#e7eaf0", fg: "#44506b" },
  withdrawn: { bg: "#faf0ec", fg: "#8d4632" },
};

/* Kata-katanya sengaja sama dengan Dasbor Admin — satu keadaan tidak boleh
   punya dua nama di dua layar. */
const ENGAGEMENT_LABEL: Record<string, string> = {
  on_track: "Sesuai jalur",
  needs_attention: "Perlu perhatian",
  at_risk: "Berisiko",
  inactive: "Tidak aktif",
};

const COMPETENCY_LABEL: Record<string, string> = {
  sudah_dikuasai: "Sudah dikuasai",
  perlu_murojaah: "Perlu murojaah",
  belum_dikuasai: "Belum dikuasai",
};

const tanggal = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : null;

const persen = (selesai: number, total: number) =>
  total ? Math.round((Number(selesai) / Number(total)) * 100) : 0;

export function RiwayatBelajar({
  rows,
  kosong = "Belum pernah mengikuti caturwulan mana pun.",
}: {
  rows: BarisRiwayat[];
  kosong?: string;
}) {
  if (rows.length === 0) {
    return (
      <div style={{ color: "var(--color-faint)", fontSize: 15, padding: "6px 0" }}>{kosong}</div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {rows.map((r) => {
        const p = persen(r.materiSelesai, r.materiTotal);
        const tercatatHadir = r.hadir + r.izin + r.sakit + r.alpa;
        const nada = STATUS_NADA[r.status] ?? STATUS_NADA.registered!;
        return (
          <div
            key={r.id}
            style={{
              border: "1px solid var(--color-line)",
              borderRadius: 10,
              padding: "15px 17px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{r.tahapanName}</div>
                <div style={{ fontSize: 14, color: "var(--color-muted)", marginTop: 2 }}>
                  {r.programName}
                  {(r.halaqohName || r.className) && (
                    <> · {r.halaqohName ?? r.className}</>
                  )}
                </div>
              </div>
              <Badge bg={nada.bg} fg={nada.fg}>
                {STATUS_LABEL[r.status] ?? r.status}
              </Badge>
            </div>

            {/*
              Angkanya ditulis terbaca di atas bilah. `Meter` hanya membawa
              `aria-label`, jadi tanpa baris ini peserta melihat bilah terisi
              tanpa tahu berapa — padahal angka itulah inti halaman ini.
            */}
            <div style={{ marginTop: 13 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 10,
                  marginBottom: 6,
                  fontSize: 14,
                }}
              >
                <span style={{ color: "var(--color-muted)" }}>
                  {r.materiTotal === 0
                    ? "Materi belum disiapkan"
                    : `Materi ${r.materiSelesai} dari ${r.materiTotal}`}
                </span>
                {r.materiTotal > 0 && (
                  <span style={{ fontFamily: mono, fontWeight: 700 }}>{p}%</span>
                )}
              </div>
              <Meter percent={p} label={`Materi ${r.materiSelesai} dari ${r.materiTotal}`} />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                gap: 12,
                marginTop: 14,
                paddingTop: 13,
                borderTop: "1px solid var(--color-line-soft)",
              }}
            >
              <Angka label="Mendaftar" nilai={tanggal(r.registeredAt)} />
              {r.completedAt ? (
                <Angka label="Selesai" nilai={tanggal(r.completedAt)} />
              ) : (
                <Angka label="Terakhir aktif" nilai={tanggal(r.lastActiveAt)} />
              )}
              <Angka
                label="Kehadiran"
                nilai={
                  /* Dibedakan dari "0 hadir": belum ada satu pun pertemuan
                     yang dicatat kehadirannya, bukan peserta yang tidak
                     pernah datang. */
                  tercatatHadir === 0 ? "belum dicatat" : `${r.hadir} dari ${tercatatHadir}`
                }
              />
              <Angka
                label="Asesmen"
                nilai={r.asesmenSelesai === 0 ? "belum ada" : `${r.asesmenSelesai} dinilai`}
              />
              <Angka
                label="Rata-rata nilai"
                nilai={r.nilaiRata === null ? null : String(r.nilaiRata)}
              />
              <Angka
                label="Keaktifan"
                nilai={ENGAGEMENT_LABEL[r.engagement] ?? r.engagement}
              />
              {r.competency && (
                <Angka
                  label="Kompetensi"
                  nilai={COMPETENCY_LABEL[r.competency] ?? r.competency}
                />
              )}
            </div>

            {r.alpa > 0 && (
              <div style={{ marginTop: 11, fontSize: 14, color: "#8d4632" }}>
                {r.alpa} pertemuan tanpa keterangan.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Angka({ label, nilai }: { label: string; nilai: string | null }) {
  return (
    <div>
      <div
        style={{
          fontFamily: mono,
          fontSize: 10.5,
          letterSpacing: ".11em",
          color: "var(--color-faint)",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14.5 }}>
        {nilai || <span style={{ color: "var(--color-faint)" }}>—</span>}
      </div>
    </div>
  );
}

/**
 * Ringkasan seluruh riwayat dalam satu baris angka.
 *
 * Materi dijumlahkan lintas caturwulan, bukan dirata-ratakan persentasenya:
 * caturwulan berisi sepuluh materi dan yang berisi seratus tidak pantas
 * berbobot sama.
 */
export function RingkasanRiwayat({ rows }: { rows: BarisRiwayat[] }) {
  const total = rows.reduce((n, r) => n + Number(r.materiTotal), 0);
  const selesai = rows.reduce((n, r) => n + Number(r.materiSelesai), 0);
  const tuntas = rows.filter((r) => r.status === "completed").length;
  const berjalan = rows.filter((r) => r.status === "active" || r.status === "approved").length;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
        gap: 16,
        padding: "16px 18px",
        background: "var(--color-mist)",
        borderRadius: 10,
      }}
    >
      <Angka label="Caturwulan diikuti" nilai={String(rows.length)} />
      <Angka label="Sudah tuntas" nilai={String(tuntas)} />
      <Angka label="Sedang berjalan" nilai={String(berjalan)} />
      <Angka
        label="Materi diselesaikan"
        nilai={total ? `${selesai} dari ${total} (${persen(selesai, total)}%)` : "—"}
      />
    </div>
  );
}
