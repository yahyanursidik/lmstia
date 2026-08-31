import { useMemo, useState } from "react";
import { Link } from "react-router";
import { api } from "../../lib/api";
import { mutate, useResource } from "../../lib/useApi";
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
import { Area, Field, FormPanel, Select, Text } from "../../components/form";
import { Combobox } from "../../components/Combobox";
import { Drawer } from "../../components/Drawer";
import { useAuth } from "../../lib/auth";
import SoalEditor from "./SoalEditor";

/**
 * Halaman admin pendukung: worksheet, kehadiran, nilai, pengajar,
 * pengumuman, dan laporan.
 *
 * Seluruhnya membaca basis data. Rekap nilai dan kehadiran dihitung di
 * server dengan satu query agregat, bukan satu query per peserta.
 */

/* --- tipe bersama -------------------------------------------------- */

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

const STATUS_TERBIT: Record<string, string> = {
  draft: "Draf",
  review: "Tinjau",
  published: "Terbit",
};

function Shell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/* --- Worksheet & Latihan -------------------------------------------- */

type AsesmenRow = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  kkm: number;
  durationMinutes: number;
  publishStatus: string;
  programId: string | null;
  tahapanId: string | null;
  subjectId: string | null;
  meetingId: string | null;
  meetingNumber: number | null;
  meetingTitle: string | null;
  subjectName: string | null;
  tahapanName: string | null;
  programName: string | null;
  /* Rantai leluhur yang sudah diselesaikan server — dipakai menyaring latihan
     yang menempel di pertemuan, bukan langsung di mata pelajaran. */
  resolvedSubjectId: string | null;
};

type TahapanRow = { id: string; name: string; programId: string; status: string };
type MapelRow = { id: string; name: string; code: string };
type PertemuanRow = { id: string; number: number; title: string };

/**
 * Worksheet & Latihan.
 *
 * Penelusurannya selalu mulai dari Program, lalu Caturwulan, lalu Mata
 * Pelajaran dan Pertemuan — sama seperti Kuis & Ujian. Tanpa itu, begitu
 * programnya banyak, daftar asesmen menjadi tidak mungkin ditelusuri.
 */
