import { Link, useParams } from "react-router";
import { useState } from "react";
import { api } from "../../lib/api";
import { mutate, useResource } from "../../lib/useApi";
import { useAuth } from "../../lib/auth";
import type { Dasbor } from "./Dashboard";
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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell" style={{ paddingBlock: "40px 80px" }}>
      {children}
    </div>
  );
}

/** Status pill for a week in the caturwulan timeline. */

/* --- /belajar/caturwulan ---------------------------------------- */

export function Caturwulan() {
  const d = useResource<Dasbor>("/me/dashboard");

  /*
   * Timeline diambil dari mata pelajaran intensif caturwulan ini — bukan slug
   * yang ditulis keras — supaya halaman ini tetap benar ketika kurikulumnya
   * berganti. Bila tidak ada yang bertanda intensif, mata pelajaran pertama
   * dipakai sebagai gantinya.
   */
  const inti =
    d.data?.subjects.find((s) => s.role === "INTENSIVE") ?? d.data?.subjects[0] ?? null;
  const kelas = useResource<KelasData>(inti ? `/me/kelas/${inti.slug}` : null);

  if (d.loading) {
    return (
      <Shell>
        <div style={{ color: "var(--color-faint)" }}>Memuat caturwulan…</div>
      </Shell>
    );
  }
  if (d.error || !d.data) {
    return (
      <Shell>
        <EmptyState title="Caturwulan belum dapat dimuat" hint={d.error ?? undefined} />
      </Shell>
    );
  }

  const data = d.data;
  const rata = data.subjects.length
    ? Math.round(data.subjects.reduce((a, s) => a + s.percent, 0) / data.subjects.length)
    : 0;
  const pertemuan = kelas.data?.meetings ?? [];
  const terbuka = pertemuan.filter((m) => !m.locked).length;

  return (
    <Shell>
      <PageHeader
        eyebrow={data.tahapan.name}
        title={data.tahapan.title ?? data.tahapan.name}
        lead="Satu caturwulan adalah unit belajar yang utuh. Selesaikan yang ini lebih dulu, baru pertimbangkan yang berikutnya."
      />

      <Card padding={0} style={{ overflow: "hidden", marginBottom: 30 }}>
        <div
          style={{
            background: "var(--color-forest)",
            color: "var(--color-paper)",
            padding: 26,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="eyebrow eyebrow-on-dark" style={{ marginBottom: 10 }}>
              Progres caturwulan
            </div>
            <div style={{ fontFamily: serif, fontSize: 30 }}>
              {terbuka} dari {pertemuan.length} pertemuan terbuka
            </div>
            <div style={{ fontSize: 16, color: "rgba(238,242,238,.7)", marginTop: 8 }}>
              Setelah caturwulan ini selesai, tersedia jeda 1–2 pekan sebelum Anda memutuskan untuk
              melanjutkan.
            </div>
          </div>
          <div style={{ fontFamily: serif, fontSize: 46, lineHeight: 1 }}>{rata}%</div>
        </div>
      </Card>

      {inti && (
        <>
          <CardTitle aside={inti.name}>Timeline pertemuan</CardTitle>
          {kelas.loading && (
            <div style={{ color: "var(--color-faint)", marginBottom: 30 }}>Memuat timeline…</div>
          )}
          <div style={{ display: "grid", gap: 8, marginBottom: 36 }}>
            {pertemuan.map((m) => {
              const s = statusPertemuan(m);
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 16px",
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-line)",
                    borderRadius: 9,
                  }}
                >
                  <div
                    style={{
                      width: 58,
                      flex: "none",
                      fontFamily: mono,
                      fontSize: 12.5,
                      color: "var(--color-faint)",
                    }}
                  >
                    P{m.number}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {m.locked ? (
                      <span style={{ fontSize: 16, color: "var(--color-soft)" }}>{m.title}</span>
                    ) : (
                      <Link
                        to={`/belajar/kelas/${inti.slug}/pertemuan/${m.number}`}
                        style={{ fontSize: 16, fontWeight: 600 }}
                      >
                        {m.title}
                      </Link>
                    )}
                  </div>
                  <Badge bg={s.bg} fg={s.fg}>
                    {s.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </>
      )}

      <CardTitle>Mata pelajaran caturwulan ini</CardTitle>
      <div
        className="split"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
          marginTop: 14,
        }}
      >
        {data.subjects.map((c) => (
          <Card key={c.id} padding={22}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>
              {PERAN_MAPEL[c.role] ?? c.role}
            </div>
            <Link to={`/belajar/kelas/${c.slug}`} style={{ fontFamily: serif, fontSize: 20 }}>
              {c.name}
            </Link>
            {c.deliveryModel && (
              <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 8 }}>
                {c.deliveryModel}
              </div>
            )}
            <div style={{ marginTop: 14 }}>
              <Meter percent={c.percent} label={`${c.percent}% selesai`} />
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
}

/* --- /belajar/kelas/:slug --------------------------------------- */

type PertemuanRingkas = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  type: string;
  mode: string;
  startsAt: string | null;
  durationMinutes: number;
  locked: boolean;
  total: number;
  done: number;
  percent: number;
};

type KelasData = {
  subject: {
    id: string;
    slug: string;
    name: string;
    code: string;
    role: string;
    description: string | null;
    deliveryModel: string | null;
    weeklyLoad: string | null;
  };
  meetings: PertemuanRingkas[];
};

const PERAN_MAPEL: Record<string, string> = {
  INTENSIVE: "Intensif",
  FOUNDATION: "Fondasi",
  COMPANION: "Pendamping",
};

const MODE_LABEL: Record<string, string> = {
  online: "Daring",
  offline: "Tatap muka",
  hybrid: "Hybrid",
  mandiri: "Mandiri",
};

function statusPertemuan(m: PertemuanRingkas) {
  if (m.locked) return { label: "Terkunci", bg: "#ece9e3", fg: "#807a70" };
  if (m.total > 0 && m.done === m.total) return { label: "Selesai", bg: "#e4ede4", fg: "#2f5638" };
  if (m.done > 0) return { label: "Berjalan", bg: "#f6eddb", fg: "#8a6a25" };
  return { label: "Belum dimulai", bg: "#ece9e3", fg: "#544e45" };
}

export function Kelas() {
  const { courseSlug } = useParams();
  const kelas = useResource<KelasData>(courseSlug ? `/me/kelas/${courseSlug}` : null);

  if (kelas.loading) {
    return (
      <Shell>
        <div style={{ color: "var(--color-faint)" }}>Memuat mata pelajaran…</div>
      </Shell>
    );
  }

  if (kelas.error || !kelas.data) {
    return (
      <Shell>
        <EmptyState
          title="Mata pelajaran tidak ditemukan"
          hint="Periksa kembali tautan yang Anda buka."
        />
      </Shell>
    );
  }

  const { subject: c, meetings } = kelas.data;
  const terbuka = meetings.filter((m) => !m.locked);
  const totalMateri = terbuka.reduce((a, m) => a + m.total, 0);
  const totalSelesai = terbuka.reduce((a, m) => a + m.done, 0);
  const percent = totalMateri ? Math.round((totalSelesai / totalMateri) * 100) : 0;

  return (
    <Shell>
      <PageHeader
        eyebrow={`${c.code} · ${PERAN_MAPEL[c.role] ?? c.role}`}
        title={c.name}
        lead={c.description ?? undefined}
      />

      <div
        className="split"
        style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}
      >
        <div>
          <Card padding={0} style={{ overflow: "hidden" }}>
            <div style={{ padding: "18px 22px", borderBottom: "1px solid #ece6da" }}>
              <h2 style={{ fontFamily: serif, fontSize: 20 }}>Daftar pertemuan</h2>
            </div>
            {meetings.length === 0 && (
              <div style={{ padding: 22 }}>
                <EmptyState title="Belum ada pertemuan" />
              </div>
            )}
            {meetings.map((m) => {
              const s = statusPertemuan(m);
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 22px",
                    borderTop: "1px solid var(--color-line-softer)",
                  }}
                >
                  <div
                    style={{
                      width: 62,
                      flex: "none",
                      fontFamily: mono,
                      fontSize: 12.5,
                      color: "var(--color-faint)",
                    }}
                  >
                    PERTEMUAN {m.number}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {m.locked ? (
                      <span style={{ fontSize: 16.5, color: "var(--color-soft)" }}>{m.title}</span>
                    ) : (
                      <Link
                        to={`/belajar/kelas/${c.slug}/pertemuan/${m.number}`}
                        style={{ fontSize: 16.5, fontWeight: 600 }}
                      >
                        {m.title}
                      </Link>
                    )}
                    <div style={{ fontSize: 14, color: "var(--color-soft)", marginTop: 2 }}>
                      {m.locked ? "Belum dibuka" : `${m.done}/${m.total} bagian selesai`}
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
              <Meter percent={percent} label={c.name} />
            </div>
            <div style={{ fontSize: 14, color: "var(--color-faint)", marginTop: 10 }}>
              {terbuka.length} dari {meetings.length} pertemuan terbuka
            </div>
          </Card>
          {(c.deliveryModel || c.weeklyLoad) && (
            <Card tone="sand">
              <div className="eyebrow" style={{ marginBottom: 12 }}>
                Pola belajar
              </div>
              {c.deliveryModel && (
                <div style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--color-body)" }}>
                  {c.deliveryModel}
                </div>
              )}
              {c.weeklyLoad && (
                <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 8 }}>
                  {c.weeklyLoad}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </Shell>
  );
}

/* --- /belajar/jadwal -------------------------------------------- */

type JadwalItem = {
  id: string;
  number: number;
  title: string;
  mode: string;
  liveUrl: string | null;
  livePlatform: string | null;
  location: string | null;
  startsAt: string | null;
  durationMinutes: number;
  subjectName: string;
  subjectSlug: string;
};

export function Jadwal() {
  const jadwal = useResource<JadwalItem[]>("/jadwal");

  return (
    <Shell>
      <PageHeader
        eyebrow="Jadwal"
        title="Agenda caturwulan berjalan"
        lead="Kelas daring, praktik tatap muka, dan pertemuan terjadwal lainnya."
      />

      {jadwal.loading && <div style={{ color: "var(--color-faint)" }}>Memuat jadwal…</div>}
      {jadwal.error && <div role="alert">{jadwal.error}</div>}

      {jadwal.data && jadwal.data.length === 0 && (
        <EmptyState
          title="Belum ada jadwal"
          hint="Jadwal muncul setelah pengampu menetapkan waktu pertemuan."
        />
      )}

      {jadwal.data && jadwal.data.length > 0 && (
        <div style={{ display: "grid", gap: 10 }}>
          {jadwal.data.map((s) => {
            const mulai = s.startsAt ? new Date(s.startsAt) : null;
            return (
              <Card key={s.id} padding={20}>
                <div
                  className="split"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "160px 1fr 150px",
                    gap: 18,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>
                      {mulai
                        ? mulai.toLocaleDateString("id-ID", {
                            weekday: "long",
                            day: "numeric",
                            month: "short",
                          })
                        : "Belum dijadwalkan"}
                    </div>
                    <div style={{ fontSize: 15.5, fontWeight: 700, marginTop: 3 }}>
                      {mulai
                        ? mulai.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <Link
                      to={`/belajar/kelas/${s.subjectSlug}/pertemuan/${s.number}`}
                      style={{ fontSize: 17.5, fontWeight: 600 }}
                    >
                      Pertemuan {s.number}: {s.title}
                    </Link>
                    <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 4 }}>
                      {s.subjectName} · {MODE_LABEL[s.mode] ?? s.mode}
                      {s.location ? ` — ${s.location}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    {s.liveUrl ? (
                      <a
                        href={s.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-solid-sm"
                      >
                        Masuk kelas →
                      </a>
                    ) : (
                      <Badge bg="#ece9e3" fg="#544e45">
                        {MODE_LABEL[s.mode] ?? s.mode}
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

type CatchUp = { subjectName: string; meetingNumber: number; title: string; type: string };

export function Murojaah() {
  const catchUp = useResource<CatchUp[]>("/me/catch-up");
  const catatan = useResource<Catatan[]>("/me/notes");

  return (
    <Shell>
      <PageHeader
        eyebrow="Murojaah"
        title="Mengulang adalah bagian inti, bukan tambahan."
        lead="Materi esensial yang belum Anda selesaikan, agar tertinggal tidak menumpuk."
      />

      <div
        className="split"
        style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 24, alignItems: "start" }}
      >
        <Card padding={24}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Jalur mengejar ketertinggalan
          </div>

          {catchUp.loading && <div style={{ color: "var(--color-faint)" }}>Memuat…</div>}
          {catchUp.error && <div role="alert">{catchUp.error}</div>}

          {catchUp.data && catchUp.data.length === 0 && (
            <EmptyState
              title="Tidak ada yang tertinggal"
              hint="Seluruh materi esensial sudah Anda selesaikan. Gunakan sisa waktu untuk mengulang."
            />
          )}

          {catchUp.data && catchUp.data.length > 0 && (
            <div style={{ display: "grid", gap: 12 }}>
              {catchUp.data.map((c, i) => (
                <div
                  key={`${c.subjectName}-${c.meetingNumber}-${i}`}
                  style={{ border: "1px solid var(--color-line)", borderRadius: 9, padding: "13px 15px" }}
                >
                  <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>
                    {c.subjectName.toUpperCase()} · PERTEMUAN {c.meetingNumber}
                  </div>
                  <div style={{ fontSize: 16.5, fontWeight: 600, marginTop: 5 }}>{c.title}</div>
                  <div style={{ fontSize: 13.5, color: "var(--color-muted)", marginTop: 4 }}>
                    {c.type.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding={24} tone="sand">
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Catatan Anda
          </div>
          {catatan.data && catatan.data.length === 0 && (
            <div style={{ fontSize: 15, color: "var(--color-muted)", lineHeight: 1.6 }}>
              Belum ada catatan. Tulis catatan saat mempelajari materi agar mudah diulang.
            </div>
          )}
          {catatan.data && catatan.data.length > 0 && (
            <div style={{ display: "grid", gap: 12 }}>
              {catatan.data.slice(0, 4).map((n) => (
                <div key={n.id} style={{ fontSize: 15, lineHeight: 1.65, color: "var(--color-body)" }}>
                  {n.body}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 16 }}>
            <Link to="/belajar/catatan" className="btn-sm">
              Semua catatan →
            </Link>
          </div>
        </Card>
      </div>
    </Shell>
  );
}

/* --- /belajar/progress ------------------------------------------ */

export function Progress() {
  const d = useResource<Dasbor>("/me/dashboard");

  if (d.loading) {
    return (
      <Shell>
        <div style={{ color: "var(--color-faint)" }}>Memuat progres…</div>
      </Shell>
    );
  }
  if (d.error || !d.data) {
    return (
      <Shell>
        <EmptyState title="Progres belum dapat dimuat" hint={d.error ?? undefined} />
      </Shell>
    );
  }

  const data = d.data;
  const rata = data.subjects.length
    ? Math.round(data.subjects.reduce((a, s) => a + s.percent, 0) / data.subjects.length)
    : 0;

  return (
    <Shell>
      <PageHeader
        eyebrow={data.tahapan.name}
        title="Progres caturwulan berjalan"
        lead="Yang ditampilkan adalah kemajuan pada caturwulan ini saja — bukan persentase seluruh perjalanan TIA."
      />

      <div
        className="quad"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}
      >
        <Card>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Mata pelajaran
          </div>
          <div style={{ fontFamily: serif, fontSize: 34, lineHeight: 1 }}>
            {data.subjects.length}
          </div>
        </Card>
        <Card>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Penyelesaian
          </div>
          <div style={{ fontFamily: serif, fontSize: 34, lineHeight: 1 }}>{rata}%</div>
        </Card>
        <Card>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Status pendaftaran
          </div>
          <div
            style={{
              fontFamily: serif,
              fontSize: 24,
              lineHeight: 1.2,
              color: "var(--color-forest)",
            }}
          >
            {data.enrollment ? data.enrollment.status : "Belum terdaftar"}
          </div>
        </Card>
      </div>

      <Card padding={24}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>
          Per mata pelajaran
        </div>
        {data.subjects.length === 0 ? (
          <EmptyState title="Belum ada mata pelajaran" />
        ) : (
          <div style={{ display: "grid", gap: 18 }}>
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
                    {s.percent}%
                  </span>
                </div>
                <Meter percent={s.percent} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </Shell>
  );
}

/* --- /belajar/catatan ------------------------------------------- */

type Catatan = {
  id: string;
  materialId: string | null;
  body: string;
  isPrivate: boolean;
  createdAt: string;
};

export function Catatan() {
  const catatan = useResource<Catatan[]>("/me/notes");
  const [isi, setIsi] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!isi.trim()) return;
    setSibuk(true);
    const pesan = await mutate(() => api.post("/me/notes", { body: isi.trim() }));
    setSibuk(false);
    if (pesan) return setGalat(pesan);
    setGalat(null);
    setIsi("");
    catatan.reload();
  }

  return (
    <Shell>
      <PageHeader
        eyebrow="Catatan"
        title="Catatan belajar Anda"
        lead="Catatan bersifat pribadi dan hanya terlihat oleh Anda."
      />

      <Card padding={22} style={{ marginBottom: 20 }}>
        <form onSubmit={simpan}>
          <label className="eyebrow" style={{ display: "block", marginBottom: 8 }}>
            Tulis catatan baru
          </label>
          <textarea
            value={isi}
            onChange={(e) => setIsi(e.target.value)}
            placeholder="Apa yang ingin Anda ingat dari materi hari ini?"
            style={{
              width: "100%",
              minHeight: 96,
              resize: "vertical",
              padding: "11px 13px",
              border: "1px solid var(--color-line)",
              borderRadius: 9,
              background: "var(--color-surface)",
              fontSize: 15.5,
              fontFamily: "inherit",
              color: "var(--color-ink)",
            }}
          />
          {galat && (
            <div role="alert" style={{ marginTop: 10, fontSize: 14.5, color: "#8d4632" }}>
              {galat}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <button
              type="submit"
              className="btn-solid-sm"
              disabled={sibuk || !isi.trim()}
              style={{ opacity: sibuk || !isi.trim() ? 0.55 : 1 }}
            >
              {sibuk ? "Menyimpan…" : "Simpan catatan"}
            </button>
          </div>
        </form>
      </Card>

      {catatan.loading && <div style={{ color: "var(--color-faint)" }}>Memuat catatan…</div>}
      {catatan.error && <div role="alert">{catatan.error}</div>}

      {catatan.data && catatan.data.length === 0 && (
        <EmptyState
          title="Belum ada catatan"
          hint="Catatan pertama Anda akan muncul di sini."
        />
      )}

      {catatan.data && catatan.data.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {catatan.data.map((n) => (
            <Card key={n.id} padding={20}>
              <div style={{ fontSize: 16, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{n.body}</div>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 12.5,
                  color: "var(--color-faint)",
                  marginTop: 10,
                }}
              >
                {new Date(n.createdAt).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
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
  const d = useResource<Dasbor>("/me/dashboard");

  return (
    <Shell>
      <PageHeader eyebrow="Profil" title={user?.name ?? "Profil"} lead={user?.email} />

      <div
        className="split"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}
      >
        <Card padding={24}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Caturwulan berjalan
          </div>
          {d.loading && <div style={{ color: "var(--color-faint)" }}>Memuat…</div>}
          {d.data && (
            <div style={{ fontSize: 15.5, lineHeight: 1.8 }}>
              <div style={{ fontFamily: serif, fontSize: 20 }}>{d.data.tahapan.name}</div>
              {d.data.tahapan.title && (
                <div style={{ color: "var(--color-muted)", marginTop: 4 }}>
                  {d.data.tahapan.title}
                </div>
              )}
              {d.data.enrollment ? (
                <div style={{ marginTop: 14 }}>
                  <div>
                    Status: <strong>{d.data.enrollment.status}</strong>
                  </div>
                  {d.data.enrollment.className && <div>Kelas: {d.data.enrollment.className}</div>}
                  <div style={{ marginTop: 10 }}>
                    <Meter percent={d.data.enrollment.progress} label="Progres tercatat" />
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 12, color: "var(--color-faint)" }}>
                  Anda belum terdaftar pada caturwulan ini.
                </div>
              )}
            </div>
          )}
        </Card>

        <Card padding={24}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>
            Akun
          </div>
          <div style={{ fontSize: 15.5, lineHeight: 1.9 }}>
            <div>
              Nama: <strong>{user?.name}</strong>
            </div>
            <div>Email: {user?.email}</div>
            <div>Peran: {user?.role === "student" ? "Peserta" : user?.role}</div>
          </div>
          <div style={{ marginTop: 18 }}>
            <button type="button" className="btn-sm" onClick={() => signOut()}>
              Keluar
            </button>
          </div>
          <div
            style={{
              fontSize: 13.5,
              color: "var(--color-faint)",
              marginTop: 14,
              lineHeight: 1.6,
            }}
          >
            Perubahan data pribadi — nomor WhatsApp, domisili, pendidikan — dilakukan oleh admin
            akademik. Hubungi mereka bila ada yang perlu diperbarui.
          </div>
        </Card>
      </div>
    </Shell>
  );
}
