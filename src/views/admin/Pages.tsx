import { useState } from "react";
import { Link } from "react-router";
import { api } from "../../lib/api";
import { mutate, useResource } from "../../lib/useApi";
import {
  Badge,
  Card,
  CardTitle,
  DataTable,
  EmptyState,
  PageHeader,
  mono,
  serif,
  type Column,
} from "../../components/ui";
import { Area, Field, FormPanel, Select, Text } from "../../components/form";

/**
 * Halaman admin pendukung: worksheet, kehadiran, nilai, pengajar,
 * pengumuman, dan laporan.
 *
 * Seluruhnya membaca basis data. Rekap nilai dan kehadiran dihitung di
 * server dengan satu query agregat, bukan satu query per peserta.
 */

/* --- tipe bersama -------------------------------------------------- */

type Overview = {
  tahapan: { id: string; name: string; title: string | null };
  totals: { participants: number; onTrack: number; needsFollowUp: number };
  engagement: { engagement: string; n: number }[];
  competency: { competency: string | null; n: number }[];
  needsFollowUp: { userId: string; name: string; email: string; engagement: string }[];
};

type BarisNilai = {
  userId: string;
  name: string;
  email: string;
  className: string | null;
  percobaan: number;
  dinilai: number;
  lulus: number;
  rataRata: number | null;
};

type BarisHadir = {
  userId: string;
  name: string;
  className: string | null;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  tercatat: number;
};

type Pengajar = { id: string; name: string; email: string; title: string | null; bio: string | null };

type Mapel = { id: string; name: string; code: string; role: string; instructorId: string | null };

type PengumumanRow = {
  id: string;
  tahapanId: string | null;
  title: string;
  body: string;
  audience: string;
  status: "draft" | "review" | "published";
  publishedAt: string | null;
  createdAt: string;
};

type Asesmen = {
  id: string;
  title: string;
  kind: string;
  kkm: number;
  publishStatus: string;
  meetingId: string | null;
  subjectId: string | null;
};

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

const STATUS_TERBIT: Record<string, string> = {
  draft: "Draf",
  review: "Tinjau",
  published: "Terbit",
};

function Shell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/* --- Worksheet & Kuis (daftar asesmen) ----------------------------- */

export function Worksheet() {
  const asesmen = useResource<Asesmen[]>("/admin/assessments");

  const rows = (asesmen.data ?? []).filter((a) => a.kind === "latihan" || a.kind === "kuis");

  const kolom: Column<Asesmen>[] = [
    {
      key: "judul",
      head: "ASESMEN",
      width: "2fr",
      render: (a) => (
        <div>
          <div style={{ fontWeight: 700 }}>{a.title}</div>
          <div style={{ fontSize: 13, color: "var(--color-faint)", marginTop: 2 }}>
            KKM {a.kkm}
          </div>
        </div>
      ),
    },
    {
      key: "jenis",
      head: "JENIS",
      width: "1fr",
      render: (a) => <span style={{ fontSize: 14.5 }}>{a.kind}</span>,
    },
    {
      key: "status",
      head: "STATUS",
      width: "1fr",
      render: (a) => (
        <Badge
          bg={a.publishStatus === "published" ? "#e4ede4" : "#ece9e3"}
          fg={a.publishStatus === "published" ? "#2f5638" : "#6b6459"}
        >
          {STATUS_TERBIT[a.publishStatus] ?? a.publishStatus}
        </Badge>
      ),
    },
  ];

  return (
    <Shell>
      <PageHeader
        eyebrow="Penilaian"
        title="Worksheet & Latihan"
        lead="Seluruh latihan dan kuis yang terpasang pada kurikulum."
        actions={
          <Link to="/admin/kuis" className="btn-solid-sm">
            Kelola di Kuis &amp; Ujian →
          </Link>
        }
      />
      <Card padding={20}>
        {asesmen.loading && <div style={{ color: "var(--color-faint)" }}>Memuat…</div>}
        {asesmen.error && <div role="alert">{asesmen.error}</div>}
        {asesmen.data && (
          <DataTable columns={kolom} rows={rows} empty="Belum ada worksheet atau latihan" />
        )}
      </Card>
    </Shell>
  );
}

/* --- Kehadiran ------------------------------------------------------ */

