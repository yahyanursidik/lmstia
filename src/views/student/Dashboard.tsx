import { Link } from "react-router";
import * as repo from "../../domain/repository";
import { CURRENT_WEEK, TOTAL_WEEKS } from "../../domain/repository";
import { Card, CardTitle, Meter, StepMark, mono, serif } from "../../components/ui";
import { useAuth } from "../../lib/auth";

/**
 * Dasbor peserta — answers one question: "apa yang perlu saya kerjakan sekarang?"
 * Progress shown is always the active caturwulan, never the whole TIA journey
 * (01-PRODUCT-BRIEF.md §Progress dekat).
 */

function weekColor(i: number) {
  if (i < CURRENT_WEEK - 1) return "var(--color-mist)";
  if (i === CURRENT_WEEK - 1) return "#a9c4b5";
  return "rgba(238,242,238,.16)";
}

export default function Dashboard() {
  const { user } = useAuth();
  const next = repo.nextLearningAction();
  const arab = repo.courseBySlug("bahasa-arab-01")!;
  const week = repo.weekOf(arab.id, CURRENT_WEEK)!;
  const steps = repo.lessonsOf(week.id);
  const done = repo.weekCompletion(week.id);
  const courses = repo.coursesWithProgress();
  const upcoming = repo.sessionsUpcoming().slice(0, 3);
  const pending = repo.pendingThisWeek();
  const majlis = repo.sessionsUpcoming().find((s) => s.type === "MAJLIS_TASIL");

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
          <div style={{ fontSize: 15, color: "var(--color-muted)" }}>
            {repo.activeTerm.name} · Marhalah I&apos;dad
          </div>
          <div style={{ width: 1, height: 18, background: "var(--color-line)" }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-forest)" }}>
            Pekan {CURRENT_WEEK} dari {TOTAL_WEEKS}
          </div>
        </div>
      </header>

      {/* Langkah berikutnya — resolved by the next-learning-action rules. */}
      <section
        className="card-forest split"
        style={{
          padding: "30px 32px",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 36,
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <div className="eyebrow eyebrow-on-dark" style={{ marginBottom: 12 }}>
            Langkah berikutnya
          </div>
          <div style={{ fontFamily: serif, fontSize: 29, lineHeight: 1.2 }}>{next.title}</div>
          <div style={{ fontSize: 16, color: "rgba(238,242,238,.7)", marginTop: 10 }}>{next.detail}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
            <Link to={next.href} className="btn-light">
              Lanjutkan belajar →
            </Link>
            <Link to="/belajar/jadwal" className="btn-outline-dark">
              Lihat jadwal
            </Link>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 4 }} aria-hidden="true">
            {Array.from({ length: TOTAL_WEEKS }, (_, i) => (
              <div key={i} style={{ width: 15, height: 44, borderRadius: 3, background: weekColor(i) }} />
            ))}
          </div>
          <div
            style={{
              fontFamily: mono,
              fontSize: 11.5,
              letterSpacing: ".08em",
              color: "rgba(238,242,238,.5)",
              marginTop: 6,
            }}
          >
            {TOTAL_WEEKS} PEKAN {repo.activeTerm.name.toUpperCase()}
          </div>
        </div>
      </section>

      <div className="split" style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card padding={0} style={{ overflow: "hidden" }}>
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #ece6da",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 16,
              }}
            >
              <h2 style={{ fontFamily: serif, fontSize: 21 }}>Unit Pekan Ini</h2>
              <div style={{ fontSize: 14.5, color: "#807a70" }}>
                {done.done} dari {done.total} bagian selesai
              </div>
            </div>
            {steps.map((l) => {
              const isDone = repo.progressOf(l.id) === "completed";
              return (
                <div
                  key={l.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "15px 24px",
                    borderBottom: "1px solid var(--color-line-softer)",
                  }}
                >
                  <StepMark done={isDone} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 16.5,
                        fontWeight: 600,
                        color: isDone ? "var(--color-ink)" : "var(--color-soft)",
                      }}
                    >
                      {l.title}
                    </div>
                    <div style={{ fontSize: 14.5, color: "var(--color-soft)", marginTop: 2 }}>{l.description}</div>
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>
                    {l.durationMinutes} mnt
                  </div>
                </div>
              );
            })}
            <div style={{ padding: "18px 24px", background: "var(--color-paper)" }}>
              <Link
                to={`/belajar/kelas/${arab.slug}/pekan/${CURRENT_WEEK}`}
                className="btn-solid-sm"
                style={{ display: "inline-block" }}
              >
                Buka unit pekan ini →
              </Link>
            </div>
          </Card>

          <Card>
            <CardTitle>Mata Pelajaran {repo.activeTerm.name}</CardTitle>
            {courses.map((c) => (
              <div key={c.id} style={{ padding: "16px 0", borderTop: "1px solid var(--color-line-soft)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
                  <Link to={`/belajar/kelas/${c.slug}`} style={{ fontSize: 17.5, fontWeight: 700 }}>
                    {c.name}
                  </Link>
                  <div style={{ fontFamily: mono, fontSize: 13, color: "var(--color-muted)" }}>{c.label}</div>
                </div>
                <div style={{ fontSize: 14.5, color: "var(--color-soft)", marginTop: 4 }}>{c.deliveryModel}</div>
                <div style={{ marginTop: 12 }}>
                  <Meter percent={c.percent} label={`Progres ${c.name}`} />
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              Perlu diselesaikan pekan ini
            </div>
            {pending.length === 0 ? (
              <div style={{ fontSize: 15.5, color: "var(--color-muted)", lineHeight: 1.6 }}>
                Semua aktivitas pekan ini sudah selesai. Gunakan sisa waktu untuk murojaah.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {pending.slice(0, 5).map((p) => (
                  <Link
                    key={p.lesson.id}
                    to={`/belajar/kelas/${p.course.slug}/pekan/${p.week.number}`}
                    style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 15.5 }}
                  >
                    <span style={{ color: "#3d3a34" }}>{p.lesson.title}</span>
                    <span style={{ color: "var(--color-faint)", fontFamily: mono, fontSize: 13, flex: "none" }}>
                      {p.course.code}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              Jadwal terdekat
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {upcoming.map((s) => (
                <div key={s.id}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{s.title}</div>
                  <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 3 }}>
                    {s.dayLabel} · {s.timeLabel} ·{" "}
                    {s.locationType === "online" ? "Online" : "Tatap muka"}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {majlis && (
            <Card>
              <div className="eyebrow" style={{ marginBottom: 14 }}>
                Majlis Ta&apos;sil berikutnya
              </div>
              <div style={{ fontFamily: serif, fontSize: 20, lineHeight: 1.3 }}>{majlis.title}</div>
              <div style={{ fontSize: 15, color: "var(--color-muted)", marginTop: 10, lineHeight: 1.55 }}>
                {majlis.dayLabel} · {majlis.timeLabel} · {majlis.address}
              </div>
            </Card>
          )}

          <Card tone="sand">
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              Catatan murojaah
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {repo
                .allNotes()
                .filter((n) => n.bookmarkedForReview)
                .slice(0, 3)
                .map((n) => (
                  <div key={n.id} style={{ fontSize: 15.5 }}>
                    <div style={{ color: "#3d3a34", fontWeight: 600 }}>{n.lessonTitle}</div>
                    <div style={{ color: "var(--color-soft)", fontSize: 14.5, marginTop: 2 }}>{n.courseName}</div>
                  </div>
                ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <Link to="/belajar/murojaah" className="btn-sm" style={{ display: "inline-block" }}>
                Buka murojaah
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
