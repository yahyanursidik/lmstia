import { useState } from "react";
import { Link } from "react-router";
import * as repo from "../../domain/repository";
import { CURRENT_WEEK } from "../../domain/repository";
import {
  COMPETENCY_TONE,
  ENGAGEMENT_LABEL,
  ENGAGEMENT_TONE,
  type Announcement,
  type Instructor,
  type Participant,
  type Registration,
} from "../../domain/types";
import {
  Badge,
  Card,
  CardTitle,
  DataTable,
  EmptyState,
  Meter,
  PageHeader,
  mono,
  serif,
  type Column,
} from "../../components/ui";

/* --- /admin/peserta --------------------------------------------- */

export function Peserta() {
  const [filter, setFilter] = useState<"semua" | "perlu">("semua");
  const all = repo.allParticipants();
  const rows = filter === "semua" ? all : repo.needsFollowUp();

  const columns: Column<Participant>[] = [
    {
      key: "nama",
      head: "PESERTA",
      width: "1.5fr",
      render: (p) => (
        <div>
          <div style={{ fontWeight: 700 }}>{p.name}</div>
          <div style={{ fontSize: 13, color: "var(--color-faint)", marginTop: 2 }}>{p.email}</div>
        </div>
      ),
    },
    { key: "kelas", head: "KELAS", width: ".8fr", secondary: true, render: (p) => <span style={{ fontSize: 14.5, color: "var(--color-muted)" }}>{p.className}</span> },
    { key: "segmen", head: "SEGMEN", width: "1fr", secondary: true, render: (p) => <span style={{ fontSize: 14.5, color: "var(--color-muted)" }}>{p.segment}</span> },
    { key: "hadir", head: "KEHADIRAN", width: ".8fr", secondary: true, render: (p) => <span style={{ fontFamily: mono, fontSize: 14.5 }}>{p.attendance}</span> },
    {
      key: "capaian",
      head: "CAPAIAN",
      width: "1.1fr",
      render: (p) => (
        <Badge bg={COMPETENCY_TONE[p.competency].bg} fg={COMPETENCY_TONE[p.competency].fg}>
          {p.competency}
        </Badge>
      ),
    },
    {
      key: "status",
      head: "KETERLIBATAN",
      width: "1.1fr",
      secondary: true,
      render: (p) => (
        <Badge bg={ENGAGEMENT_TONE[p.engagement].bg} fg={ENGAGEMENT_TONE[p.engagement].fg}>
          {ENGAGEMENT_LABEL[p.engagement]}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={repo.activeTerm.name}
        title="Peserta"
        lead="Daftar peserta caturwulan berjalan beserta capaian dan status keterlibatannya."
        actions={
          <>
            <button type="button" className={filter === "semua" ? "btn-solid-sm" : "btn-sm"} onClick={() => setFilter("semua")}>
              Semua peserta
            </button>
            <button type="button" className={filter === "perlu" ? "btn-solid-sm" : "btn-sm"} onClick={() => setFilter("perlu")}>
              Perlu tindak lanjut
            </button>
          </>
        }
      />
      <DataTable columns={columns} rows={rows} empty="Tidak ada peserta pada filter ini." />
      <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 14, lineHeight: 1.6 }}>
        Aturan peringatan dini: 7 hari tanpa aktivitas → perlu perhatian; 14 hari tanpa aktivitas atau tertinggal ≥ 2
        pekan → berisiko tertinggal.
      </div>
    </>
  );
}

/* --- /admin/pendaftaran ------------------------------------------ */