export function Worksheet() {
  const { user } = useAuth();
  const canWrite = user?.role === "academic_admin" || user?.role === "super_admin";

  const programs = useResource<{ id: string; name: string; status: string }[]>("/admin/programs");
  const semuaTahapan = useResource<TahapanRow[]>("/admin/tahapan");

  const [programId, setProgramId] = useState("");
  const [tahapanId, setTahapanId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [soalUntuk, setSoalUntuk] = useState<string | null>(null);
  const [draf, setDraf] = useState<Partial<AsesmenRow> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /* Program aktif dan caturwulan berjalan dipilih otomatis sebagai titik awal. */
  const programAktif =
    programId || programs.data?.find((p) => p.status === "active")?.id || programs.data?.[0]?.id || "";
  const tahapanProgram = (semuaTahapan.data ?? []).filter((t) => t.programId === programAktif);
  const tahapanAktif =
    tahapanId && tahapanProgram.some((t) => t.id === tahapanId)
      ? tahapanId
      : tahapanProgram.find((t) => t.status === "running")?.id || tahapanProgram[0]?.id || "";

  const mapel = useResource<MapelRow[]>(tahapanAktif ? `/admin/subjects?tahapanId=${tahapanAktif}` : null);
  const pertemuan = useResource<PertemuanRow[]>(
    subjectId ? `/admin/meetings?subjectId=${subjectId}` : null,
  );
  const asesmen = useResource<AsesmenRow[]>(
    tahapanAktif ? `/admin/assessments?tahapanId=${tahapanAktif}` : null,
  );

  /* Halaman ini khusus latihan; kuis dan ujian punya halamannya sendiri. */
  const rows = (asesmen.data ?? [])
    .filter((a) => a.kind === "latihan")
    .filter((a) => !subjectId || a.subjectId === subjectId || a.resolvedSubjectId === subjectId)
    .filter((a) => !meetingId || a.meetingId === meetingId);

  async function simpan() {
    if (!draf) return;
    setBusy(true);
    const body: Record<string, unknown> = {
      kind: "latihan",
      title: draf.title,
      description: draf.description || null,
      kkm: draf.kkm ?? 70,
      durationMinutes: draf.durationMinutes ?? 0,
      publishStatus: draf.publishStatus ?? "draft",
    };
    /* Tepat satu induk — dijaga Zod dan CHECK di basis data. */
    if (meetingId) body.meetingId = meetingId;
    else if (subjectId) body.subjectId = subjectId;
    else body.tahapanId = tahapanAktif;

    const m = await mutate(() =>
      draf.id
        ? api.patch(`/admin/assessments/${draf.id}`, {
            title: body.title,
            description: body.description,
            kkm: body.kkm,
            durationMinutes: body.durationMinutes,
            publishStatus: body.publishStatus,
          })
        : api.post("/admin/assessments", body),
    );
    setBusy(false);
    if (m) return setErr(m);
    setErr(null);
    setDraf(null);
    asesmen.reload();
  }

  async function hapus(id: string) {
    const m = await mutate(() => api.del(`/admin/assessments/${id}`));
    if (m) return setErr(m);
    setErr(null);
    asesmen.reload();
  }

  return (
    <Shell>
      <PageHeader
        eyebrow="Penilaian"
        title="Worksheet & Latihan"
        lead="Latihan yang menempel pada caturwulan, mata pelajaran, atau pertemuan tertentu."
        actions={
          canWrite && !draf ? (
            <button
              type="button"
              className="btn-solid-sm"
              onClick={() =>
                setDraf({ title: "", description: "", kkm: 70, durationMinutes: 0, publishStatus: "draft" })
              }
              disabled={!tahapanAktif}
            >
              + Latihan baru
            </button>
          ) : undefined
        }
      />

      {/* --- rantai penelusuran --- */}
      <Card padding={18} style={{ marginBottom: 20 }}>
        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}
        >
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
              Program
            </label>
            <Combobox
              value={programAktif}
              onChange={(v) => {
                setProgramId(v);
                setTahapanId("");
                setSubjectId("");
                setMeetingId("");
              }}
              options={(programs.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
              loading={programs.loading}
              ariaLabel="Program"
            />
          </div>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
              Caturwulan
            </label>
            <Combobox
              value={tahapanAktif}
              onChange={(v) => {
                setTahapanId(v);
                setSubjectId("");
                setMeetingId("");
              }}
              options={tahapanProgram.map((t) => ({
                value: t.id,
                label: t.name,
                hint: t.status === "running" ? "berjalan" : t.status,
              }))}
              emptyText="Program ini belum punya caturwulan"
              ariaLabel="Caturwulan"
            />
          </div>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
              Mata pelajaran
            </label>
            <Combobox
              value={subjectId}
              onChange={(v) => {
                setSubjectId(v);
                setMeetingId("");
              }}
              options={[
                { value: "", label: "Semua mata pelajaran" },
                ...(mapel.data ?? []).map((m) => ({ value: m.id, label: m.name, hint: m.code })),
              ]}
              loading={mapel.loading}
              ariaLabel="Mata pelajaran"
            />
          </div>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
              Pertemuan
            </label>
            <Combobox
              value={meetingId}
              onChange={setMeetingId}
              options={[
                { value: "", label: "Semua pertemuan" },
                ...(pertemuan.data ?? []).map((m) => ({
                  value: m.id,
                  label: `Pertemuan ${m.number}: ${m.title}`,
                })),
              ]}
              disabled={!subjectId}
              emptyText="Pilih mata pelajaran lebih dulu"
              ariaLabel="Pertemuan"
            />
          </div>
        </div>
        <div style={{ fontSize: 13.5, color: "var(--color-faint)", marginTop: 12, lineHeight: 1.6 }}>
          Latihan baru menempel pada tingkat terdalam yang Anda pilih: pertemuan bila dipilih, bila
          tidak mata pelajaran, bila tidak caturwulan.
        </div>
      </Card>

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
          title={draf.id ? `Ubah — ${draf.title}` : "Latihan baru"}
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
          <Field label="Keterangan" span>
            <Area
              value={draf.description ?? ""}
              onChange={(v) => setDraf({ ...draf, description: v })}
            />
          </Field>
          <Field label="KKM" hint="Nilai minimal 0–100.">
            <Text
              value={String(draf.kkm ?? 70)}
              onChange={(v) => setDraf({ ...draf, kkm: Number(v.replace(/\D/g, "")) || 0 })}
            />
          </Field>
          <Field label="Durasi (menit)" hint="0 berarti tanpa batas waktu.">
            <Text
              value={String(draf.durationMinutes ?? 0)}
              onChange={(v) => setDraf({ ...draf, durationMinutes: Number(v.replace(/\D/g, "")) || 0 })}
            />
          </Field>
          <Field label="Status">
            <Select
              value={draf.publishStatus ?? "draft"}
              onChange={(v) => setDraf({ ...draf, publishStatus: v })}
              options={Object.entries(STATUS_TERBIT).map(([value, label]) => ({ value, label }))}
            />
          </Field>
        </FormPanel>
      )}

      <Card padding={20}>
        {asesmen.loading && <div style={{ color: "var(--color-faint)" }}>Memuat latihan…</div>}
        {asesmen.error && <div role="alert">{asesmen.error}</div>}
        {!tahapanAktif && !asesmen.loading && (
          <EmptyState title="Pilih program dan caturwulan lebih dulu" />
        )}
        {tahapanAktif && asesmen.data && rows.length === 0 && (
          <EmptyState
            title="Belum ada latihan pada pilihan ini"
            hint={canWrite ? "Buat latihan baru lewat tombol di atas." : undefined}
          />
        )}

        {rows.length > 0 && (
          <div style={{ display: "grid", gap: 12 }}>
            {rows.map((a) => (
              <div
                key={a.id}
                style={{ border: "1px solid var(--color-line)", borderRadius: 10, padding: 16 }}
              >
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
                    <div className="eyebrow" style={{ marginBottom: 5 }}>
                      {[a.subjectName, a.meetingNumber !== null ? `Pertemuan ${a.meetingNumber}` : null]
                        .filter(Boolean)
                        .join(" · ") || a.tahapanName}
                    </div>
                    <div style={{ fontFamily: serif, fontSize: 19 }}>{a.title}</div>
                    <div
                      style={{
                        fontFamily: mono,
                        fontSize: 12.5,
                        color: "var(--color-faint)",
                        marginTop: 6,
                      }}
                    >
                      KKM {a.kkm}
                      {a.durationMinutes ? ` · ${a.durationMinutes} menit` : " · tanpa batas waktu"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Badge
                      bg={a.publishStatus === "published" ? "#e4ede4" : "#ece9e3"}
                      fg={a.publishStatus === "published" ? "#2f5638" : "#6b6459"}
                    >
                      {STATUS_TERBIT[a.publishStatus] ?? a.publishStatus}
                    </Badge>
                    <button
                      type="button"
                      className="btn-sm"
                      onClick={() => setSoalUntuk(soalUntuk === a.id ? null : a.id)}
                    >
                      {soalUntuk === a.id ? "Tutup soal" : "Soal"}
                    </button>
                    {canWrite && (
                      <>
                        <button type="button" className="btn-sm" onClick={() => setDraf({ ...a })}>
                          Ubah
                        </button>
                        <HapusDuaLangkah onConfirm={() => hapus(a.id)} />
                      </>
                    )}
                  </div>
                </div>
                {soalUntuk === a.id && (
                  <div style={{ marginTop: 16 }}>
                    <SoalEditor assessmentId={a.id} canWrite={canWrite} />
                  </div>
                )}
              </div>
            ))}
          </div>
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

type MapelProgram = {
  id: string;
  tahapanId: string;
  tahapanName: string;
  code: string;
  name: string;
  role: string;
  instructorId: string | null;
  instructorName: string | null;
};

const PERAN_MAPEL: Record<string, string> = {
  INTENSIVE: "Intensif",
  FOUNDATION: "Fondasi",
  COMPANION: "Pendamping",
};

export function PengajarAdmin() {
  const programs = useResource<{ id: string; name: string; status: string }[]>("/admin/programs");
  const pengajar = useResource<Pengajar[]>("/admin/instructors");
  const [programId, setProgramId] = useState("");
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  /* Program aktif dipilih otomatis; penugasan hampir selalu soal yang berjalan. */
  const aktif = programId || programs.data?.find((p) => p.status === "active")?.id || programs.data?.[0]?.id || "";
  const mapel = useResource<MapelProgram[]>(aktif ? `/admin/subjects?programId=${aktif}` : null);

  async function tugaskan(subjectId: string, instructorId: string) {
    setSibuk(subjectId);
    const pesan = await mutate(() =>
      api.patch(`/admin/subjects/${subjectId}`, { instructorId: instructorId || null }),
    );
    setSibuk(null);
    if (pesan) return setErr(pesan);
    setErr(null);
    mapel.reload();
    pengajar.reload();
  }

  const opsiPengajar = [
    { value: "", label: "— belum ditugaskan —" },
    ...(pengajar.data ?? []).map((p) => ({ value: p.id, label: p.name, hint: p.title ?? undefined })),
  ];

  const belumDitugaskan = (mapel.data ?? []).filter((m) => !m.instructorId).length;

  return (
    <Shell>
      <PageHeader
        eyebrow="Orang"
        title="Pengajar"
        lead="Tugaskan pengajar ke mata pelajaran dalam satu program. Profil dan jabatan disunting di Manajemen Pengguna."
        actions={
          <Link to="/admin/pengguna" className="btn-sm">
            Kelola pengguna →
          </Link>
        }
      />

      {err && (
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

      <Card padding={18} style={{ marginBottom: 20 }}>
        <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
          Program
        </label>
        <div style={{ maxWidth: 420 }}>
          <Combobox
            value={aktif}
            onChange={setProgramId}
            options={(programs.data ?? []).map((p) => ({
              value: p.id,
              label: p.name,
              hint: p.status === "active" ? "aktif" : p.status,
            }))}
            loading={programs.loading}
            ariaLabel="Program"
          />
        </div>
        {belumDitugaskan > 0 && (
          <div style={{ fontSize: 14.5, color: "#8a6a25", marginTop: 12 }}>
            {belumDitugaskan} mata pelajaran belum punya pengajar.
          </div>
        )}
      </Card>

      {/* --- penugasan per mata pelajaran --- */}
      <Card padding={20} style={{ marginBottom: 22 }}>
        <CardTitle aside={`${(mapel.data ?? []).length} mata pelajaran`}>
          Penugasan mata pelajaran
        </CardTitle>

        {mapel.loading && (
          <div style={{ color: "var(--color-faint)", marginTop: 12 }}>Memuat mata pelajaran…</div>
        )}
        {mapel.error && <div role="alert">{mapel.error}</div>}
        {mapel.data && mapel.data.length === 0 && (
          <EmptyState
            title="Program ini belum punya mata pelajaran"
            hint="Tambahkan tahapan dan mata pelajaran di Portofolio Kurikulum."
          />
        )}

        {mapel.data && mapel.data.length > 0 && (
          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            {mapel.data.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr",
                  gap: 16,
                  alignItems: "center",
                  border: "1px solid var(--color-line)",
                  borderRadius: 9,
                  padding: "13px 15px",
                }}
                className="split"
              >
                <div style={{ minWidth: 0 }}>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>
                    {m.tahapanName} · {PERAN_MAPEL[m.role] ?? m.role}
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {m.name}{" "}
                    <span style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>
                      {m.code}
                    </span>
                  </div>
                </div>
                <div style={{ opacity: sibuk === m.id ? 0.55 : 1 }}>
                  <Combobox
                    value={m.instructorId ?? ""}
                    onChange={(v) => tugaskan(m.id, v)}
                    options={opsiPengajar}
                    disabled={sibuk === m.id}
                    ariaLabel={`Pengajar untuk ${m.name}`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* --- ringkasan per pengajar --- */}
      <CardTitle>Pengajar</CardTitle>
      {pengajar.loading && <div style={{ color: "var(--color-faint)" }}>Memuat pengajar…</div>}
      {pengajar.data && pengajar.data.length === 0 && (
        <EmptyState title="Belum ada pengajar" hint="Tambahkan pengguna berperan Pengajar." />
      )}
      {pengajar.data && pengajar.data.length > 0 && (
        <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
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

/* --- Laporan progres per program ------------------------------------ */

type BarisLaporan = {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  tahapanName: string;
  className: string | null;
  status: string;
  engagement: string;
  competency: string | null;
  lastActiveAt: string | null;
  materi: { total: number; selesai: number; persen: number };
  kehadiran: { hadir: number; izin: number; sakit: number; alpa: number; tercatat: number; persen: number };
  asesmen: { percobaan: number; dinilai: number; menunggu: number; lulus: number; rataRata: number | null };
};

type LaporanProgram = {
  program: { id: string; name: string };
  ringkasan: {
    peserta: number;
    rataMateri: number;
    selesaiPenuh: number;
    belumMulai: number;
    adaKehadiran: boolean;
    adaAsesmen: boolean;
  };
  rows: BarisLaporan[];
};

type RincianPeserta = {
  peserta: { id: string; name: string; email: string; phone: string | null; city: string | null; province: string | null };
  pendaftaran: { id: string; tahapanName: string; status: string; className: string | null; progress: number }[];
  mapel: { subjectId: string; subjectName: string; tahapanName: string; role: string; total: number; selesai: number; persen: number }[];
  asesmen: {
    attemptId: string;
    title: string;
    kind: string;
    kkm: number;
    status: string;
    score: number | null;
    passed: boolean | null;
    submittedAt: string | null;
    subjectName: string | null;
    meetingNumber: number | null;
  }[];
};

const PERAN_MAPEL_LAP: Record<string, string> = {
  INTENSIVE: "Intensif",
  FOUNDATION: "Fondasi",
  COMPANION: "Pendamping",
};

const STATUS_PERCOBAAN: Record<string, string> = {
  berlangsung: "Berlangsung",
  menunggu_penilaian: "Menunggu penilaian",
  dinilai: "Dinilai",
};

const tanggalSingkat = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";

export function Laporan() {
  const programs = useResource<{ id: string; name: string; status: string }[]>("/admin/programs");
  const [programId, setProgramId] = useState("");
  const [q, setQ] = useState("");
  const [buka, setBuka] = useState<string | null>(null);

  const aktif =
    programId || programs.data?.find((p) => p.status === "active")?.id || programs.data?.[0]?.id || "";
  const lap = useResource<LaporanProgram>(aktif ? `/admin/laporan/program/${aktif}` : null);
  const rinci = useResource<RincianPeserta>(
    buka && aktif ? `/admin/laporan/peserta/${buka}?programId=${aktif}` : null,
  );

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return lap.data?.rows ?? [];
    return (lap.data?.rows ?? []).filter(
      (r) =>
        r.name.toLowerCase().includes(k) ||
        r.email.toLowerCase().includes(k) ||
        (r.className ?? "").toLowerCase().includes(k),
    );
  }, [lap.data, q]);

  function unduhCsv() {
    if (!lap.data) return;
    const judul = [
      "nama", "email", "nomor_wa", "kota", "caturwulan", "kelas", "status",
      "materi_selesai", "materi_total", "materi_persen",
      "hadir", "izin", "sakit", "alpa", "kehadiran_persen",
      "percobaan", "lulus", "rata_rata",
    ];
    const kutip = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const baris = lap.data.rows.map((r) =>
      [
        r.name, r.email, r.phone, r.city, r.tahapanName, r.className, r.status,
        r.materi.selesai, r.materi.total, r.materi.persen,
        r.kehadiran.hadir, r.kehadiran.izin, r.kehadiran.sakit, r.kehadiran.alpa, r.kehadiran.persen,
        r.asesmen.percobaan, r.asesmen.lulus, r.asesmen.rataRata,
      ].map(kutip).join(","),
    );
    const blob = new Blob(["﻿" + [judul.join(","), ...baris].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `laporan-progres-${lap.data.program.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const kolom: Column<BarisLaporan>[] = [
    {
      key: "nama",
      head: "PESERTA",
      width: "1.7fr",
      render: (r) => (
        <button
          type="button"
          onClick={() => setBuka(buka === r.userId ? null : r.userId)}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            textAlign: "left",
            cursor: "pointer",
            font: "inherit",
            color: "inherit",
          }}
        >
          <div style={{ fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3 }}>
            {r.name}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-faint)", marginTop: 2 }}>
            {r.tahapanName}
            {r.className ? ` · ${r.className}` : ""}
          </div>
        </button>
      ),
    },
    {
      key: "materi",
      head: "MATERI",
      width: "1.3fr",
      render: (r) => (
        <div>
          <div style={{ fontFamily: mono, fontSize: 13.5 }}>
            {r.materi.selesai}/{r.materi.total} · {r.materi.persen}%
          </div>
          <div style={{ marginTop: 5 }}>
            <Meter percent={r.materi.persen} />
          </div>
        </div>
      ),
    },
    {
      key: "hadir",
      head: "KEHADIRAN",
      width: "1fr",
      secondary: true,
      render: (r) =>
        r.kehadiran.tercatat === 0 ? (
          <span style={{ color: "var(--color-faint)" }}>—</span>
        ) : (
          <span style={{ fontFamily: mono, fontSize: 13.5 }}>
            {r.kehadiran.hadir}/{r.kehadiran.tercatat} · {r.kehadiran.persen}%
          </span>
        ),
    },
    {
      key: "nilai",
      head: "NILAI",
      width: "1fr",
      render: (r) =>
        r.asesmen.percobaan === 0 ? (
          <span style={{ color: "var(--color-faint)" }}>—</span>
        ) : (
          <span style={{ fontFamily: mono, fontSize: 13.5 }}>
            {r.asesmen.rataRata ?? "—"}
            <span style={{ color: "var(--color-faint)" }}> · lulus {r.asesmen.lulus}</span>
            {r.asesmen.menunggu > 0 && (
              <span style={{ color: "#8a6a25" }}> · {r.asesmen.menunggu} menunggu</span>
            )}
          </span>
        ),
    },
    {
      key: "keterlibatan",
      head: "KETERLIBATAN",
      width: "1.1fr",
      render: (r) => {
        const tone = ENGAGEMENT_TONE[r.engagement] ?? ENGAGEMENT_TONE.inactive!;
        return (
          <Badge bg={tone.bg} fg={tone.fg}>
            {ENGAGEMENT_LABEL[r.engagement] ?? r.engagement}
          </Badge>
        );
      },
    },
  ];

  const s = lap.data?.ringkasan;

  return (
    <Shell>
      <PageHeader
        eyebrow="Laporan"
        title="Progres Peserta"
        lead="Perkembangan setiap peserta pada satu program: penyelesaian materi, kehadiran, dan hasil asesmen."
        actions={
          lap.data && lap.data.rows.length > 0 ? (
            <button type="button" className="btn-sm" onClick={unduhCsv}>
              Unduh CSV
            </button>
          ) : undefined
        }
      />

      <Card padding={18} style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
              Program
            </label>
            <Combobox
              value={aktif}
              onChange={(v) => {
                setProgramId(v);
                setBuka(null);
              }}
              options={(programs.data ?? []).map((p) => ({
                value: p.id,
                label: p.name,
                hint: p.status === "active" ? "aktif" : p.status,
              }))}
              loading={programs.loading}
              ariaLabel="Program"
            />
          </div>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
              Cari peserta
            </label>
            <input
              type="search"
              value={q}
              placeholder="Nama, email, atau kelas…"
              onChange={(e) => setQ(e.target.value)}
              style={{
                width: "100%",
                padding: "11px 13px",
                border: "1px solid var(--color-line)",
                borderRadius: 9,
                background: "var(--color-surface)",
                fontSize: 15.5,
                fontFamily: "inherit",
                color: "var(--color-ink)",
              }}
            />
          </div>
        </div>
      </Card>

      {lap.loading && <div style={{ color: "var(--color-faint)" }}>Memuat laporan…</div>}
      {lap.error && <div role="alert">{lap.error}</div>}

      {s && (
        <div
          className="quad"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 22 }}
        >
          <Card>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Peserta
            </div>
            <div style={{ fontFamily: serif, fontSize: 32, lineHeight: 1 }}>{s.peserta}</div>
          </Card>
          <Card>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Rata-rata materi
            </div>
            <div style={{ fontFamily: serif, fontSize: 32, lineHeight: 1 }}>{s.rataMateri}%</div>
          </Card>
          <Card>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Selesai penuh
            </div>
            <div style={{ fontFamily: serif, fontSize: 32, lineHeight: 1 }}>{s.selesaiPenuh}</div>
          </Card>
          <Card>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Belum mulai
            </div>
            <div
              style={{
                fontFamily: serif,
                fontSize: 32,
                lineHeight: 1,
                color: s.belumMulai ? "#8a6a25" : undefined,
              }}
            >
              {s.belumMulai}
            </div>
          </Card>
        </div>
      )}

      {/* Rincian sebagai panel geser: tabel tetap di tempatnya. */}
      <Drawer
        open={!!buka}
        onClose={() => setBuka(null)}
        title={rinci.data?.peserta.name ?? "Memuat…"}
        subtitle={
          rinci.data
            ? [rinci.data.peserta.email, rinci.data.peserta.phone, rinci.data.peserta.city]
                .filter(Boolean)
                .join(" · ")
            : undefined
        }
      >
        <>
          {rinci.loading && <div style={{ color: "var(--color-faint)" }}>Memuat rincian…</div>}
          {rinci.data && (
            <>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                Progres per mata pelajaran
              </div>
              {rinci.data.mapel.length === 0 ? (
                <EmptyState title="Belum ada materi terbit pada program ini" />
              ) : (
                <div style={{ display: "grid", gap: 14, marginBottom: 20 }}>
                  {rinci.data.mapel.map((m) => (
                    <div key={m.subjectId}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          marginBottom: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>
                          {m.subjectName}{" "}
                          <span style={{ fontSize: 13, color: "var(--color-faint)", fontWeight: 400 }}>
                            {m.tahapanName} · {PERAN_MAPEL_LAP[m.role] ?? m.role}
                          </span>
                        </span>
                        <span style={{ fontFamily: mono, fontSize: 13.5, color: "var(--color-faint)" }}>
                          {m.selesai}/{m.total} · {m.persen}%
                        </span>
                      </div>
                      <Meter percent={m.persen} />
                    </div>
                  ))}
                </div>
              )}

              <div className="eyebrow" style={{ marginBottom: 10 }}>
                Hasil asesmen
              </div>
              {rinci.data.asesmen.length === 0 ? (
                <div style={{ fontSize: 15, color: "var(--color-faint)", lineHeight: 1.6 }}>
                  Belum ada kuis atau ujian yang dikerjakan pada program ini.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {rinci.data.asesmen.map((a) => (
                    <div
                      key={a.attemptId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        border: "1px solid var(--color-line)",
                        borderRadius: 9,
                        padding: "11px 14px",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{a.title}</div>
                        <div style={{ fontSize: 13, color: "var(--color-faint)", marginTop: 2 }}>
                          {[a.subjectName, a.meetingNumber !== null ? `Pertemuan ${a.meetingNumber}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                          {" · "}
                          {tanggalSingkat(a.submittedAt)}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: mono, fontSize: 13.5, color: "var(--color-faint)" }}>
                          KKM {a.kkm}
                        </span>
                        {a.score === null ? (
                          <Badge bg="#f6eddb" fg="#8a6a25">
                            {STATUS_PERCOBAAN[a.status] ?? a.status}
                          </Badge>
                        ) : (
                          <Badge
                            bg={a.passed ? "#e4ede4" : "#f7e6e0"}
                            fg={a.passed ? "#2f5638" : "#8d4632"}
                          >
                            {a.score} · {a.passed ? "Lulus" : "Belum lulus"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      </Drawer>

      <Card padding={20}>
        {lap.data && (
          <>
            <DataTable
              columns={kolom}
              rows={rows}
              empty={q ? "Tidak ada peserta yang cocok" : "Program ini belum punya peserta terdaftar"}
            />
            {s && !s.adaKehadiran && !s.adaAsesmen && lap.data.rows.length > 0 && (
              <div style={{ fontSize: 14.5, color: "var(--color-faint)", marginTop: 14, lineHeight: 1.6 }}>
                Kolom kehadiran dan nilai masih kosong karena belum ada kehadiran yang dicatat dan
                belum ada kuis yang dikerjakan — bukan karena peserta tidak hadir atau tidak lulus.
              </div>
            )}
          </>
        )}
      </Card>
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
