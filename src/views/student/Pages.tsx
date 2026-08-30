import { Link, useParams } from "react-router";
import * as repo from "../../domain/repository";
import { CURRENT_WEEK } from "../../domain/repository";
import {
  ATTENDANCE_LABEL,
  LESSON_TYPE_LABEL,
  WEEK_TYPE_LABEL,
  type Week,
} from "../../domain/types";
import {
  Badge,
  Card,
  CardTitle,
  EmptyState,
  Meter,
  PageHeader,
  mono,
  serif,
} from "../../components/ui";
import { useAuth } from "../../lib/auth";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell" style={{ paddingBlock: "40px 80px" }}>
      {children}
    </div>
  );
}

/** Status pill for a week in the caturwulan timeline. */
function weekStatus(w: Week): { label: string; bg: string; fg: string } {
  if (w.number < CURRENT_WEEK) return { label: "Selesai", bg: "#e6ede7", fg: "#1f3d34" };
  if (w.number === CURRENT_WEEK) return { label: "Berjalan", bg: "#1f3d34", fg: "#f6f2ea" };
  if (w.type === "REVIEW") return { label: "Murojaah", bg: "#f6eddb", fg: "#8a6a25" };
  if (w.type === "ASSESSMENT") return { label: "Evaluasi", bg: "#f6eddb", fg: "#8a6a25" };
  return { label: "Terkunci", bg: "#ecebe6", fg: "#6d675e" };
}

/* --- /belajar/caturwulan ---------------------------------------- */

