import { Link } from "react-router";
import { useResource } from "../../lib/useApi";
import { Card, CardTitle, EmptyState, Meter, mono, serif } from "../../components/ui";
import { useAuth } from "../../lib/auth";

/**
 * Dasbor peserta — menjawab satu pertanyaan: "apa yang perlu saya kerjakan
 * sekarang?"
 *
 * Isinya berasal dari basis data, bukan lagi data contoh di kode. Progres
 * yang ditampilkan selalu caturwulan berjalan, tidak pernah seluruh
 * perjalanan TIA (01-PRODUCT-BRIEF.md §Progress dekat).
 */

type Mapel = {
  id: string;
  slug: string;
  name: string;
  role: string;
  deliveryModel: string | null;
  percent: number;
};

type Jadwal = {
  id: string;
  number: number;
  title: string;
  mode: string;
  startsAt: string | null;
  subjectName: string;
  subjectSlug: string;
};

type Pengumuman = { id: string; title: string; body: string; publishedAt: string | null };

type Dasbor = {
  tahapan: { id: string; name: string; title: string | null; durationWeeks: number };
  enrollment: { status: string; progress: number; className: string | null } | null;
  subjects: Mapel[];
  upcomingMeetings: Jadwal[];
  announcements: Pengumuman[];
  nextAction: {
    reason: string;
    subjectName: string;
    meetingNumber: number;
    title: string;
    detail: string;
    href: string;
  };
};

const PERAN_MAPEL: Record<string, string> = {
  INTENSIVE: "Intensif",
  FOUNDATION: "Fondasi",
  COMPANION: "Pendamping",
};

const MODE: Record<string, string> = {
  online: "Daring",
  offline: "Tatap muka",
  hybrid: "Hybrid",
  mandiri: "Mandiri",
};

const tanggal = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : null;

