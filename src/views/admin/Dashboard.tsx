import { Link } from "react-router";
import { useResource } from "../../lib/useApi";
import { Badge, Card, CardTitle, EmptyState, Meter, mono, serif } from "../../components/ui";

/**
 * Dasbor admin — menjawab "siapa yang perlu didampingi sekarang?"
 *
 * Isinya berasal dari basis data. Sebelumnya menampilkan angka contoh yang
 * ditulis di kode, sehingga dasbor bisa terlihat sehat sementara keadaan
 * sebenarnya tidak.
 */

type Overview = {
  tahapan: { id: string; name: string; title: string | null };
  totals: { participants: number; onTrack: number; needsFollowUp: number };
  engagement: { engagement: string; n: number }[];
  competency: { competency: string | null; n: number }[];
  needsFollowUp: {
    userId: string;
    name: string;
    email: string;
    engagement: string;
    progress: number;
    className: string | null;
  }[];
};

type Peserta = {
  userId: string;
  name: string;
  email: string;
  className: string | null;
  status: string;
  engagement: string;
  progress: number;
};

const ENGAGEMENT_LABEL: Record<string, string> = {
  on_track: "Sesuai jalur",
  needs_attention: "Perlu perhatian",
  at_risk: "Berisiko",
  inactive: "Tidak aktif",
};

const ENGAGEMENT_TONE: Record<string, { bg: string; fg: string }> = {
  on_track: { bg: "#e4ede4", fg: "#2f5638" },
  needs_attention: { bg: "#f6eddb", fg: "#8a6a25" },
  at_risk: { bg: "#f7e6e0", fg: "#8d4632" },
  inactive: { bg: "#ece9e3", fg: "#6b6459" },
};

const COMPETENCY_LABEL: Record<string, string> = {
  sudah_dikuasai: "Sudah dikuasai",
  perlu_murojaah: "Perlu murojaah",
  belum_dikuasai: "Belum dikuasai",
};