export function Kehadiran() {
  const d = useResource<{ tahapan: string; rows: BarisHadir[] }>("/admin/kehadiran");

  const kolom: Column<BarisHadir>[] = [
    {
      key: "nama",
      head: "PESERTA",
      width: "1.6fr",
      render: (r) => (
        <div>
          <div style={{ fontWeight: 700 }}>{r.name}</div>
          {r.className && (
            <div style={{ fontSize: 13, color: "var(--color-faint)", marginTop: 2 }}>
              {r.className}
            </div>
          )}
        </div>
      ),
    },
    { key: "hadir", head: "HADIR", width: ".7fr", render: (r) => <span style={{ fontFamily: mono }}>{r.hadir}</span> },
    { key: "izin", head: "IZIN", width: ".7fr", secondary: true, render: (r) => <span style={{ fontFamily: mono }}>{r.izin}</span> },
    { key: "sakit", head: "SAKIT", width: ".7fr", secondary: true, render: (r) => <span style={{ fontFamily: mono }}>{r.sakit}</span> },
    { key: "alpa", head: "ALPA", width: ".7fr", render: (r) => <span style={{ fontFamily: mono }}>{r.alpa}</span> },
    {
      key: "persen",
      head: "PERSENTASE",
      width: "1.1fr",
      render: (r) => (
        <span style={{ fontFamily: mono }}>
          {r.tercatat ? Math.round((r.hadir / r.tercatat) * 100) + "%" : "—"}
        </span>
      ),
    },
  ];

  return (
    <Shell>
      <PageHeader
        eyebrow={d.data?.tahapan ?? "Kehadiran"}
        title="Kehadiran"
        lead="Rekap kehadiran peserta pada caturwulan berjalan."
      />
      <Card padding={20}>
        {d.loading && <div style={{ color: "var(--color-faint)" }}>Memuat kehadiran…</div>}
        {d.error && <div role="alert">{d.error}</div>}
        {d.data && (
          <>
            <DataTable columns={kolom} rows={d.data.rows} empty="Belum ada peserta" />
            {d.data.rows.every((r) => r.tercatat === 0) && (
              <div style={{ fontSize: 14.5, color: "var(--color-faint)", marginTop: 14, lineHeight: 1.6 }}>
                Belum ada kehadiran yang tercatat. Baris kehadiran muncul setelah pengampu
                mencatatnya pada pertemuan yang mewajibkan kehadiran.
              </div>
            )}
          </>
        )}
      </Card>
    </Shell>
  );
}

/* --- Nilai ---------------------------------------------------------- */

export function Nilai() {
  const d = useResource<{ tahapan: string; rows: BarisNilai[] }>("/admin/nilai");

  const kolom: Column<BarisNilai>[] = [
    {
      key: "nama",
      head: "PESERTA",
      width: "1.8fr",
      render: (r) => (
        <div>
          <div style={{ fontWeight: 700 }}>{r.name}</div>
          <div style={{ fontSize: 13, color: "var(--color-faint)", marginTop: 2 }}>{r.email}</div>
        </div>
      ),
    },
    {
      key: "kelas",
      head: "KELAS",
      width: ".9fr",
      secondary: true,
      render: (r) => <span style={{ fontSize: 14.5 }}>{r.className ?? "—"}</span>,
    },
    {
      key: "percobaan",
      head: "PERCOBAAN",
      width: ".9fr",
      secondary: true,
      render: (r) => <span style={{ fontFamily: mono }}>{r.percobaan}</span>,
    },
    {
      key: "lulus",
      head: "LULUS",
      width: ".8fr",
      render: (r) => <span style={{ fontFamily: mono }}>{r.lulus}</span>,
    },
    {
      key: "rata",
      head: "RATA-RATA",
      width: "1fr",
      render: (r) =>
        r.rataRata === null ? (
          <span style={{ color: "var(--color-faint)" }}>—</span>
        ) : (
          <span style={{ fontFamily: mono, fontWeight: 700 }}>{r.rataRata}</span>
        ),
    },
  ];

  return (
    <Shell>
      <PageHeader
        eyebrow={d.data?.tahapan ?? "Nilai"}
        title="Nilai"
        lead="Rekap hasil kuis dan ujian peserta pada caturwulan berjalan."
        actions={
          <Link to="/admin/penilaian" className="btn-sm">
            Penilaian esai →
          </Link>
        }
      />
      <Card padding={20}>
        {d.loading && <div style={{ color: "var(--color-faint)" }}>Memuat nilai…</div>}
        {d.error && <div role="alert">{d.error}</div>}
        {d.data && (
          <>
            <DataTable columns={kolom} rows={d.data.rows} empty="Belum ada peserta" />
            {d.data.rows.every((r) => r.percobaan === 0) && (
              <div style={{ fontSize: 14.5, color: "var(--color-faint)", marginTop: 14, lineHeight: 1.6 }}>
                Belum ada percobaan kuis yang tercatat. Angka muncul setelah peserta mengerjakan
                kuis atau ujian.
              </div>
            )}
          </>
        )}
      </Card>
    </Shell>
  );
}

