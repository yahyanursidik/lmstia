import { useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "../../lib/api";
import { mutate, useResource } from "../../lib/useApi";
import { Badge, Card, EmptyState, StepMark, mono, serif } from "../../components/ui";
import { MaterialRow, type MaterialType } from "../../components/MaterialPreview";

/**
 * Unit belajar satu pertemuan.
 *
 * Halaman ini dulu membaca data contoh yang ditulis di kode, sehingga materi
 * yang dimasukkan admin — termasuk tautan rekaman — tidak pernah sampai ke
 * peserta. Sekarang seluruh isinya berasal dari basis data.
 */

type Materi = {
  id: string;
  title: string;
  description: string | null;
  type: MaterialType;
  url: string | null;
  content: string | null;
  durationMinutes: number;
  isEssential: boolean;
  sequence: number;
  status: "not_started" | "in_progress" | "completed" | "needs_review";
};

type Kuis = { id: string; title: string; kind: string; kkm: number; durationMinutes: number };

type Unit = {
  subject: { id: string; name: string; slug: string; code: string };
  meeting: {
    id: string;
    number: number;
    title: string;
    description: string | null;
    type: string;
    mode: string;
    liveUrl: string | null;
    livePlatform: string | null;
    location: string | null;
    startsAt: string | null;
    durationMinutes: number;
  };
  locked: boolean;
  materials: Materi[];
  assessments: Kuis[];
  nav: { prev: number | null; next: number | null; total: number; urutan: number };
  selesai: number;
};

const TIPE_PERTEMUAN: Record<string, string> = {
  ORIENTATION: "Orientasi",
  REGULAR: "Pembelajaran",
  REVIEW: "Murojaah",
  ASSESSMENT: "Evaluasi",
  PRACTICE: "Latihan",
  BREAK: "Jeda",
};

const MODE: Record<string, string> = {
  online: "Daring",
  offline: "Tatap muka",
  hybrid: "Hybrid",
  mandiri: "Mandiri",
};

const waktu = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })
    : null;