export function Caturwulan() {
  const term = repo.activeTerm;
  const arab = repo.courseBySlug("bahasa-arab-01")!;
  const weeks = repo.weeksOf(arab.id);
  const p = repo.termProgress();

  return (
    <Shell>
      <PageHeader
        eyebrow={`${term.name} · Marhalah I'dad`}
        title={term.title}
        lead="Seluruh perjalanan caturwulan ini dalam satu tampilan. Materi lanjutan terbuka bertahap seiring pertemuan berjalan."
      />

      <Card tone="forest" padding={26} style={{ marginBottom: 24 }}>
        <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 30, alignItems: "center" }}>
          <div>
            <div className="eyebrow eyebrow-on-dark" style={{ marginBottom: 10 }}>
              Progres caturwulan
            </div>
            <div style={{ fontFamily: serif, fontSize: 30 }}>
              Pertemuan {p.week} dari {p.total}
            </div>
            <div style={{ fontSize: 16, color: "rgba(238,242,238,.7)", marginTop: 8 }}>
              Setelah caturwulan ini selesai, tersedia jeda 1–2 pekan sebelum Anda memutuskan untuk melanjutkan.
            </div>
          </div>
          <div style={{ fontFamily: serif, fontSize: 46, lineHeight: 1 }}>{p.percent}%</div>
        </div>
      </Card>

      <CardTitle>Timeline 12 pertemuan</CardTitle>
      <div style={{ display: "grid", gap: 8, marginBottom: 36 }}>
        {weeks.map((w) => {
          const s = weekStatus(w);
          const done = repo.weekCompletion(w.id);
          return (
            <div
              key={w.id}
              className="split"
              style={{
                display: "grid",
                gridTemplateColumns: "86px 1fr 130px 110px",
                gap: 16,
                alignItems: "center",
                padding: "14px 18px",
                background: w.number === CURRENT_WEEK ? "var(--color-mist)" : "var(--color-surface)",
                border: `1px solid ${w.number === CURRENT_WEEK ? "#d6e0d8" : "var(--color-line)"}`,
                borderRadius: 8,
                fontSize: 16,
              }}
            >
              <div style={{ fontFamily: mono, fontSize: 13, color: "var(--color-faint)" }}>
                PERTEMUAN {w.number}
              </div>
              <div style={{ minWidth: 0 }}>
                {w.locked ? (
                  <span style={{ color: "var(--color-soft)" }}>{w.title}</span>
                ) : (
                  <Link to={`/belajar/kelas/${arab.slug}/pertemuan/${w.number}`} style={{ fontWeight: 600 }}>
                    {w.title}
                  </Link>
                )}
                <div style={{ fontSize: 14, color: "var(--color-soft)", marginTop: 2 }}>
                  {WEEK_TYPE_LABEL[w.type]} · {done.done}/{done.total} bagian
                </div>
              </div>
              <div className="col-hide">
                <Meter percent={done.total ? Math.round((done.done / done.total) * 100) : 0} label={w.title} />
              </div>
              <div>
                <Badge bg={s.bg} fg={s.fg}>
                  {s.label}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      <CardTitle>Mata pelajaran</CardTitle>
      <div style={{ display: "grid", gap: 14 }}>
        {repo.coursesWithProgress().map((c) => (
          <Card key={c.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <Link to={`/belajar/kelas/${c.slug}`} style={{ fontSize: 18.5, fontWeight: 700 }}>
                {c.name}
              </Link>
              <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-muted)" }}>{c.label}</div>
            </div>
            <div style={{ fontSize: 15.5, color: "var(--color-body)", marginTop: 8, lineHeight: 1.6 }}>
              {c.description}
            </div>
            <div style={{ marginTop: 14 }}>
              <Meter percent={c.percent} label={c.name} />
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
}

/* --- /belajar/kelas/:courseSlug --------------------------------- */

export function Kelas() {
  const { courseSlug } = useParams();
  const course = courseSlug ? repo.courseBySlug(courseSlug) : undefined;

  if (!course) {
    return (
      <Shell>
        <EmptyState title="Mata pelajaran tidak ditemukan" hint="Periksa kembali tautan yang Anda buka." />
      </Shell>
    );
  }

  const weeks = repo.weeksOf(course.id);
  const instructor = repo.instructorById(course.instructorId);
  const percent = repo.courseProgress(course.id);

  return (
    <Shell>
      <PageHeader
        eyebrow={`${repo.activeTerm.name} · ${course.role}`}
        title={course.name}
        lead={course.description}
      />

      <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>
        <div>
          <Card padding={0} style={{ overflow: "hidden" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid #ece6da" }}>
              <h2 style={{ fontFamily: serif, fontSize: 20 }}>Unit mingguan</h2>
            </div>
            {weeks.map((w) => {
              const done = repo.weekCompletion(w.id);
              const s = weekStatus(w);
              return (
                <div
                  key={w.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 22px",
                    borderTop: "1px solid var(--color-line-softer)",
                  }}
                >
                  <div style={{ width: 62, flex: "none", fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>
                    PERTEMUAN {w.number}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {w.locked ? (
                      <span style={{ fontSize: 16.5, color: "var(--color-soft)" }}>{w.title}</span>
                    ) : (
                      <Link
                        to={`/belajar/kelas/${course.slug}/pertemuan/${w.number}`}
                        style={{ fontSize: 16.5, fontWeight: 600 }}
                      >
                        {w.title}
                      </Link>
                    )}
                    <div style={{ fontSize: 14, color: "var(--color-soft)", marginTop: 2 }}>
                      {done.done}/{done.total} bagian selesai
                    </div>
                  </div>
                  <Badge bg={s.bg} fg={s.fg}>
                    {s.label}
                  </Badge>
                </div>
              );
            })}
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              Penyelesaian
            </div>
            <div style={{ fontFamily: serif, fontSize: 34, lineHeight: 1 }}>{percent}%</div>
            <div style={{ marginTop: 12 }}>
              <Meter percent={percent} label={course.name} />
            </div>
          </Card>
          {instructor && (
            <Card>
              <div className="eyebrow" style={{ marginBottom: 12 }}>
                Pengajar
              </div>
              <div style={{ fontSize: 17.5, fontWeight: 700 }}>{instructor.name}</div>
              <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 4 }}>{instructor.title}</div>
            </Card>
          )}
          <Card tone="sand">
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              Pola belajar
            </div>
            <div style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--color-body)" }}>{course.deliveryModel}</div>
            <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 8 }}>{course.weeklyLoad}</div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}

/* --- /belajar/jadwal -------------------------------------------- */

export function Jadwal() {
  const sessions = repo.sessionsUpcoming();
  return (
    <Shell>
      <PageHeader
        eyebrow="Jadwal"
        title="Agenda caturwulan berjalan"
        lead="Kelas online, praktik tatap muka, dan Majlis Ta'sil bulanan. Kehadiran dicatat untuk kelas yang mewajibkannya."
      />
      {sessions.length === 0 ? (
        <EmptyState title="Belum ada jadwal" hint="Jadwal akan muncul setelah pertemuan berjalan dibuka." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {sessions.map((s) => {
            const course = repo.courseById(s.courseId);
            return (
              <Card key={s.id} padding={20}>
                <div
                  className="split"
                  style={{ display: "grid", gridTemplateColumns: "150px 1fr 130px", gap: 18, alignItems: "center" }}
                >
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>{s.dayLabel}</div>
                    <div style={{ fontSize: 15.5, fontWeight: 700, marginTop: 3 }}>{s.timeLabel}</div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 17.5, fontWeight: 600 }}>{s.title}</div>
                    <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 4 }}>
                      {course?.name} ·{" "}
                      {s.locationType === "online" ? "Online" : `Tatap muka — ${s.address}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    {s.attendance ? (
                      <Badge bg="#e6ede7" fg="#1f3d34">
                        {ATTENDANCE_LABEL[s.attendance]}
                      </Badge>
                    ) : s.meetingUrl ? (
                      <span className="btn-sm" style={{ display: "inline-block" }}>
                        Link kelas
                      </span>
                    ) : (
                      <Badge bg="#ecebe6" fg="#6d675e">
                        Terjadwal
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

/* --- /belajar/murojaah ------------------------------------------ */

export function Murojaah() {
  const saved = repo.allNotes().filter((n) => n.bookmarkedForReview);
  const arab = repo.courseBySlug("bahasa-arab-01")!;
  const catchUp = repo.catchUpLessons(arab.id, CURRENT_WEEK);

  return (
    <Shell>
      <PageHeader
        eyebrow="Murojaah"
        title="Mengulang adalah bagian inti, bukan tambahan"
        lead="Materi yang Anda tandai untuk dimurojaah dikumpulkan di sini, bersama jalur ringkas bila Anda tertinggal."
      />

      <div className="split" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20, alignItems: "start" }}>
        <Card>
          <CardTitle aside={`${saved.length} materi ditandai`}>Ditandai untuk murojaah</CardTitle>
          {saved.length === 0 ? (
            <EmptyState
              title="Belum ada materi yang ditandai"
              hint="Gunakan tombol Simpan untuk Murojaah pada halaman pelajaran."
            />
          ) : (
            saved.map((n) => (
              <div key={n.id} style={{ padding: "16px 0", borderTop: "1px solid var(--color-line-soft)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 17.5, fontWeight: 700 }}>{n.lessonTitle}</div>
                  <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>{n.courseName}</div>
                </div>
                <div style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--color-body)", marginTop: 8 }}>{n.body}</div>
              </div>
            ))
          )}
        </Card>

        <Card tone="sand">
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Jalur mengejar ketertinggalan
          </div>
          <div style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--color-body)", marginBottom: 16 }}>
            Materi esensial pertemuan {CURRENT_WEEK} bila Anda perlu mengejar. Jalur ini bersifat suportif — bukan hukuman.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {catchUp.map((l) => (
              <div
                key={l.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 14px",
                  background: "var(--color-surface)",
                  borderRadius: 8,
                  fontSize: 15.5,
                }}
              >
                <span style={{ fontWeight: 600 }}>{l.title}</span>
                <span style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)", flex: "none" }}>
                  {LESSON_TYPE_LABEL[l.type]}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18 }}>
            <Link to={`/belajar/kelas/${arab.slug}/pertemuan/${CURRENT_WEEK}`} className="btn-solid-sm" style={{ display: "inline-block" }}>
              Mulai jalur ringkas →
            </Link>
          </div>
        </Card>
      </div>
    </Shell>
  );
}

/* --- /belajar/progress ------------------------------------------ */

export function Progress() {
  const p = repo.termProgress();
  const courses = repo.coursesWithProgress();
  const bobot = [
    { k: "Kehadiran & keterlibatan", v: "20%" },
    { k: "Latihan & worksheet", v: "30%" },
    { k: "Kuis / cek pemahaman", v: "20%" },
    { k: "Evaluasi akhir", v: "30%" },
  ];

  return (
    <Shell>
      <PageHeader
        eyebrow={repo.activeTerm.name}
        title="Progres caturwulan berjalan"
        lead="Yang ditampilkan adalah kemajuan pada caturwulan ini saja — bukan persentase seluruh perjalanan TIA."
      />

      <div className="quad" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Pertemuan
          </div>
          <div style={{ fontFamily: serif, fontSize: 34, lineHeight: 1 }}>
            {p.week}/{p.total}
          </div>
        </Card>
        <Card>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Penyelesaian
          </div>
          <div style={{ fontFamily: serif, fontSize: 34, lineHeight: 1 }}>{p.percent}%</div>
        </Card>
        <Card>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Status
          </div>
          <div style={{ fontFamily: serif, fontSize: 26, lineHeight: 1.2, color: "var(--color-forest)" }}>
            Sesuai jalur
          </div>
        </Card>
      </div>

      <Card style={{ marginBottom: 20 }}>
        <CardTitle>Capaian per mata pelajaran</CardTitle>
        {courses.map((c) => (
          <div key={c.id} style={{ padding: "16px 0", borderTop: "1px solid var(--color-line-soft)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}>
              <div style={{ fontSize: 17.5, fontWeight: 700 }}>{c.name}</div>
              <div style={{ fontFamily: mono, fontSize: 13, color: "var(--color-muted)" }}>{c.percent}%</div>
            </div>
            <div style={{ marginTop: 10 }}>
              <Meter percent={c.percent} label={c.name} />
            </div>
          </div>
        ))}
      </Card>

      <Card tone="forest">
        <div className="eyebrow eyebrow-on-dark" style={{ marginBottom: 14 }}>
          Bobot evaluasi akhir
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11, fontSize: 15.5 }}>
          {bobot.map((b) => (
            <div key={b.k} style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
              <span style={{ color: "rgba(238,242,238,.7)" }}>{b.k}</span>
              <span style={{ fontWeight: 700 }}>{b.v}</span>
            </div>
          ))}
        </div>
      </Card>
    </Shell>
  );
}

/* --- /belajar/catatan ------------------------------------------- */

export function Catatan() {
  const notes = repo.allNotes();
  return (
    <Shell>
      <PageHeader
        eyebrow="Catatan"
        title="Catatan belajar Anda"
        lead="Catatan bersifat pribadi secara bawaan dan tidak dibagikan ke pengajar."
      />
      {notes.length === 0 ? (
        <EmptyState title="Belum ada catatan" hint="Catatan yang Anda tulis pada halaman pelajaran akan muncul di sini." />
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {notes.map((n) => (
            <Card key={n.id} padding={22}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                <div style={{ fontSize: 17.5, fontWeight: 700 }}>{n.lessonTitle}</div>
                <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>{n.createdAt}</div>
              </div>
              <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 4 }}>{n.courseName}</div>
              <div style={{ fontSize: 16, lineHeight: 1.65, color: "var(--color-body)", marginTop: 12 }}>{n.body}</div>
              {n.bookmarkedForReview && (
                <div style={{ marginTop: 12 }}>
                  <Badge bg="#f6eddb" fg="#8a6a25">
                    Ditandai untuk murojaah
                  </Badge>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}

/* --- /belajar/profil -------------------------------------------- */

export function Profil() {
  const { user, signOut } = useAuth();
  const term = repo.activeTerm;

  return (
    <Shell>
      <PageHeader eyebrow="Profil" title={user?.name ?? "Peserta"} />
      <div className="split" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
        <Card>
          <CardTitle>Data peserta</CardTitle>
          {[
            { k: "Nama", v: user?.name ?? "—" },
            { k: "Email", v: user?.email ?? "—" },
            { k: "Peran", v: "Peserta" },
            { k: "Caturwulan aktif", v: `${term.name} — ${term.title}` },
            { k: "Status", v: "Aktif" },
          ].map((r) => (
            <div
              key={r.k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                padding: "13px 0",
                borderTop: "1px solid var(--color-line-soft)",
                fontSize: 16,
              }}
            >
              <span style={{ color: "var(--color-muted)" }}>{r.k}</span>
              <span style={{ fontWeight: 600, textAlign: "right" }}>{r.v}</span>
            </div>
          ))}
        </Card>

        <Card>
          <CardTitle>Pengingat</CardTitle>
          <div style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--color-body)" }}>
            Pilih bagaimana Anda ingin diingatkan tentang kelas dan tenggat pekanan.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            {["Email pengingat kelas", "Pengingat tenggat worksheet", "Ringkasan murojaah pekanan"].map((x) => (
              <label key={x} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 16 }}>
                <input type="checkbox" defaultChecked />
                {x}
              </label>
            ))}
          </div>
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--color-line-soft)" }}>
            <button type="button" className="btn-sm" onClick={signOut}>
              Keluar dari akun
            </button>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