export default function AdminDashboard() {
  const o = useResource<Overview>("/admin/overview");
  const peserta = useResource<Peserta[]>("/admin/participants");

  if (o.loading) {
    return (
      <div style={{ color: "var(--color-faint)" }}>Memuat dasbor…</div>
    );
  }

  if (o.error || !o.data) {
    return (
      <EmptyState
        title="Dasbor belum dapat dimuat"
        hint={o.error ?? "Belum ada caturwulan yang berjalan."}
      />
    );
  }

  const d = o.data;
  const rata = (peserta.data ?? []).length
    ? Math.round(
        (peserta.data ?? []).reduce((a, p) => a + p.progress, 0) / (peserta.data ?? []).length,
      )
    : 0;

  return (
    <>
      <header style={{ marginBottom: 26 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          {d.tahapan.name}
        </div>
        <h1 style={{ fontSize: 32 }}>Keberlangsungan Belajar</h1>
        <p
          style={{
            margin: "12px 0 0",
            fontSize: 17,
            lineHeight: 1.6,
            color: "var(--color-body)",
            maxWidth: 620,
          }}
        >
          Yang ditampilkan bukan sekadar jumlah peserta, melainkan siapa yang perlu didampingi
          lebih dulu.
        </p>
      </header>

      <div
        className="quad"
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}
      >
        <Card>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Peserta
          </div>
          <div style={{ fontFamily: serif, fontSize: 32, lineHeight: 1 }}>
            {d.totals.participants}
          </div>
        </Card>
        <Card>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Sesuai jalur
          </div>
          <div style={{ fontFamily: serif, fontSize: 32, lineHeight: 1 }}>{d.totals.onTrack}</div>
        </Card>
        <Card>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Perlu tindak lanjut
          </div>
          <div
            style={{
              fontFamily: serif,
              fontSize: 32,
              lineHeight: 1,
              color: d.totals.needsFollowUp ? "#8d4632" : undefined,
            }}
          >
            {d.totals.needsFollowUp}
          </div>
        </Card>
        <Card>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Rata-rata progres
          </div>
          <div style={{ fontFamily: serif, fontSize: 32, lineHeight: 1 }}>{rata}%</div>
        </Card>
      </div>

      <div
        className="split"
        style={{ display: "grid", gridTemplateColumns: "1.25fr .85fr", gap: 22, alignItems: "start" }}
      >
        <div>
          <Card padding={22}>
            <CardTitle aside={`${d.needsFollowUp.length} peserta`}>
              Perlu pendampingan lebih dulu
            </CardTitle>
            {d.needsFollowUp.length === 0 ? (
              <EmptyState
                title="Tidak ada yang perlu pendampingan"
                hint="Seluruh peserta berada pada jalur yang wajar."
              />
            ) : (
              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                {d.needsFollowUp.map((p) => {
                  const tone = ENGAGEMENT_TONE[p.engagement] ?? ENGAGEMENT_TONE.inactive!;
                  return (
                    <div
                      key={p.userId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        alignItems: "center",
                        border: "1px solid var(--color-line)",
                        borderRadius: 9,
                        padding: "12px 14px",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 13, color: "var(--color-faint)", marginTop: 2 }}>
                          {p.email}
                          {p.className ? ` · ${p.className}` : ""}
                        </div>
                      </div>
                      <Badge bg={tone.bg} fg={tone.fg}>
                        {ENGAGEMENT_LABEL[p.engagement] ?? p.engagement}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <Link to="/admin/pengguna" className="btn-sm">
                Kelola pengguna →
              </Link>
            </div>
          </Card>

          <Card padding={22} style={{ marginTop: 20 }}>
            <CardTitle aside={`${(peserta.data ?? []).length} peserta`}>Progres peserta</CardTitle>
            {peserta.loading && (
              <div style={{ color: "var(--color-faint)", marginTop: 12 }}>Memuat…</div>
            )}
            {peserta.data && peserta.data.length === 0 && (
              <EmptyState title="Belum ada peserta terdaftar" />
            )}
            {peserta.data && peserta.data.length > 0 && (
              <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
                {peserta.data.slice(0, 8).map((p) => (
                  <div key={p.userId}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      <span
                        style={{ fontFamily: mono, fontSize: 13.5, color: "var(--color-faint)" }}
                      >
                        {p.progress}%
                      </span>
                    </div>
                    <Meter percent={p.progress} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card padding={22}>
            <CardTitle>Keterlibatan</CardTitle>
            <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
              {d.engagement.length === 0 && (
                <div style={{ color: "var(--color-faint)", fontSize: 15 }}>Belum ada data.</div>
              )}
              {d.engagement.map((e) => (
                <div
                  key={e.engagement}
                  style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
                >
                  <span>{ENGAGEMENT_LABEL[e.engagement] ?? e.engagement}</span>
                  <span style={{ fontFamily: mono, fontWeight: 700 }}>{e.n}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card padding={22} style={{ marginTop: 20 }}>
            <CardTitle>Capaian</CardTitle>
            <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
              {d.competency.length === 0 && (
                <div style={{ color: "var(--color-faint)", fontSize: 15 }}>
                  Belum ada capaian yang dinilai.
                </div>
              )}
              {d.competency.map((c) => (
                <div
                  key={c.competency ?? "belum"}
                  style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
                >
                  <span>
                    {c.competency ? COMPETENCY_LABEL[c.competency] ?? c.competency : "Belum dinilai"}
                  </span>
                  <span style={{ fontFamily: mono, fontWeight: 700 }}>{c.n}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card padding={22} style={{ marginTop: 20 }} tone="sand">
            <CardTitle>Pintasan</CardTitle>
            <div style={{ display: "grid", gap: 9, marginTop: 14 }}>
              <Link to="/admin/program" className="btn-sm">
                Portofolio kurikulum
              </Link>
              <Link to="/admin/kuis" className="btn-sm">
                Kuis &amp; ujian
              </Link>
              <Link to="/admin/pendaftaran" className="btn-sm">
                Pendaftaran
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