export default function UnitBelajar() {
  const { courseSlug, week } = useParams();
  const unit = useResource<Unit>(
    courseSlug && week ? `/me/kelas/${courseSlug}/pertemuan/${week}` : null,
  );
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  async function tandaiSelesai(m: Materi) {
    setSibuk(m.id);
    const jalur = m.status === "completed" ? "start" : "complete";
    const pesan = await mutate(() => api.post(`/materials/${m.id}/${jalur}`));
    setSibuk(null);
    if (pesan) return setGalat(pesan);
    setGalat(null);
    unit.reload();
  }

  if (unit.loading) {
    return (
      <div className="shell" style={{ paddingBlock: "40px 80px", color: "var(--color-faint)" }}>
        Memuat pertemuan…
      </div>
    );
  }

  if (unit.error || !unit.data) {
    return (
      <div className="shell" style={{ paddingBlock: "40px 80px" }}>
        <EmptyState
          title="Unit tidak ditemukan"
          hint="Periksa kembali mata pelajaran dan pertemuan yang Anda buka."
        />
        <div style={{ marginTop: 20 }}>
          <Link to="/belajar/dashboard" className="btn-sm">
            Kembali ke dasbor
          </Link>
        </div>
      </div>
    );
  }

  const d = unit.data;
  const { meeting: p, subject: s } = d;

  if (d.locked) {
    return (
      <div className="shell" style={{ paddingBlock: "40px 80px" }}>
        <EmptyState
          title={`Pertemuan ${p.number} belum dibuka`}
          hint="Materi lanjutan dibuka bertahap setelah fondasi pertemuan sebelumnya cukup. Selesaikan pertemuan yang sedang berjalan terlebih dahulu."
        />
        <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to={`/belajar/kelas/${s.slug}`} className="btn-solid-sm">
            Lihat semua pertemuan
          </Link>
          <Link to="/belajar/dashboard" className="btn-sm">
            Kembali ke dasbor
          </Link>
        </div>
      </div>
    );
  }

  const total = d.materials.length;
  const berikutnya = d.materials.find((m) => m.status !== "completed");

  return (
    <div className="shell" style={{ paddingBlock: "28px 80px" }}>
      <nav
        aria-label="Breadcrumb"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          fontSize: 14.5,
          color: "#807a70",
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <Link to="/belajar/dashboard" style={{ color: "var(--color-forest)", fontWeight: 600 }}>
          Dasbor
        </Link>
        <span style={{ color: "#c9c1b2" }}>/</span>
        <Link to={`/belajar/kelas/${s.slug}`}>{s.name}</Link>
        <span style={{ color: "#c9c1b2" }}>/</span>
        <span style={{ color: "var(--color-ink)", fontWeight: 600 }}>Pertemuan {p.number}</span>
      </nav>

      <div
        className="unit-layout"
        style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 28, alignItems: "start" }}
      >
        {/* --- rel kiri: daftar bagian --- */}
        <aside
          className="unit-rail"
          style={{ position: "sticky", top: 80, display: "flex", flexDirection: "column", gap: 16 }}
        >
          <Card padding={8}>
            <div style={{ padding: "14px 16px 12px" }}>
              <div className="eyebrow">
                Pertemuan {p.number} · {TIPE_PERTEMUAN[p.type] ?? p.type}
              </div>
              <div style={{ fontFamily: serif, fontSize: 19, lineHeight: 1.25, marginTop: 6 }}>
                {p.title}
              </div>
              <div style={{ fontSize: 14, color: "var(--color-soft)", marginTop: 6 }}>
                {d.selesai} dari {total} bagian selesai
              </div>
            </div>

            {d.materials.map((m) => {
              const selesai = m.status === "completed";
              const kini = !selesai && berikutnya?.id === m.id;
              return (
                <a
                  key={m.id}
                  href={`#materi-${m.id}`}
                  aria-current={kini ? "step" : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 16px",
                    fontSize: 15,
                    color: selesai ? "var(--color-soft)" : "var(--color-ink)",
                    background: kini ? "var(--color-paper)" : "transparent",
                    borderLeft: kini ? "3px solid var(--color-forest)" : "3px solid transparent",
                  }}
                >
                  <StepMark done={selesai} current={kini} />
                  <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.title}
                  </span>
                </a>
              );
            })}
          </Card>

          {(p.liveUrl || p.startsAt || p.location) && (
            <Card padding={18}>
              <div className="eyebrow" style={{ marginBottom: 9 }}>
                Kelas {MODE[p.mode] ?? p.mode}
              </div>
              {p.startsAt && (
                <div style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--color-body)" }}>
                  {waktu(p.startsAt)}
                </div>
              )}
              {p.location && (
                <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 4 }}>
                  {p.location}
                </div>
              )}
              {p.liveUrl && (
                <a
                  href={p.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-solid-sm"
                  style={{ display: "inline-block", marginTop: 12 }}
                >
                  Masuk kelas{p.livePlatform ? ` (${p.livePlatform})` : ""} →
                </a>
              )}
            </Card>
          )}
        </aside>

        {/* --- isi utama --- */}
        <div style={{ minWidth: 0 }}>
          {p.description && (
            <Card padding={22} style={{ marginBottom: 20 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                Tentang pertemuan ini
              </div>
              <div style={{ fontSize: 16.5, lineHeight: 1.75, color: "var(--color-body)" }}>
                {p.description}
              </div>
            </Card>
          )}

          {galat && (
            <div
              role="alert"
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                background: "#f7e6e0",
                border: "1px solid #e8cdc3",
                borderRadius: 8,
                fontSize: 15,
                color: "#8d4632",
              }}
            >
              {galat}
            </div>
          )}

          {total === 0 ? (
            <EmptyState
              title="Belum ada materi pada pertemuan ini"
              hint="Materi akan muncul setelah pengampu menerbitkannya."
            />
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {d.materials.map((m) => (
                <div key={m.id} id={`materi-${m.id}`} style={{ scrollMarginTop: 90 }}>
                  <MaterialRow
                    title={m.title}
                    type={m.type}
                    url={m.url}
                    content={m.content}
                    durationMinutes={m.durationMinutes}
                    isEssential={m.isEssential}
                    publishStatus="published"
                    actions={
                      <button
                        type="button"
                        className={m.status === "completed" ? "btn-sm" : "btn-solid-sm"}
                        disabled={sibuk === m.id}
                        onClick={() => tandaiSelesai(m)}
                        style={{ opacity: sibuk === m.id ? 0.6 : 1 }}
                      >
                        {sibuk === m.id
                          ? "Menyimpan…"
                          : m.status === "completed"
                            ? "✓ Selesai"
                            : "Tandai selesai"}
                      </button>
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {d.assessments.length > 0 && (
            <Card padding={22} style={{ marginTop: 22 }}>
              <div className="eyebrow" style={{ marginBottom: 12 }}>
                Kuis & Ujian
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {d.assessments.map((k) => (
                  <div
                    key={k.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 14,
                      flexWrap: "wrap",
                      border: "1px solid var(--color-line)",
                      borderRadius: 9,
                      padding: "13px 15px",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{k.title}</div>
                      <div style={{ fontSize: 13.5, color: "var(--color-faint)", marginTop: 3 }}>
                        <Badge bg="#f6eddb" fg="#8a6a25">
                          {k.kind}
                        </Badge>{" "}
                        <span style={{ fontFamily: mono }}>
                          KKM {k.kkm}
                          {k.durationMinutes ? ` · ${k.durationMinutes} menit` : ""}
                        </span>
                      </div>
                    </div>
                    <Link to={`/belajar/kuis/${k.id}`} className="btn-solid-sm">
                      Kerjakan →
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* --- navigasi antar pertemuan --- */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 26,
              paddingTop: 20,
              borderTop: "1px solid var(--color-line)",
            }}
          >
            {d.nav.prev !== null ? (
              <Link to={`/belajar/kelas/${s.slug}/pertemuan/${d.nav.prev}`} className="btn-sm">
                ← Pertemuan {d.nav.prev}
              </Link>
            ) : (
              <span />
            )}
            <span style={{ fontFamily: mono, fontSize: 13.5, color: "var(--color-faint)" }}>
              {d.nav.urutan} / {d.nav.total}
            </span>
            {d.nav.next !== null ? (
              <Link to={`/belajar/kelas/${s.slug}/pertemuan/${d.nav.next}`} className="btn-solid-sm">
                Pertemuan {d.nav.next} →
              </Link>
            ) : (
              <span />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
