import { Link, useParams } from "react-router";
import * as repo from "../../domain/repository";
import { LESSON_TYPE_LABEL, WEEK_TYPE_LABEL } from "../../domain/types";
import { Badge, Card, EmptyState, StepMark, mono, serif } from "../../components/ui";

/**
 * Unit belajar — the seven-part weekly structure from the brief §8.5.
 * Locked weeks are refused here too, not only hidden in navigation.
 */

const KOSAKATA = [
  { ar: "الله", tr: "Allāh", id: "Allah" },
  { ar: "رَبّ", tr: "Rabb", id: "Tuhan" },
  { ar: "عَبْد", tr: "'abd", id: "Hamba" },
  { ar: "عِبَادَة", tr: "'ibādah", id: "Ibadah" },
  { ar: "نِيَّة", tr: "niyyah", id: "Niat" },
];

const TUJUAN = [
  "Membaca dan menulis kalimat Arab sederhana.",
  "Mengenali kosakata inti tentang ibadah.",
  "Menghubungkan makna niat dengan tauhid.",
];

const WORKSHEET_SOAL = [
  "“Mengapa ibadah harus ditujukan hanya kepada Allah?”",
  "“Apa hubungan niat dengan tauhid?”",
];

export default function UnitBelajar() {
  const { courseSlug, week } = useParams();
  const course = courseSlug ? repo.courseBySlug(courseSlug) : undefined;
  const weekNo = Number(week ?? NaN);
  const wk = course && Number.isFinite(weekNo) ? repo.weekOf(course.id, weekNo) : undefined;

  if (!course || !wk) {
    return (
      <div className="shell" style={{ paddingBlock: "40px 80px" }}>
        <EmptyState title="Unit tidak ditemukan" hint="Periksa kembali mata pelajaran dan pekan yang Anda buka." />
        <div style={{ marginTop: 20 }}>
          <Link to="/belajar/dashboard" className="btn-sm">
            Kembali ke dasbor
          </Link>
        </div>
      </div>
    );
  }

  if (wk.locked) {
    return (
      <div className="shell" style={{ paddingBlock: "40px 80px" }}>
        <EmptyState
          title={`Pekan ${wk.number} belum dibuka`}
          hint="Materi lanjutan dibuka bertahap setelah fondasi pekan sebelumnya cukup. Selesaikan pekan yang sedang berjalan terlebih dahulu."
        />
        <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to={`/belajar/kelas/${course.slug}/pekan/${repo.CURRENT_WEEK}`} className="btn-solid-sm">
            Buka pekan berjalan
          </Link>
          <Link to={`/belajar/kelas/${course.slug}`} className="btn-sm">
            Lihat semua pekan
          </Link>
        </div>
      </div>
    );
  }

  const steps = repo.lessonsOf(wk.id);
  const done = repo.weekCompletion(wk.id);
  const showArabicExtras = course.id === "co-arab";

  return (
    <div className="shell" style={{ paddingBlock: "28px 80px" }}>
      <nav
        aria-label="Breadcrumb"
        style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 14.5, color: "#807a70", marginBottom: 22, flexWrap: "wrap" }}
      >
        <Link to="/belajar/dashboard" style={{ color: "var(--color-forest)", fontWeight: 600 }}>
          Dasbor
        </Link>
        <span style={{ color: "#c9c1b2" }}>/</span>
        <Link to="/belajar/caturwulan">{repo.activeTerm.name}</Link>
        <span style={{ color: "#c9c1b2" }}>/</span>
        <Link to={`/belajar/kelas/${course.slug}`}>{course.name}</Link>
        <span style={{ color: "#c9c1b2" }}>/</span>
        <span style={{ color: "var(--color-ink)", fontWeight: 600 }}>Pekan {wk.number}</span>
      </nav>

      <div className="unit-layout" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 28, alignItems: "start" }}>
        <aside className="unit-rail" style={{ position: "sticky", top: 80, display: "flex", flexDirection: "column", gap: 16 }}>
          <Card padding={8}>
            <div style={{ padding: "14px 16px 12px" }}>
              <div className="eyebrow">
                Pekan {wk.number} · {WEEK_TYPE_LABEL[wk.type]}
              </div>
              <div style={{ fontFamily: serif, fontSize: 19, lineHeight: 1.25, marginTop: 6 }}>{wk.title}</div>
              <div style={{ fontSize: 14, color: "var(--color-soft)", marginTop: 6 }}>
                {done.done} dari {done.total} bagian selesai
              </div>
            </div>
            {steps.map((l) => {
              const isDone = repo.progressOf(l.id) === "completed";
              const isCurrent = !isDone && steps.find((s) => repo.progressOf(s.id) !== "completed")?.id === l.id;
              return (
                <div
                  key={l.id}
                  aria-current={isCurrent ? "step" : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 16px",
                    borderRadius: 8,
                    background: isCurrent ? "var(--color-mist)" : "transparent",
                  }}
                >
                  <StepMark done={isDone} size={18} current={isCurrent} />
                  <div
                    style={{
                      flex: 1,
                      fontSize: 15.5,
                      fontWeight: 600,
                      color: isDone ? "var(--color-ink)" : "var(--color-soft)",
                    }}
                  >
                    {l.title}
                  </div>
                </div>
              );
            })}
          </Card>

          <Card tone="sand" padding={20}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              Tujuan pembelajaran
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 15, lineHeight: 1.5, color: "#3d3a34" }}>
              {TUJUAN.map((t) => (
                <div key={t}>{t}</div>
              ))}
            </div>
          </Card>
        </aside>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {steps.map((l, i) => (
            <Card key={l.id} padding={0} style={{ overflow: "hidden" }}>
              <div style={{ padding: "22px 26px 18px", borderBottom: "1px solid #ece6da" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                  <div className="eyebrow eyebrow-accent">
                    0{i + 1} · {l.title}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {l.isEssential && (
                      <Badge bg="#f6eddb" fg="#8a6a25">
                        Esensial
                      </Badge>
                    )}
                    <span style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>
                      {LESSON_TYPE_LABEL[l.type]} · {l.durationMinutes} mnt
                    </span>
                  </div>
                </div>
                <h2 style={{ fontSize: 22, marginTop: 10 }}>{l.description}</h2>
              </div>

              <div style={{ padding: "18px 26px 24px" }}>
                {l.type === "video" && (
                  <div
                    style={{
                      aspectRatio: "16 / 9",
                      borderRadius: 10,
                      border: "1px solid var(--color-line)",
                      backgroundImage:
                        "repeating-linear-gradient(135deg, var(--color-line-softer) 0 10px, var(--color-paper) 10px 20px)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: "50%",
                        background: "var(--color-forest)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--color-paper)",
                        fontSize: 17.5,
                      }}
                    >
                      ▶
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 12.5, letterSpacing: ".08em", color: "var(--color-soft)" }}>
                      REKAMAN — {course.name.toUpperCase()} PEKAN {wk.number}
                    </div>
                  </div>
                )}

                {l.type === "worksheet" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {WORKSHEET_SOAL.map((s) => (
                      <div key={s} style={{ fontFamily: serif, fontSize: 18, lineHeight: 1.4 }}>
                        {s}
                      </div>
                    ))}
                    <textarea
                      rows={4}
                      placeholder="Tulis jawaban Anda…"
                      style={{
                        width: "100%",
                        padding: "11px 13px",
                        border: "1px solid var(--color-line-strong)",
                        borderRadius: 6,
                        background: "var(--color-paper)",
                        fontFamily: "var(--font-sans)",
                        fontSize: 16,
                        resize: "vertical",
                      }}
                    />
                  </div>
                )}

                {l.type === "quiz" && (
                  <div>
                    <div style={{ fontSize: 16.5, lineHeight: 1.6, color: "#3d3a34" }}>
                      5 pertanyaan singkat. Tidak dinilai sebagai ujian — hanya untuk melihat bagian mana yang perlu
                      murojaah.
                    </div>
                    <button type="button" className="btn-solid-sm" style={{ marginTop: 16 }}>
                      Mulai cek pemahaman
                    </button>
                  </div>
                )}

                {l.type === "reflection" && (
                  <textarea
                    rows={3}
                    placeholder="Satu hal yang saya pahami, dan satu hal yang masih perlu diperjelas…"
                    style={{
                      width: "100%",
                      padding: "11px 13px",
                      border: "1px solid var(--color-line-strong)",
                      borderRadius: 6,
                      background: "var(--color-paper)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 16,
                      resize: "vertical",
                    }}
                  />
                )}

                {(l.type === "article" || l.type === "exercise" || l.type === "review") && (
                  <div style={{ fontSize: 16.5, lineHeight: 1.7, color: "var(--color-body)" }}>{l.description}.</div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 18,
                    paddingTop: 16,
                    borderTop: "1px solid var(--color-line-soft)",
                    flexWrap: "wrap",
                  }}
                >
                  <button type="button" className="btn-sm">
                    Simpan untuk Murojaah
                  </button>
                  <button type="button" className="btn-sm">
                    Tandai selesai
                  </button>
                </div>
              </div>
            </Card>
          ))}

          {showArabicExtras && (
            <Card padding="26px 28px">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20, gap: 16 }}>
                <h2 style={{ fontFamily: serif, fontSize: 22 }}>Kosakata Pekan Ini</h2>
                <div style={{ fontFamily: mono, fontSize: 12, color: "var(--color-faint)" }}>
                  {KOSAKATA.length} KATA
                </div>
              </div>
              <div className="vocab-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                {KOSAKATA.map((k) => (
                  <div
                    key={k.tr}
                    style={{
                      padding: "18px 14px",
                      border: "1px solid #e8e2d6",
                      borderRadius: 10,
                      background: "var(--color-paper)",
                      textAlign: "center",
                    }}
                  >
                    <div
                      dir="rtl"
                      lang="ar"
                      style={{ fontFamily: "var(--font-arabic)", fontSize: 28, lineHeight: 1.5, color: "var(--color-forest)" }}
                    >
                      {k.ar}
                    </div>
                    <div style={{ fontSize: 14.5, fontStyle: "italic", color: "var(--color-soft)", marginTop: 6 }}>
                      {k.tr}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{k.id}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            {wk.number > 0 ? (
              <Link to={`/belajar/kelas/${course.slug}/pekan/${wk.number - 1}`} className="btn-sm">
                ← Pekan {wk.number - 1}
              </Link>
            ) : (
              <span />
            )}
            {wk.number < repo.TOTAL_WEEKS && !repo.weekOf(course.id, wk.number + 1)?.locked && (
              <Link to={`/belajar/kelas/${course.slug}/pekan/${wk.number + 1}`} className="btn-solid-sm">
                Pekan {wk.number + 1} →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
