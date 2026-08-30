import { Link } from "react-router";
import * as repo from "../../domain/repository";
import { CURRENT_WEEK, TOTAL_WEEKS } from "../../domain/repository";
import { COMPETENCY_TONE, ENGAGEMENT_LABEL, ENGAGEMENT_TONE } from "../../domain/types";
import { Badge, Card, CardTitle, DataTable, PageHeader, mono, serif, type Column } from "../../components/ui";
import type { Participant } from "../../domain/types";

/** Bars scale from attendance %; the trailing bar is exercise completion. */
const SCALE = 1.45;
const SCALE_2 = 1.35;

function Chart() {
  const data = repo.engagementByWeek();
  return (
    <div className="chart-scroll">
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 170 }}>
        {data.map((h, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ width: "100%", display: "flex", gap: 2, alignItems: "flex-end", height: 150 }}>
              <div
                style={{
                  flex: 1,
                  borderRadius: "3px 3px 0 0",
                  background: "var(--color-forest)",
                  height: h ? Math.round(h * SCALE) : 3,
                }}
              />
              <div
                style={{
                  flex: 1,
                  borderRadius: "3px 3px 0 0",
                  background: "var(--color-sage)",
                  height: h ? Math.round((h - 12) * SCALE_2) : 3,
                }}
              />
            </div>
            <div style={{ fontFamily: mono, fontSize: 11, color: "var(--color-faint)" }}>P{i + 1}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const kpi = repo.adminKpi();
  const breakdown = repo.competencyBreakdown();
  const followUp = repo.needsFollowUp();
  const readiness = repo.contentReadiness().filter((r) => r.course.id === "co-arab");

  const cards = [
    { label: "PESERTA AKTIF", nilai: String(kpi.active), delta: `dari ${kpi.total} terdaftar`, tone: "#807a70" },
    { label: "KEHADIRAN PERTEMUAN 8", nilai: "86%", delta: "+4% dari pekan lalu", tone: "var(--color-forest)" },
    { label: "PERLU PENDAMPINGAN", nilai: String(kpi.risk), delta: "tindak lanjut diperlukan", tone: "var(--color-amber)" },
    { label: "PENDAFTARAN BARU", nilai: String(kpi.pendingReg), delta: "menunggu persetujuan", tone: "var(--color-amber)" },
  ];

  const columns: Column<Participant>[] = [
    {
      key: "nama",
      head: "PESERTA",
      width: "1.4fr",
      render: (p) => (
        <div>
          <div style={{ fontWeight: 700 }}>{p.name}</div>
          <div style={{ fontSize: 13, color: "var(--color-faint)", marginTop: 2 }}>{p.className}</div>
        </div>
      ),
    },
    { key: "segmen", head: "SEGMEN", width: ".9fr", secondary: true, render: (p) => <span style={{ color: "var(--color-muted)", fontSize: 14.5 }}>{p.segment}</span> },
    { key: "hadir", head: "KEHADIRAN", width: ".8fr", secondary: true, render: (p) => <span style={{ fontFamily: mono, fontSize: 14.5 }}>{p.attendance}</span> },
    { key: "latihan", head: "LATIHAN", width: ".8fr", secondary: true, render: (p) => <span style={{ fontFamily: mono, fontSize: 14.5 }}>{p.exercises}</span> },
    {
      key: "status",
      head: "STATUS",
      width: "1.1fr",
      render: (p) => (
        <Badge bg={ENGAGEMENT_TONE[p.engagement].bg} fg={ENGAGEMENT_TONE[p.engagement].fg}>
          {ENGAGEMENT_LABEL[p.engagement]}
        </Badge>
      ),
    },
    {
      key: "aksi",
      head: "AKSI",
      width: "120px",
      secondary: true,
      render: () => (
        <button type="button" className="btn-sm" style={{ padding: "7px 12px", fontSize: 14 }}>
          Kirim jalur
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={`Marhalah I'dad · ${repo.activeTerm.name}`}
        title="Keberlangsungan Belajar"
        actions={
          <>
            <Link to="/admin/laporan" className="btn-sm">
              Ekspor laporan cawu
            </Link>
            <Link to="/admin/pendaftaran" className="btn-solid-sm">
              Buka registrasi Cawu 2
            </Link>
          </>
        }
      />

      <div className="kpi-grid quad" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        {cards.map((k) => (
          <Card key={k.label} padding={20}>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".11em", color: "var(--color-soft)" }}>
              {k.label}
            </div>
            <div style={{ fontFamily: serif, fontSize: 36, lineHeight: 1.1, marginTop: 12 }}>{k.nilai}</div>
            <div style={{ fontSize: 14.5, color: k.tone, marginTop: 8 }}>{k.delta}</div>
          </Card>
        ))}
      </div>

      <div className="split" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, marginBottom: 20 }}>
        <Card>
          <CardTitle aside="Kehadiran & penyelesaian latihan">Keterlibatan per Pertemuan</CardTitle>
          <Chart />
          <div
            style={{
              display: "flex",
              gap: 20,
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid var(--color-line-soft)",
              fontSize: 14,
              color: "var(--color-muted)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: "var(--color-forest)" }} />
              Kehadiran
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: "var(--color-sage)" }} />
              Latihan &amp; worksheet
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle aside={`${repo.allParticipants().length} peserta · ${repo.activeTerm.name}`}>
            Kategori Hasil Belajar
          </CardTitle>
          {breakdown.map((g) => (
            <div key={g.nama} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 15.5, marginBottom: 8, gap: 12 }}>
                <span style={{ fontWeight: 700 }}>{g.nama}</span>
                <span style={{ fontFamily: mono, fontSize: 14, color: "var(--color-muted)" }}>{g.n} peserta</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "#ece6da", overflow: "hidden" }}>
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: COMPETENCY_TONE[g.nama].fg,
                    width: `${g.pct}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div style={{ marginBottom: 20 }}>
        <CardTitle aside={`${followUp.length} peserta`}>Peserta yang Perlu Pendampingan</CardTitle>
        <DataTable
          columns={columns}
          rows={followUp}
          empty="Tidak ada peserta yang perlu pendampingan pertemuan ini."
        />
        <div style={{ fontSize: 14.5, color: "#5c564d", lineHeight: 1.55, marginTop: 12 }}>
          Peserta berstatus <strong>Perlu perhatian</strong> atau <strong>Berisiko tertinggal</strong> otomatis
          ditawarkan Jalur Mengejar Ketertinggalan: 1 video inti, 1 PDF ringkas, 1 latihan wajib, 1 cek pemahaman.
        </div>
      </div>

      <div className="split-even" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card>
          <CardTitle>Kesiapan Konten Pertemuan {CURRENT_WEEK + 1}–{TOTAL_WEEKS}</CardTitle>
          {readiness.map((r) => (
            <div
              key={r.week.id}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderTop: "1px solid var(--color-line-soft)" }}
            >
              <div style={{ width: 62, flex: "none", fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>
                PERTEMUAN {r.week.number}
              </div>
              <div style={{ flex: 1, fontSize: 15.5, minWidth: 0 }}>{r.week.title}</div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  color:
                    r.status === "published"
                      ? "var(--color-forest)"
                      : r.status === "review"
                        ? "#8a6a25"
                        : "#8d4632",
                }}
              >
                {r.status === "published" ? "Siap" : r.status === "review" ? "Perlu review" : "Draf"}
              </div>
            </div>
          ))}
        </Card>

        <Card tone="forest">
          <div className="eyebrow eyebrow-on-dark" style={{ marginBottom: 14 }}>
            Penutupan caturwulan
          </div>
          <div style={{ fontFamily: serif, fontSize: 23, lineHeight: 1.3 }}>
            Materi Inti → Pertemuan Murojaah → Evaluasi Akhir → Umpan Balik
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 11,
              marginTop: 22,
              paddingTop: 20,
              borderTop: "1px solid rgba(238,242,238,.16)",
              fontSize: 15.5,
            }}
          >
            {[
              ["Kehadiran & keterlibatan", "20%"],
              ["Latihan & worksheet", "30%"],
              ["Quiz / cek pemahaman", "20%"],
              ["Evaluasi akhir", "30%"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                <span style={{ color: "rgba(238,242,238,.7)" }}>{k}</span>
                <span style={{ fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
          <button type="button" className="btn-light" style={{ marginTop: 24 }}>
            Terbitkan Syahadah Cawu 1
          </button>
        </Card>
      </div>
    </>
  );
}