/* --- Pengajar ------------------------------------------------------- */

export function PengajarAdmin() {
  const pengajar = useResource<Pengajar[]>("/admin/instructors");
  const mapel = useResource<Mapel[]>("/admin/subjects");

  return (
    <Shell>
      <PageHeader
        eyebrow="Orang"
        title="Pengajar"
        lead="Pengampu mata pelajaran. Profil dan jabatan disunting di Manajemen Pengguna."
        actions={
          <Link to="/admin/pengguna?role=instructor" className="btn-sm">
            Kelola pengguna →
          </Link>
        }
      />

      {pengajar.loading && <div style={{ color: "var(--color-faint)" }}>Memuat pengajar…</div>}
      {pengajar.error && <div role="alert">{pengajar.error}</div>}

      {pengajar.data && pengajar.data.length === 0 && (
        <EmptyState title="Belum ada pengajar" hint="Tambahkan pengguna berperan Pengajar." />
      )}

      {pengajar.data && pengajar.data.length > 0 && (
        <div style={{ display: "grid", gap: 14 }}>
          {pengajar.data.map((p) => {
            const diampu = (mapel.data ?? []).filter((m) => m.instructorId === p.id);
            return (
              <Card key={p.id} padding={22}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: serif, fontSize: 20 }}>{p.name}</div>
                    <div style={{ fontSize: 14, color: "var(--color-faint)", marginTop: 3 }}>
                      {p.title ?? "Jabatan belum diisi"}
                    </div>
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 13, color: "var(--color-muted)" }}>
                    {diampu.length} mata pelajaran
                  </div>
                </div>
                {p.bio && (
                  <div
                    style={{
                      fontSize: 15.5,
                      lineHeight: 1.65,
                      color: "var(--color-body)",
                      marginTop: 12,
                    }}
                  >
                    {p.bio}
                  </div>
                )}
                {diampu.length > 0 && (
                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {diampu.map((m) => (
                      <Badge key={m.id} bg="#e6ecef" fg="#38525e">
                        {m.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}

/* --- Pengumuman ----------------------------------------------------- */

export function Pengumuman() {
  const list = useResource<PengumumanRow[]>("/admin/announcements");
  const [draf, setDraf] = useState<Partial<PengumumanRow> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function simpan() {
    if (!draf) return;
    setBusy(true);
    const body = {
      title: draf.title,
      body: draf.body,
      audience: draf.audience || "Semua",
      status: draf.status ?? "draft",
    };
    const m = await mutate(() =>
      draf.id
        ? api.patch(`/admin/announcements/${draf.id}`, body)
        : api.post("/admin/announcements", body),
    );
    setBusy(false);
    if (m) return setErr(m);
    setErr(null);
    setDraf(null);
    list.reload();
  }

  async function hapus(id: string) {
    const m = await mutate(() => api.del(`/admin/announcements/${id}`));
    if (m) return setErr(m);
    setErr(null);
    list.reload();
  }

  return (
    <Shell>
      <PageHeader
        eyebrow="Orang"
        title="Pengumuman"
        lead="Pengumuman terbit tampil pada dasbor peserta."
        actions={
          !draf && (
            <button
              type="button"
              className="btn-solid-sm"
              onClick={() => setDraf({ title: "", body: "", audience: "Semua", status: "draft" })}
            >
              + Pengumuman baru
            </button>
          )
        }
      />

      {err && !draf && (
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
          {err}
        </div>
      )}

      {draf && (
        <FormPanel
          title={draf.id ? "Ubah pengumuman" : "Pengumuman baru"}
          error={err}
          busy={busy}
          onSubmit={simpan}
          onCancel={() => {
            setDraf(null);
            setErr(null);
          }}
        >
          <Field label="Judul" span>
            <Text value={draf.title ?? ""} onChange={(v) => setDraf({ ...draf, title: v })} />
          </Field>
          <Field label="Isi" span>
            <Area value={draf.body ?? ""} onChange={(v) => setDraf({ ...draf, body: v })} />
          </Field>
          <Field label="Sasaran">
            <Text value={draf.audience ?? ""} onChange={(v) => setDraf({ ...draf, audience: v })} />
          </Field>
          <Field label="Status">
            <Select
              value={draf.status ?? "draft"}
              onChange={(v) => setDraf({ ...draf, status: v as PengumumanRow["status"] })}
              options={Object.entries(STATUS_TERBIT).map(([value, label]) => ({ value, label }))}
            />
          </Field>
        </FormPanel>
      )}

      {list.loading && <div style={{ color: "var(--color-faint)" }}>Memuat pengumuman…</div>}
      {list.error && <div role="alert">{list.error}</div>}
      {list.data && list.data.length === 0 && <EmptyState title="Belum ada pengumuman" />}

      {list.data && list.data.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {list.data.map((a) => (
            <Card key={a.id} padding={20}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 14,
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{a.title}</div>
                  <div
                    style={{
                      fontSize: 15,
                      lineHeight: 1.65,
                      color: "var(--color-muted)",
                      marginTop: 6,
                    }}
                  >
                    {a.body}
                  </div>
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: 12.5,
                      color: "var(--color-faint)",
                      marginTop: 8,
                    }}
                  >
                    {a.audience.toUpperCase()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Badge
                    bg={a.status === "published" ? "#e4ede4" : "#ece9e3"}
                    fg={a.status === "published" ? "#2f5638" : "#6b6459"}
                  >
                    {STATUS_TERBIT[a.status]}
                  </Badge>
                  <button type="button" className="btn-sm" onClick={() => setDraf({ ...a })}>
                    Ubah
                  </button>
                  <HapusDuaLangkah onConfirm={() => hapus(a.id)} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Shell>
  );
}

/* --- Laporan -------------------------------------------------------- */

export function Laporan() {
  const o = useResource<Overview>("/admin/overview");

  return (
    <Shell>
      <PageHeader
        eyebrow={o.data?.tahapan.name ?? "Laporan"}
        title="Laporan"
        lead="Ringkasan keterlibatan dan capaian peserta pada caturwulan berjalan."
      />

      {o.loading && <div style={{ color: "var(--color-faint)" }}>Memuat laporan…</div>}
      {o.error && <div role="alert">{o.error}</div>}

      {o.data && (
        <>
          <div
            className="quad"
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}
          >
            <Card>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                Peserta
              </div>
              <div style={{ fontFamily: serif, fontSize: 34, lineHeight: 1 }}>
                {o.data.totals.participants}
              </div>
            </Card>
            <Card>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                Sesuai jalur
              </div>
              <div style={{ fontFamily: serif, fontSize: 34, lineHeight: 1 }}>
                {o.data.totals.onTrack}
              </div>
            </Card>
            <Card>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                Perlu tindak lanjut
              </div>
              <div
                style={{
                  fontFamily: serif,
                  fontSize: 34,
                  lineHeight: 1,
                  color: o.data.totals.needsFollowUp ? "#8d4632" : undefined,
                }}
              >
                {o.data.totals.needsFollowUp}
              </div>
            </Card>
          </div>

          <div
            className="split"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}
          >
            <Card padding={22}>
              <CardTitle>Keterlibatan</CardTitle>
              <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                {o.data.engagement.map((e) => (
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

            <Card padding={22}>
              <CardTitle>Capaian</CardTitle>
              <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                {o.data.competency.length === 0 && (
                  <div style={{ color: "var(--color-faint)", fontSize: 15 }}>
                    Belum ada capaian yang dinilai.
                  </div>
                )}
                {o.data.competency.map((c) => (
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
          </div>

          {o.data.needsFollowUp.length > 0 && (
            <Card padding={22} style={{ marginTop: 20 }}>
              <CardTitle aside={`${o.data.needsFollowUp.length} peserta`}>
                Perlu tindak lanjut
              </CardTitle>
              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
                {o.data.needsFollowUp.map((p) => (
                  <div
                    key={p.userId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      border: "1px solid var(--color-line)",
                      borderRadius: 9,
                      padding: "11px 14px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 13, color: "var(--color-faint)" }}>{p.email}</div>
                    </div>
                    <Badge bg="#f7e6e0" fg="#8d4632">
                      {ENGAGEMENT_LABEL[p.engagement] ?? p.engagement}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </Shell>
  );
}

/* --- potongan bersama ----------------------------------------------- */

function HapusDuaLangkah({ onConfirm }: { onConfirm: () => void }) {
  const [siap, setSiap] = useState(false);
  if (!siap) {
    return (
      <button type="button" className="btn-sm" onClick={() => setSiap(true)}>
        Hapus
      </button>
    );
  }
  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      <button
        type="button"
        className="btn-solid-sm"
        style={{ background: "#8d4632", borderColor: "#8d4632" }}
        onClick={onConfirm}
      >
        Ya, hapus
      </button>
      <button type="button" className="btn-sm" onClick={() => setSiap(false)}>
        Batal
      </button>
    </span>
  );
}