export function Pendaftaran() {
  const rows = repo.allRegistrations();
  const tone = {
    menunggu: { bg: "#f6eddb", fg: "#8a6a25" },
    disetujui: { bg: "#e6ede7", fg: "#1f3d34" },
    ditolak: { bg: "#f7e6e0", fg: "#8d4632" },
  } as const;

  const columns: Column<Registration>[] = [
    {
      key: "nama",
      head: "PENDAFTAR",
      width: "1.5fr",
      render: (r) => (
        <div>
          <div style={{ fontWeight: 700 }}>{r.name}</div>
          <div style={{ fontSize: 13, color: "var(--color-faint)", marginTop: 2 }}>{r.email}</div>
        </div>
      ),
    },
    { key: "segmen", head: "SEGMEN", width: "1fr", secondary: true, render: (r) => <span style={{ fontSize: 14.5, color: "var(--color-muted)" }}>{r.segment}</span> },
    { key: "tgl", head: "DIKIRIM", width: "1fr", secondary: true, render: (r) => <span style={{ fontFamily: mono, fontSize: 14 }}>{r.submittedAt}</span> },
    {
      key: "status",
      head: "STATUS",
      width: "1fr",
      render: (r) => (
        <Badge bg={tone[r.status].bg} fg={tone[r.status].fg}>
          {r.status}
        </Badge>
      ),
    },
    {
      key: "aksi",
      head: "AKSI",
      width: "150px",
      secondary: true,
      render: (r) =>
        r.status === "menunggu" ? (
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" className="btn-solid-sm" style={{ padding: "6px 10px", fontSize: 13 }}>
              Setujui
            </button>
            <button type="button" className="btn-sm" style={{ padding: "6px 10px", fontSize: 13 }}>
              Tolak
            </button>
          </div>
        ) : (
          <span style={{ fontSize: 14, color: "var(--color-faint)" }}>—</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={repo.activeTerm.name}
        title="Pendaftaran"
        lead="Persetujuan dilakukan per caturwulan. Menyetujui pendaftaran tidak mendaftarkan peserta ke caturwulan berikutnya."
      />
      <DataTable columns={columns} rows={rows} empty="Belum ada pendaftaran masuk." />
    </>
  );
}

/* --- /admin/kehadiran --------------------------------------------- */

export function Kehadiran() {
  const participants = repo.allParticipants();
  const columns: Column<Participant>[] = [
    { key: "nama", head: "PESERTA", width: "1.5fr", render: (p) => <span style={{ fontWeight: 700 }}>{p.name}</span> },
    { key: "kelas", head: "KELAS", width: "1fr", secondary: true, render: (p) => <span style={{ fontSize: 14.5, color: "var(--color-muted)" }}>{p.className}</span> },
    { key: "hadir", head: "KEHADIRAN", width: "1fr", render: (p) => <span style={{ fontFamily: mono, fontSize: 15 }}>{p.attendance}</span> },
    {
      key: "bar",
      head: "PERSENTASE",
      width: "1.4fr",
      secondary: true,
      render: (p) => {
        const [a, b] = p.attendance.split("/").map(Number);
        return <Meter percent={Math.round((a / b) * 100)} label={`Kehadiran ${p.name}`} />;
      },
    },
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
  ];
  return (
    <>
      <PageHeader
        eyebrow={`${repo.activeTerm.name} · Pekan ${CURRENT_WEEK}`}
        title="Kehadiran"
        lead="Rekap kehadiran kelas Bahasa Arab sampai pekan berjalan."
      />
      <DataTable columns={columns} rows={participants} empty="Belum ada data kehadiran." />
    </>
  );
}

/* --- /admin/nilai ------------------------------------------------- */

export function Nilai() {
  const participants = repo.allParticipants();
  const columns: Column<Participant>[] = [
    { key: "nama", head: "PESERTA", width: "1.5fr", render: (p) => <span style={{ fontWeight: 700 }}>{p.name}</span> },
    { key: "hadir", head: "KEHADIRAN 20%", width: "1fr", secondary: true, render: (p) => <span style={{ fontFamily: mono, fontSize: 14.5 }}>{p.attendance}</span> },
    { key: "latihan", head: "LATIHAN 30%", width: "1fr", secondary: true, render: (p) => <span style={{ fontFamily: mono, fontSize: 14.5 }}>{p.exercises}</span> },
    {
      key: "capaian",
      head: "KATEGORI",
      width: "1.2fr",
      render: (p) => (
        <Badge bg={COMPETENCY_TONE[p.competency].bg} fg={COMPETENCY_TONE[p.competency].fg}>
          {p.competency}
        </Badge>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow={repo.activeTerm.name}
        title="Nilai"
        lead="Bobot: kehadiran 20% · latihan & worksheet 30% · kuis 20% · evaluasi akhir 30%."
        actions={
          <button type="button" className="btn-sm">
            Ekspor CSV
          </button>
        }
      />
      <DataTable columns={columns} rows={participants} empty="Belum ada nilai tercatat." />
    </>
  );
}

/* --- /admin/worksheet & /admin/quiz -------------------------------- */

function AssessmentList({ kind }: { kind: "worksheet" | "quiz" }) {
  const label = kind === "worksheet" ? "Worksheet" : "Quiz";
  const type = kind === "worksheet" ? "worksheet" : "quiz";
  const items = repo
    .allCourses()
    .flatMap((c) =>
      repo
        .weeksOf(c.id)
        .flatMap((w) => repo.lessonsOf(w.id).filter((l) => l.type === type).map((l) => ({ c, w, l }))),
    )
    .slice(0, 14);

  return (
    <>
      <PageHeader
        eyebrow={repo.activeTerm.name}
        title={label}
        lead={
          kind === "worksheet"
            ? "Worksheet menghubungkan materi antarmata pelajaran dalam satu tema pekanan."
            : "Cek pemahaman bersifat formatif — untuk melihat bagian mana yang perlu murojaah, bukan menghakimi."
        }
        actions={
          <button type="button" className="btn-solid-sm">
            Tambah {label.toLowerCase()}
          </button>
        }
      />
      {items.length === 0 ? (
        <EmptyState title={`Belum ada ${label.toLowerCase()}`} />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map(({ c, w, l }) => (
            <Card key={l.id} padding={18}>
              <div className="split" style={{ display: "grid", gridTemplateColumns: "160px 1fr 120px", gap: 16, alignItems: "center" }}>
                <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>
                  {c.code} · PEKAN {w.number}
                </div>
                <div style={{ fontSize: 16, minWidth: 0 }}>{w.title}</div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Badge
                    bg={l.publishStatus === "published" ? "#e6ede7" : l.publishStatus === "review" ? "#f6eddb" : "#ecebe6"}
                    fg={l.publishStatus === "published" ? "#1f3d34" : l.publishStatus === "review" ? "#8a6a25" : "#6d675e"}
                  >
                    {l.publishStatus === "published" ? "Terbit" : l.publishStatus === "review" ? "Review" : "Draf"}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export const Worksheet = () => <AssessmentList kind="worksheet" />;
export const Quiz = () => <AssessmentList kind="quiz" />;

/* --- /admin/pengajar ----------------------------------------------- */

export function PengajarAdmin() {
  const rows = repo.allInstructors();
  const columns: Column<Instructor>[] = [
    {
      key: "nama",
      head: "PENGAJAR",
      width: "1.5fr",
      render: (i) => (
        <div>
          <div style={{ fontWeight: 700 }}>{i.name}</div>
          <div style={{ fontSize: 13, color: "var(--color-faint)", marginTop: 2 }}>{i.title}</div>
        </div>
      ),
    },
    { key: "fokus", head: "FOKUS", width: "1fr", secondary: true, render: (i) => <span style={{ fontSize: 14.5, color: "var(--color-muted)" }}>{i.focus}</span> },
    {
      key: "kelas",
      head: "MATA PELAJARAN",
      width: "1.4fr",
      secondary: true,
      render: (i) => (
        <span style={{ fontSize: 14.5 }}>{repo.allCourses().find((c) => c.instructorId === i.id)?.name ?? "—"}</span>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Orang"
        title="Pengajar"
        lead="Pengajar mengampu kelas, memeriksa latihan, memberi umpan balik, dan mencatat kehadiran."
        actions={
          <button type="button" className="btn-solid-sm">
            Tambah pengajar
          </button>
        }
      />
      <DataTable columns={columns} rows={rows} empty="Belum ada pengajar." />
    </>
  );
}

/* --- /admin/pengumuman --------------------------------------------- */

export function Pengumuman() {
  const rows = repo.allAnnouncements();
  const columns: Column<Announcement>[] = [
    {
      key: "judul",
      head: "PENGUMUMAN",
      width: "2fr",
      render: (a) => (
        <div>
          <div style={{ fontWeight: 700 }}>{a.title}</div>
          <div style={{ fontSize: 14, color: "var(--color-muted)", marginTop: 4, lineHeight: 1.5 }}>{a.body}</div>
        </div>
      ),
    },
    { key: "audience", head: "PENERIMA", width: ".8fr", secondary: true, render: (a) => <span style={{ fontSize: 14.5 }}>{a.audience}</span> },
    { key: "tgl", head: "TERBIT", width: "1fr", secondary: true, render: (a) => <span style={{ fontFamily: mono, fontSize: 14 }}>{a.publishedAt}</span> },
    {
      key: "status",
      head: "STATUS",
      width: ".9fr",
      render: (a) => (
        <Badge
          bg={a.status === "published" ? "#e6ede7" : a.status === "review" ? "#f6eddb" : "#ecebe6"}
          fg={a.status === "published" ? "#1f3d34" : a.status === "review" ? "#8a6a25" : "#6d675e"}
        >
          {a.status === "published" ? "Terbit" : a.status === "review" ? "Review" : "Draf"}
        </Badge>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Orang"
        title="Pengumuman"
        actions={
          <button type="button" className="btn-solid-sm">
            Tulis pengumuman
          </button>
        }
      />
      <DataTable columns={columns} rows={rows} empty="Belum ada pengumuman." />
    </>
  );
}

/* --- /admin/laporan ------------------------------------------------- */

export function Laporan() {
  const kpi = repo.adminKpi();
  const breakdown = repo.competencyBreakdown();
  return (
    <>
      <PageHeader
        eyebrow={repo.activeTerm.name}
        title="Laporan"
        lead="Ringkasan caturwulan berjalan untuk tim akademik."
        actions={
          <button type="button" className="btn-sm">
            Ekspor CSV
          </button>
        }
      />
      <div className="quad" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        {[
          { k: "PESERTA TERDAFTAR", v: String(kpi.total) },
          { k: "SESUAI JALUR", v: String(kpi.active) },
          { k: "PERLU PENDAMPINGAN", v: String(kpi.risk) },
          { k: "PEKAN BERJALAN", v: `${CURRENT_WEEK}/12` },
        ].map((x) => (
          <Card key={x.k} padding={20}>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".11em", color: "var(--color-soft)" }}>{x.k}</div>
            <div style={{ fontFamily: serif, fontSize: 34, lineHeight: 1.1, marginTop: 12 }}>{x.v}</div>
          </Card>
        ))}
      </div>

      <Card style={{ marginBottom: 20 }}>
        <CardTitle>Kategori hasil belajar</CardTitle>
        {breakdown.map((g) => (
          <div key={g.nama} style={{ padding: "14px 0", borderTop: "1px solid var(--color-line-soft)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, fontSize: 15.5, marginBottom: 8 }}>
              <span style={{ fontWeight: 700 }}>{g.nama}</span>
              <span style={{ fontFamily: mono, fontSize: 14, color: "var(--color-muted)" }}>
                {g.n} peserta · {g.pct}%
              </span>
            </div>
            <Meter percent={g.pct} label={g.nama} />
          </div>
        ))}
      </Card>

      <Card tone="sand">
        <div style={{ fontSize: 15.5, lineHeight: 1.65, color: "var(--color-body)" }}>
          Laporan akhir caturwulan memuat ringkasan penyelesaian, capaian per mata pelajaran, kompetensi yang sudah
          dikuasai, materi yang perlu dimurojaah, umpan balik pengajar, rekomendasi tindak lanjut, dan status kelayakan
          syahadah.
        </div>
        <div style={{ marginTop: 16 }}>
          <Link to="/admin/nilai" className="btn-sm">
            Lihat rekap nilai
          </Link>
        </div>
      </Card>
    </>
  );
}
