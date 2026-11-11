import { useMemo, useState } from "react";
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
  type Column,
} from "../../components/ui";
import { Area, Field, FormPanel, Select, Text } from "../../components/form";
import { Drawer } from "../../components/Drawer";
import { DeleteButton } from "../../components/form";

/**
 * Halaqoh / rombel.
 *
 * Satu layar untuk tiga pekerjaan yang saling bergantung: membentuk rombel,
 * menugaskan pengampu tiap mata pelajarannya, dan menempatkan peserta ke
 * dalamnya. Dipisah menjadi tiga halaman akan memaksa admin berpindah-pindah
 * untuk satu keputusan yang sebenarnya tunggal.
 */

export const HARI = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Ahad"];

const MODE_LABEL: Record<string, string> = {
  online: "Daring",
  offline: "Luring",
  hybrid: "Hibrida",
  mandiri: "Mandiri",
};

const STATUS_WARNA: Record<string, { bg: string; fg: string }> = {
  draft: { bg: "#efe9df", fg: "#6d665c" },
  aktif: { bg: "#e4ede4", fg: "#2f5638" },
  selesai: { bg: "#e7eaf0", fg: "#44506b" },
};

type Program = { id: string; name: string };
type Tahapan = { id: string; name: string; programId: string; status: string };
type Mapel = { id: string; name: string };
type Pengajar = {
  id: string;
  name: string;
  email: string;
  halaqohDiampu: number;
  mapelDiampu: number;
  halaqohDibina: number;
};

type Halaqoh = {
  id: string;
  tahapanId: string;
  tahapanName: string;
  code: string;
  name: string;
  gender: "ikhwan" | "akhwat" | null;
  instructorId: string | null;
  instructorName: string | null;
  capacity: number | null;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  mode: string;
  location: string | null;
  liveUrl: string | null;
  waGroupUrl: string | null;
  note: string | null;
  status: "draft" | "aktif" | "selesai";
  sequence: number;
  peserta: number;
  mapel: number;
};

type Penugasan = {
  id: string;
  halaqohId: string;
  subjectId: string;
  subjectName: string;
  instructorId: string;
  instructorName: string;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  mode: string;
  location: string | null;
  liveUrl: string | null;
};

type Peserta = {
  enrollmentId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  halaqohId: string | null;
  halaqohName: string | null;
};

type Detail = Halaqoh & { penugasan: Penugasan[]; pesertaDaftar: Peserta[] };

/** "19:30–21:00" bila lengkap, "—" bila jadwalnya memang belum ditetapkan. */
export function ringkasJadwal(v: {
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
}) {
  if (v.dayOfWeek === null || !v.startTime || !v.endTime) return "—";
  return `${HARI[v.dayOfWeek]} ${v.startTime}–${v.endTime}`;
}

const kosongJadiNull = (v: string) => (v.trim() === "" ? null : v.trim());