export default function Dashboard() {
  const { user } = useAuth();
  const d = useResource<Dasbor>("/me/dashboard");

  if (d.loading) {
    return (
      <div className="shell" style={{ paddingBlock: "40px 80px", color: "var(--color-faint)" }}>
        Memuat dasbor…
      </div>
    );
  }

  if (d.error || !d.data) {
    return (
      <div className="shell" style={{ paddingBlock: "40px 80px" }}>
        <EmptyState
          title="Dasbor belum dapat dimuat"
          hint={d.error ?? "Coba muat ulang halaman ini."}
        />
      </div>
    );
  }

  const data = d.data;
  const rata = data.subjects.length
    ? Math.round(data.subjects.reduce((a, s) => a + s.percent, 0) / data.subjects.length)
    : 0;

  return (
    <div className="shell" style={{ paddingBlock: "40px 80px" }}>
      <header
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 30,
          flexWrap: "wrap",
          marginBottom: 26,
        }}
      >
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Assalamu&apos;alaikum
          </div>
          <h1 style={{ fontSize: 36 }}>{user?.name}</h1>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "12px 18px",
            background: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 15, color: "var(--color-muted)" }}>{data.tahapan.name}</div>
          <div style={{ width: 1, height: 18, background: "var(--color-line)" }} />
          <div style={{ fontWeight: 700 }}>{rata}% selesai</div>
        </div>
      </header>

      {/* --- langkah berikutnya --- */}
      <Card padding={0} style={{ overflow: "hidden", marginBottom: 26 }}>
        <div style={{ background: "var(--color-forest)", color: "var(--color-paper)", padding: 26 }}>
          <div
            style={{
              fontFamily: mono,
              fontSize: 11.5,
              letterSpacing: ".14em",
              opacity: 0.75,
              marginBottom: 12,
            }}
          >
            LANGKAH BERIKUTNYA
          </div>
          <div style={{ fontFamily: serif, fontSize: 27, lineHeight: 1.25 }}>
            {data.nextAction.title}
          </div>
          {data.nextAction.detail && (
            <div style={{ fontSize: 16, opacity: 0.85, marginTop: 10 }}>
              {data.nextAction.detail}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            <Link
              to={data.nextAction.href}
              className="btn-solid-sm"
              style={{ background: "var(--color-paper)", color: "var(--color-forest)", borderColor: "var(--color-paper)" }}
            >
              Lanjutkan belajar →
            </Link>
            <Link
              to="/belajar/jadwal"
              className="btn-sm"
              style={{ color: "var(--color-paper)", borderColor: "rgba(246,242,234,.4)" }}
            >
              Lihat jadwal
            </Link>
          </div>
        </div>
      </Card>

      <div
        className="split"
        style={{ display: "grid", gridTemplateColumns: "1.35fr .95fr", gap: 26, alignItems: "start" }}
      >
        {/* --- progres per mata pelajaran --- */}
        <div>
          <Card padding={22}>
            <CardTitle aside={`${data.subjects.length} mata pelajaran`}>
              Progres caturwulan berjalan
            </CardTitle>
            {data.subjects.length === 0 ? (
              <EmptyState title="Belum ada mata pelajaran" />
            ) : (
              <div style={{ display: "grid", gap: 18, marginTop: 16 }}>
                {data.subjects.map((s) => (
                  <div key={s.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 7,
                        flexWrap: "wrap",
                      }}
                    >
                      <Link to={`/belajar/kelas/${s.slug}`} style={{ fontWeight: 600 }}>
                        {s.name}
                      </Link>
                      <span style={{ fontFamily: mono, fontSize: 13.5, color: "var(--color-faint)" }}>
                        {PERAN_MAPEL[s.role] ?? s.role} · {s.percent}%
                      </span>
                    </div>
                    <Meter percent={s.percent} />
                    {s.deliveryModel && (
                      <div style={{ fontSize: 13.5, color: "var(--color-faint)", marginTop: 6 }}>
                        {s.deliveryModel}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {data.announcements.length > 0 && (
            <Card padding={22} style={{ marginTop: 20 }}>
              <CardTitle>Pengumuman</CardTitle>
              <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
                {data.announcements.map((a) => (
                  <div
                    key={a.id}
                    style={{ borderLeft: "3px solid var(--color-line)", paddingLeft: 14 }}
                  >
                    <div style={{ fontWeight: 600, lineHeight: 1.4 }}>{a.title}</div>
                    <div
                      style={{
                        fontSize: 15,
                        lineHeight: 1.65,
                        color: "var(--color-muted)",
                        marginTop: 5,
                      }}
                    >
                      {a.body}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* --- jadwal terdekat --- */}
        <div>
          <Card padding={22}>
            <CardTitle>Jadwal terdekat</CardTitle>
            {data.upcomingMeetings.length === 0 ? (
              <EmptyState title="Belum ada jadwal" hint="Jadwal muncul setelah pengampu menetapkannya." />
            ) : (
              <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
                {data.upcomingMeetings.map((m) => (
                  <div
                    key={m.id}
                    style={{ border: "1px solid var(--color-line)", borderRadius: 9, padding: "13px 15px" }}
                  >
                    <div className="eyebrow" style={{ marginBottom: 5 }}>
                      {m.subjectName} · {MODE[m.mode] ?? m.mode}
                    </div>
                    <Link
                      to={`/belajar/kelas/${m.subjectSlug}/pertemuan/${m.number}`}
                      style={{ fontWeight: 600, lineHeight: 1.4 }}
                    >
                      Pertemuan {m.number}: {m.title}
                    </Link>
                    {m.startsAt && (
                      <div
                        style={{
                          fontFamily: mono,
                          fontSize: 13,
                          color: "var(--color-faint)",
                          marginTop: 6,
                        }}
                      >
                        {tanggal(m.startsAt)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card padding={22} style={{ marginTop: 20 }}>
            <CardTitle>Status pendaftaran</CardTitle>
            <div style={{ marginTop: 12, fontSize: 15.5, lineHeight: 1.7 }}>
              {data.enrollment ? (
                <>
                  <div>
                    Status: <strong>{data.enrollment.status}</strong>
                  </div>
                  {data.enrollment.className && <div>Kelas: {data.enrollment.className}</div>}
                  <div style={{ marginTop: 10 }}>
                    <Meter percent={data.enrollment.progress} label="Progres tercatat" />
                  </div>
                </>
              ) : (
                <span style={{ color: "var(--color-faint)" }}>
                  Anda belum terdaftar pada caturwulan ini.
                </span>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