export default function HalaqohAdmin() {
  const programs = useResource<Program[]>("/programs");
  const [programId, setProgramId] = useState("");

  const tahapan = useResource<Tahapan[]>(programId ? `/tahapan?programId=${programId}` : "/tahapan");
  const [tahapanId, setTahapanId] = useState("");

  const kueri = useMemo(() => {
    const p = new URLSearchParams();
    if (tahapanId) p.set("tahapanId", tahapanId);
    else if (programId) p.set("programId", programId);
    return p.toString();
  }, [programId, tahapanId]);

  const daftar = useResource<Halaqoh[]>(`/admin/halaqoh?${kueri}`);
  const pengajar = useResource<Pengajar[]>("/admin/halaqoh/pengajar/daftar");
  const mapel = useResource<Mapel[]>(tahapanId ? `/admin/subjects?tahapanId=${tahapanId}` : null);

  const [buka, setBuka] = useState<string | null>(null);
  const detail = useResource<Detail>(buka ? `/admin/halaqoh/${buka}` : null);

  const [draf, setDraf] = useState<Partial<Halaqoh> | null>(null);
  const [tugas, setTugas] = useState<Partial<Penugasan> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const d = detail.data;

  const opsiPengajar = [
    { value: "", label: "— belum ditentukan —" },
    ...(pengajar.data ?? []).map((p) => ({ value: p.id, label: p.name })),
  ];

  function segarkan() {
    daftar.reload();
    if (buka) detail.reload();
  }

  /* --- halaqoh --- */

  async function simpanHalaqoh() {
    if (!draf) return;
    setBusy(true);
    const body = {
      tahapanId: draf.tahapanId || tahapanId,
      code: draf.code ?? "",
      name: draf.name ?? "",
      gender: draf.gender || null,
      instructorId: draf.instructorId || null,
      capacity: draf.capacity ?? null,
      dayOfWeek: draf.dayOfWeek ?? null,
      startTime: draf.startTime || null,
      endTime: draf.endTime || null,
      mode: draf.mode ?? "online",
      location: kosongJadiNull(draf.location ?? ""),
      liveUrl: kosongJadiNull(draf.liveUrl ?? ""),
      waGroupUrl: kosongJadiNull(draf.waGroupUrl ?? ""),
      note: kosongJadiNull(draf.note ?? ""),
      status: draf.status ?? "draft",
      sequence: draf.sequence ?? 1,
    };
    const m = await mutate(() =>
      draf.id ? api.patch(`/admin/halaqoh/${draf.id}`, body) : api.post("/admin/halaqoh", body),
    );
    setBusy(false);
    if (m) return setErr(m);
    setErr(null);
    setDraf(null);
    segarkan();
  }

  async function hapusHalaqoh(id: string) {
    const m = await mutate(() => api.del(`/admin/halaqoh/${id}`));
    if (m) return setErr(m);
    setErr(null);
    setBuka(null);
    daftar.reload();
  }

  /* --- penugasan --- */

  async function simpanTugas() {
    if (!tugas || !buka) return;
    setBusy(true);
    const body = {
      halaqohId: buka,
      subjectId: tugas.subjectId ?? "",
      instructorId: tugas.instructorId ?? "",
      dayOfWeek: tugas.dayOfWeek ?? null,
      startTime: tugas.startTime || null,
      endTime: tugas.endTime || null,
      mode: tugas.mode ?? "online",
      location: kosongJadiNull(tugas.location ?? ""),
      liveUrl: kosongJadiNull(tugas.liveUrl ?? ""),
    };
    const m = await mutate(() =>
      tugas.id
        ? api.patch(`/admin/halaqoh/penugasan/${tugas.id}`, body)
        : api.post("/admin/halaqoh/penugasan", body),
    );
    setBusy(false);
    if (m) return setErr(m);
    setErr(null);
    setTugas(null);
    detail.reload();
  }

  async function hapusTugas(id: string) {
    const m = await mutate(() => api.del(`/admin/halaqoh/penugasan/${id}`));
    if (m) return setErr(m);
    setErr(null);
    detail.reload();
  }

  async function keluarkan(enrollmentId: string) {
    const m = await mutate(() =>
      api.post("/admin/halaqoh/peserta/pindah", {
        enrollmentIds: [enrollmentId],
        halaqohId: null,
      }),
    );
    if (m) return setErr(m);
    setErr(null);
    segarkan();
  }

  const kolom: Column<Halaqoh>[] = [
    {
      key: "nama",
      head: "HALAQOH",
      width: "1.6fr",
      render: (r) => (
        <button
          type="button"
          onClick={() => {
            setBuka(r.id);
            setTugas(null);
            setErr(null);
          }}
          style={{
            background: "none",
            border: 0,
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
          <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>
            {r.code} · {r.tahapanName}
          </div>
        </button>
      ),
    },
    {
      key: "ustadz",
      head: "PENANGGUNG JAWAB",
      width: "1.1fr",
      render: (r) =>
        r.instructorName ?? <span style={{ color: "var(--color-faint)" }}>belum ada</span>,
    },
    {
      key: "jadwal",
      head: "JADWAL",
      width: "1fr",
      render: (r) => <span style={{ fontFamily: mono, fontSize: 13 }}>{ringkasJadwal(r)}</span>,
    },
    {
      key: "isi",
      head: "PESERTA",
      width: ".8fr",
      render: (r) => (
        <span style={{ fontFamily: mono, fontSize: 13 }}>
          {r.peserta}
          {r.capacity ? ` / ${r.capacity}` : ""}
        </span>
      ),
    },
    {
      key: "mapel",
      head: "MAPEL",
      width: ".6fr",
      render: (r) => <span style={{ fontFamily: mono, fontSize: 13 }}>{r.mapel}</span>,
    },
    {
      key: "status",
      head: "STATUS",
      width: ".8fr",
      render: (r) => (
        <Badge bg={STATUS_WARNA[r.status]!.bg} fg={STATUS_WARNA[r.status]!.fg}>
          {r.status === "draft" ? "Draf" : r.status === "aktif" ? "Aktif" : "Selesai"}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Akademik"
        title="Halaqoh & Rombel"
        lead="Satu caturwulan boleh punya satu halaqoh atau banyak. Setiap halaqoh punya ustadz penanggung jawab, jadwal, dan pengampu untuk tiap mata pelajarannya."
        actions={
          <button
            type="button"
            className="btn-solid-sm"
            disabled={!tahapanId}
            onClick={() => {
              setDraf({ tahapanId, mode: "online", status: "draft", sequence: 1 });
              setErr(null);
            }}
          >
            Tambah halaqoh
          </button>
        }
      />

      <Card padding={18} style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Program">
            <Select
              value={programId}
              onChange={(v) => {
                setProgramId(v);
                setTahapanId("");
              }}
              options={[
                { value: "", label: "— semua program —" },
                ...(programs.data ?? []).map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </Field>
          <Field
            label="Caturwulan"
            hint={tahapanId ? undefined : "Pilih caturwulan untuk menambah halaqoh."}
          >
            <Select
              value={tahapanId}
              onChange={setTahapanId}
              options={[
                { value: "", label: "— semua caturwulan —" },
                ...(tahapan.data ?? []).map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
          </Field>
        </div>
      </Card>

      {err && !draf && !tugas && (
        <div role="alert" className="alert-error" style={{ marginBottom: 16 }}>
          {err}
        </div>
      )}

      {draf && (
        <FormPanel
          title={draf.id ? `Ubah — ${draf.name}` : "Halaqoh baru"}
          error={err}
          busy={busy}
          onSubmit={simpanHalaqoh}
          onCancel={() => {
            setDraf(null);
            setErr(null);
          }}
        >
          <Field label="Kode" hint="Singkat dan khas, mis. IKH-A.">
            <Text value={draf.code ?? ""} onChange={(v) => setDraf({ ...draf, code: v })} />
          </Field>
          <Field label="Nama halaqoh">
            <Text
              value={draf.name ?? ""}
              onChange={(v) => setDraf({ ...draf, name: v })}
              placeholder="Halaqoh Ikhwan A"
            />
          </Field>

          <Field label="Ikhwan / Akhwat" hint="Kosongkan bila halaqoh campuran.">
            <Select
              value={draf.gender ?? ""}
              onChange={(v) => setDraf({ ...draf, gender: (v || null) as Halaqoh["gender"] })}
              options={[
                { value: "", label: "— campuran —" },
                { value: "ikhwan", label: "Ikhwan" },
                { value: "akhwat", label: "Akhwat" },
              ]}
            />
          </Field>
          <Field label="Ustadz penanggung jawab">
            <Select
              value={draf.instructorId ?? ""}
              onChange={(v) => setDraf({ ...draf, instructorId: v || null })}
              options={opsiPengajar}
            />
          </Field>

          <Field label="Daya tampung" hint="Kosongkan bila tanpa batas.">
            <Text
              type="number"
              value={draf.capacity === null || draf.capacity === undefined ? "" : String(draf.capacity)}
              onChange={(v) => setDraf({ ...draf, capacity: v === "" ? null : Number(v) })}
              placeholder="tanpa batas"
            />
          </Field>
          <Field label="Status">
            <Select
              value={draf.status ?? "draft"}
              onChange={(v) => setDraf({ ...draf, status: v as Halaqoh["status"] })}
              options={[
                { value: "draft", label: "Draf" },
                { value: "aktif", label: "Aktif" },
                { value: "selesai", label: "Selesai" },
              ]}
            />
          </Field>

          <Field label="Hari" hint="Isi hari dan kedua jamnya sekaligus, atau kosongkan ketiganya.">
            <Select
              value={draf.dayOfWeek ? String(draf.dayOfWeek) : ""}
              onChange={(v) => setDraf({ ...draf, dayOfWeek: v ? Number(v) : null })}
              options={[
                { value: "", label: "— belum dijadwalkan —" },
                ...HARI.slice(1).map((h, i) => ({ value: String(i + 1), label: h })),
              ]}
            />
          </Field>
          <Field label="Jam">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Text
                type="time"
                value={draf.startTime ?? ""}
                onChange={(v) => setDraf({ ...draf, startTime: v })}
              />
              <span style={{ color: "var(--color-faint)" }}>–</span>
              <Text
                type="time"
                value={draf.endTime ?? ""}
                onChange={(v) => setDraf({ ...draf, endTime: v })}
              />
            </div>
          </Field>

          <Field label="Mode">
            <Select
              value={draf.mode ?? "online"}
              onChange={(v) => setDraf({ ...draf, mode: v })}
              options={Object.entries(MODE_LABEL).map(([value, label]) => ({ value, label }))}
            />
          </Field>
          <Field label="Lokasi" hint="Untuk halaqoh luring atau hibrida.">
            <Text value={draf.location ?? ""} onChange={(v) => setDraf({ ...draf, location: v })} />
          </Field>

          <Field label="Tautan ruang daring">
            <Text value={draf.liveUrl ?? ""} onChange={(v) => setDraf({ ...draf, liveUrl: v })} />
          </Field>
          <Field label="Grup WhatsApp halaqoh">
            <Text
              value={draf.waGroupUrl ?? ""}
              onChange={(v) => setDraf({ ...draf, waGroupUrl: v })}
            />
          </Field>

          <Field label="Catatan" span>
            <Area value={draf.note ?? ""} onChange={(v) => setDraf({ ...draf, note: v })} rows={2} />
          </Field>
        </FormPanel>
      )}

      {daftar.loading && <div style={{ color: "var(--color-faint)" }}>Memuat halaqoh…</div>}
      {daftar.error && <div role="alert">{daftar.error}</div>}
      {daftar.data && (
        <DataTable
          columns={kolom}
          rows={daftar.data}
          empty={
            tahapanId
              ? "Caturwulan ini belum punya halaqoh. Tanpa halaqoh, seluruh peserta dianggap satu kelas."
              : "Belum ada halaqoh."
          }
        />
      )}

      {/* --- rincian: panel geser --- */}
      <Drawer
        open={!!buka}
        onClose={() => {
          setBuka(null);
          setTugas(null);
          setErr(null);
        }}
        title={d?.name ?? "Memuat…"}
        subtitle={d ? `${d.code} · ${d.tahapanName}` : undefined}
        actions={
          d ? (
            <>
              <button
                type="button"
                className="btn-solid-sm"
                onClick={() => {
                  setDraf({ ...d });
                  setBuka(null);
                }}
              >
                Ubah
              </button>
              <DeleteButton onConfirm={() => hapusHalaqoh(d.id)} />
            </>
          ) : undefined
        }
      >
        <>
          {detail.loading && <div style={{ color: "var(--color-faint)" }}>Memuat rincian…</div>}
          {detail.error && <div role="alert">{detail.error}</div>}
          {err && (
            <div role="alert" className="alert-error" style={{ marginBottom: 14 }}>
              {err}
            </div>
          )}

          {d && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: 15,
                  marginBottom: 22,
                }}
              >
                <Baris label="Penanggung jawab" nilai={d.instructorName} />
                <Baris label="Jadwal" nilai={ringkasJadwal(d)} mono />
                <Baris label="Mode" nilai={MODE_LABEL[d.mode] ?? d.mode} />
                <Baris
                  label="Peserta"
                  nilai={`${d.peserta}${d.capacity ? ` dari ${d.capacity}` : " (tanpa batas)"}`}
                  mono
                />
                <Baris
                  label="Ikhwan/Akhwat"
                  nilai={d.gender ? (d.gender === "ikhwan" ? "Ikhwan" : "Akhwat") : "Campuran"}
                />
                <Baris label="Lokasi" nilai={d.location} />
              </div>

              {/* --- penugasan pengampu --- */}
              <CardTitle
                aside={
                  !tugas && (
                    <button
                      type="button"
                      className="btn-sm"
                      onClick={() => {
                        setTugas({ halaqohId: d.id, mode: "online" });
                        setErr(null);
                      }}
                    >
                      Tugaskan pengampu
                    </button>
                  )
                }
              >
                Pengampu mata pelajaran
              </CardTitle>

              {tugas && (
                <FormPanel
                  title={tugas.id ? "Ubah penugasan" : "Penugasan baru"}
                  error={err}
                  busy={busy}
                  onSubmit={simpanTugas}
                  onCancel={() => {
                    setTugas(null);
                    setErr(null);
                  }}
                >
                  <Field label="Mata pelajaran">
                    <Select
                      value={tugas.subjectId ?? ""}
                      onChange={(v) => setTugas({ ...tugas, subjectId: v })}
                      options={[
                        { value: "", label: "— pilih —" },
                        ...(mapel.data ?? []).map((m) => ({ value: m.id, label: m.name })),
                      ]}
                    />
                  </Field>
                  <Field label="Pengampu">
                    <Select
                      value={tugas.instructorId ?? ""}
                      onChange={(v) => setTugas({ ...tugas, instructorId: v })}
                      options={opsiPengajar}
                    />
                  </Field>
                  <Field label="Hari">
                    <Select
                      value={tugas.dayOfWeek ? String(tugas.dayOfWeek) : ""}
                      onChange={(v) => setTugas({ ...tugas, dayOfWeek: v ? Number(v) : null })}
                      options={[
                        { value: "", label: "— ikut jadwal halaqoh —" },
                        ...HARI.slice(1).map((h, i) => ({ value: String(i + 1), label: h })),
                      ]}
                    />
                  </Field>
                  <Field label="Jam">
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Text
                        type="time"
                        value={tugas.startTime ?? ""}
                        onChange={(v) => setTugas({ ...tugas, startTime: v })}
                      />
                      <span style={{ color: "var(--color-faint)" }}>–</span>
                      <Text
                        type="time"
                        value={tugas.endTime ?? ""}
                        onChange={(v) => setTugas({ ...tugas, endTime: v })}
                      />
                    </div>
                  </Field>
                </FormPanel>
              )}

              {d.penugasan.length === 0 ? (
                <EmptyState
                  title="Belum ada pengampu"
                  hint="Tanpa penugasan, mata pelajaran memakai pengampu bawaannya."
                />
              ) : (
                <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
                  {d.penugasan.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        border: "1px solid var(--color-line)",
                        borderRadius: 9,
                        padding: "12px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{p.subjectName}</div>
                        <div style={{ fontSize: 14, color: "var(--color-muted)" }}>
                          {p.instructorName}
                          <span style={{ fontFamily: mono, fontSize: 12.5, marginLeft: 8 }}>
                            {ringkasJadwal(p)}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flex: "none" }}>
                        <button
                          type="button"
                          className="btn-sm"
                          onClick={() => {
                            setTugas({ ...p });
                            setErr(null);
                          }}
                        >
                          Ubah
                        </button>
                        <DeleteButton onConfirm={() => hapusTugas(p.id)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* --- peserta --- */}
              <CardTitle>Peserta ({d.peserta})</CardTitle>
              {d.pesertaDaftar.length === 0 ? (
                <EmptyState
                  title="Belum ada peserta di halaqoh ini"
                  hint="Pindahkan peserta dari halaman Pendaftaran atau Penempatan."
                />
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {d.pesertaDaftar.map((p) => (
                    <div
                      key={p.enrollmentId}
                      style={{
                        border: "1px solid var(--color-line)",
                        borderRadius: 9,
                        padding: "10px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 13.5, color: "var(--color-muted)" }}>
                          {p.email}
                          {p.city ? ` · ${p.city}` : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-sm"
                        style={{ flex: "none" }}
                        onClick={() => keluarkan(p.enrollmentId)}
                      >
                        Keluarkan
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      </Drawer>
    </>
  );
}

function Baris({
  label,
  nilai,
  mono: pakaiMono,
}: {
  label: string;
  nilai: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontFamily: pakaiMono ? mono : undefined, fontSize: pakaiMono ? 14 : 15.5 }}>
        {nilai || <span style={{ color: "var(--color-faint)" }}>—</span>}
      </div>
    </div>
  );
}
