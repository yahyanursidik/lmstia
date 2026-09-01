import { useEffect, useMemo, useState } from "react";
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
import { Combobox } from "../../components/Combobox";
import { useAuth } from "../../lib/auth";

/**
 * Kehadiran.
 *
 * Sebelumnya hanya rekap baca-saja — tidak ada cara mencatat kehadiran sama
 * sekali, sehingga angkanya selalu nol. Halaman ini menambahkan pengambilan
 * kehadiran per pertemuan, dengan penanganan khusus pertemuan hybrid.
 *
 * Pada pertemuan hybrid, "hadir" saja tidak cukup: pengampu perlu tahu siapa
 * yang datang ke tempat dan siapa yang bergabung daring, karena keduanya
 * menuntut pendampingan berbeda.
 */

type Tahapan = { id: string; name: string; programId: string; status: string };
type Mapel = { id: string; name: string; code: string };
type PertemuanRingkas = {
  id: string;
  number: number;
  title: string;
  mode: string;
  startsAt: string | null;
  tercatat: number;
};

type Status = "hadir" | "izin" | "sakit" | "alpa";
type Kanal = "daring" | "luring";

type BarisPeserta = {
  userId: string;
  name: string;
  className: string | null;
  status: Status | null;
  channel: Kanal | null;
  note: string | null;
  tercatat: boolean;
};

type DaftarHadir = {
  pertemuan: {
    id: string;
    number: number;
    title: string;
    mode: string;
    startsAt: string | null;
    location: string | null;
    livePlatform: string | null;
    subjectName: string;
    tahapanName: string;
  };
  perluKanal: boolean;
  kanalBawaan: Kanal | null;
  peserta: BarisPeserta[];
  ringkasan: { peserta: number; tercatat: number; hadir: number; daring: number; luring: number };
};

type BarisRekap = {
  userId: string;
  name: string;
  className: string | null;
  hadir: number;
  daring: number;
  luring: number;
  izin: number;
  sakit: number;
  alpa: number;
  tercatat: number;
};

const MODE_LABEL: Record<string, string> = {
  online: "Daring",
  offline: "Tatap muka",
  hybrid: "Hybrid",
  mandiri: "Mandiri",
};

const STATUS_LABEL: Record<Status, string> = {
  hadir: "Hadir",
  izin: "Izin",
  sakit: "Sakit",
  alpa: "Alpa",
};

const STATUS_TONE: Record<Status, { bg: string; fg: string }> = {
  hadir: { bg: "#e4ede4", fg: "#2f5638" },
  izin: { bg: "#f6eddb", fg: "#8a6a25" },
  sakit: { bg: "#e6ecef", fg: "#38525e" },
  alpa: { bg: "#f7e6e0", fg: "#8d4632" },
};

const waktu = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" }) : null;

export default function Kehadiran() {
  const [tab, setTab] = useState<"ambil" | "rekap">("ambil");

  return (
    <>
      <PageHeader
        eyebrow="Penilaian"
        title="Kehadiran"
        lead="Ambil kehadiran per pertemuan. Pada pertemuan hybrid, kehadiran dicatat beserta kanalnya — daring atau tatap muka."
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(
          [
            ["ambil", "Ambil Kehadiran"],
            ["rekap", "Rekap"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={tab === k ? "btn-solid-sm" : "btn-sm"}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "ambil" ? <TabAmbil /> : <TabRekap />}
    </>
  );
}

/* --- Ambil kehadiran ------------------------------------------------ */

function TabAmbil() {
  const { user } = useAuth();
  const programs = useResource<{ id: string; name: string; status: string }[]>("/admin/programs");
  const semuaTahapan = useResource<Tahapan[]>("/admin/tahapan");
  const [programId, setProgramId] = useState("");
  const [tahapanId, setTahapanId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [meetingId, setMeetingId] = useState("");

  const programAktif =
    programId || programs.data?.find((p) => p.status === "active")?.id || programs.data?.[0]?.id || "";
  const tahapanProgram = (semuaTahapan.data ?? []).filter((t) => t.programId === programAktif);
  const tahapanAktif =
    tahapanId && tahapanProgram.some((t) => t.id === tahapanId)
      ? tahapanId
      : tahapanProgram.find((t) => t.status === "running")?.id || tahapanProgram[0]?.id || "";

  const mapel = useResource<Mapel[]>(tahapanAktif ? `/admin/subjects?tahapanId=${tahapanAktif}` : null);
  const pertemuan = useResource<PertemuanRingkas[]>(
    subjectId ? `/admin/kehadiran/pertemuan?subjectId=${subjectId}` : null,
  );
  const daftar = useResource<DaftarHadir>(
    meetingId ? `/admin/kehadiran/pertemuan/${meetingId}` : null,
  );

  /* Perubahan yang belum disimpan, terpisah dari yang sudah tercatat. */
  const [draf, setDraf] = useState<Record<string, { status: Status; channel: Kanal | null }>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  /* Draf disemai ulang dari catatan yang tersimpan setiap kali data datang. */
  useEffect(() => {
    if (!daftar.data) return;
    const awal: Record<string, { status: Status; channel: Kanal | null }> = {};
    for (const p of daftar.data.peserta) {
      if (p.tercatat && p.status) awal[p.userId] = { status: p.status, channel: p.channel };
    }
    setDraf(awal);
  }, [daftar.data]);

  /*
   * Pesan dibersihkan hanya saat berpindah pertemuan, bukan setiap kali data
   * dimuat ulang — kalau ikut, pesan "tersimpan" langsung terhapus oleh muat
   * ulang yang dipicu penyimpanan itu sendiri.
   */
  useEffect(() => {
    setSukses(null);
    setErr(null);
  }, [meetingId]);

  const d = daftar.data;
  const perluKanal = d?.perluKanal ?? false;
  const kanalBawaan = d?.kanalBawaan ?? null;

  function setStatus(userId: string, status: Status) {
    setDraf((v) => {
      const lama = v[userId];
      return {
        ...v,
        [userId]: {
          status,
          /* Kanal hanya melekat pada "hadir"; status lain melepasnya. */
          channel:
            status !== "hadir" ? null : (lama?.channel ?? kanalBawaan ?? (perluKanal ? null : null)),
        },
      };
    });
  }

  function setKanal(userId: string, channel: Kanal) {
    setDraf((v) => ({ ...v, [userId]: { status: v[userId]?.status ?? "hadir", channel } }));
  }

  function semua(status: Status) {
    if (!d) return;
    const next: Record<string, { status: Status; channel: Kanal | null }> = {};
    for (const p of d.peserta) {
      next[p.userId] = {
        status,
        channel: status === "hadir" ? (draf[p.userId]?.channel ?? kanalBawaan) : null,
      };
    }
    setDraf(next);
  }

  /*
   * Dua keadaan berbeda yang tidak boleh dicampur:
   *
   * "belum ditandai" wajar — pengampu boleh menyimpan sebagian dan melanjutkan
   * nanti, jadi ini tidak menghalangi penyimpanan.
   *
   * "hadir tanpa kanal" pada pertemuan hybrid adalah catatan yang tidak
   * lengkap, dan itu yang menahan tombol simpan.
   */
  const belumDitandai = useMemo(
    () => (d ? d.peserta.filter((p) => !draf[p.userId]) : []),
    [d, draf],
  );

  const kanalKurang = useMemo(() => {
    if (!d || !perluKanal) return [];
    return d.peserta.filter((p) => {
      const x = draf[p.userId];
      return x?.status === "hadir" && !x.channel;
    });
  }, [d, draf, perluKanal]);

  async function simpan() {
    if (!d) return;
    const rows = Object.entries(draf).map(([userId, x]) => ({
      userId,
      status: x.status,
      channel: x.status === "hadir" ? x.channel : null,
    }));
    if (rows.length === 0) return;

    setBusy(true);
    const pesan = await mutate(() =>
      api.post(`/admin/kehadiran/pertemuan/${d.pertemuan.id}`, { rows }),
    );
    setBusy(false);
    if (pesan) return setErr(pesan);
    setErr(null);
    setSukses(`Kehadiran ${rows.length} peserta tersimpan.`);
    daftar.reload();
    pertemuan.reload();
  }

  /*
   * Pengajar hanya melihat mata pelajaran yang diampunya. Bila belum diberi
   * satu pun, daftar kosong itu benar — tetapi tanpa penjelasan ia terbaca
   * seperti halaman yang rusak.
   */
  const belumDiampukan =
    user?.role === "instructor" && !mapel.loading && (mapel.data ?? []).length === 0;

  if (belumDiampukan) {
    return (
      <EmptyState
        title="Anda belum diampukan mata pelajaran"
        hint="Kehadiran hanya dapat diambil untuk mata pelajaran yang Anda ampu. Hubungi admin akademik untuk penugasan."
      />
    );
  }

  return (
    <>
      <Card padding={18} style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
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
                { value: "", label: "— pilih —" },
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
                { value: "", label: "— pilih —" },
                ...(pertemuan.data ?? []).map((m) => ({
                  value: m.id,
                  label: `Pertemuan ${m.number}: ${m.title}`,
                  hint: `${MODE_LABEL[m.mode] ?? m.mode}${m.tercatat ? ` · ${m.tercatat} tercatat` : ""}`,
                })),
              ]}
              disabled={!subjectId}
              emptyText="Mata pelajaran ini tidak punya pertemuan berjadwal"
              ariaLabel="Pertemuan"
            />
          </div>
        </div>
        <div style={{ fontSize: 13.5, color: "var(--color-faint)", marginTop: 12, lineHeight: 1.6 }}>
          Pertemuan mandiri tidak muncul di sini — belajar mandiri tidak punya kehadiran untuk
          dicatat.
        </div>
      </Card>

      {!meetingId && (
        <EmptyState
          title="Pilih pertemuan"
          hint="Daftar hadir muncul setelah satu pertemuan dipilih."
        />
      )}

      {meetingId && daftar.loading && (
        <div style={{ color: "var(--color-faint)" }}>Memuat daftar hadir…</div>
      )}
      {daftar.error && <div role="alert">{daftar.error}</div>}

      {d && (
        <>
          <Card padding={20} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>
                  {d.pertemuan.subjectName} · {d.pertemuan.tahapanName}
                </div>
                <div style={{ fontFamily: serif, fontSize: 21 }}>
                  Pertemuan {d.pertemuan.number}: {d.pertemuan.title}
                </div>
                <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 6 }}>
                  {[
                    MODE_LABEL[d.pertemuan.mode] ?? d.pertemuan.mode,
                    waktu(d.pertemuan.startsAt),
                    d.pertemuan.location,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              <div style={{ fontFamily: mono, fontSize: 13, color: "var(--color-muted)", textAlign: "right" }}>
                <div>
                  {d.ringkasan.tercatat}/{d.ringkasan.peserta} tercatat
                </div>
                {perluKanal && (
                  <div style={{ marginTop: 4 }}>
                    daring {d.ringkasan.daring} · luring {d.ringkasan.luring}
                  </div>
                )}
              </div>
            </div>

            {perluKanal && (
              <div
                style={{
                  marginTop: 14,
                  padding: "11px 14px",
                  background: "var(--color-paper)",
                  borderRadius: 8,
                  fontSize: 14.5,
                  color: "var(--color-body)",
                  lineHeight: 1.6,
                }}
              >
                Pertemuan hybrid: setiap peserta yang hadir perlu ditandai <strong>daring</strong>{" "}
                atau <strong>tatap muka</strong>.
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, color: "var(--color-faint)", alignSelf: "center" }}>
                Tandai semua:
              </span>
              {(Object.keys(STATUS_LABEL) as Status[]).map((st) => (
                <button key={st} type="button" className="btn-sm" onClick={() => semua(st)}>
                  {STATUS_LABEL[st]}
                </button>
              ))}
            </div>
          </Card>

          {sukses && (
            <div
              role="status"
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                background: "#e4ede4",
                border: "1px solid #cfe0d2",
                borderRadius: 8,
                fontSize: 15,
                color: "#2f5638",
              }}
            >
              {sukses}
            </div>
          )}
          {err && (
            <div role="alert" style={galat}>
              {err}
            </div>
          )}

          <Card padding={20}>
            <div style={{ display: "grid", gap: 10 }}>
              {d.peserta.map((p) => {
                const x = draf[p.userId];
                const kurang = perluKanal && x?.status === "hadir" && !x.channel;
                return (
                  <div
                    key={p.userId}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr auto",
                      gap: 14,
                      alignItems: "center",
                      border: `1px solid ${kurang ? "#e6d6b4" : "var(--color-line)"}`,
                      background: kurang ? "#fdfaf2" : "transparent",
                      borderRadius: 9,
                      padding: "11px 14px",
                    }}
                    className="split"
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: 13, color: "var(--color-faint)", marginTop: 2 }}>
                        {p.className ?? "—"}
                        {p.tercatat && !x && " · sudah tercatat"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {(Object.keys(STATUS_LABEL) as Status[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStatus(p.userId, st)}
                          aria-pressed={x?.status === st}
                          style={{
                            padding: "6px 11px",
                            borderRadius: 7,
                            fontSize: 13.5,
                            cursor: "pointer",
                            border: `1px solid ${x?.status === st ? STATUS_TONE[st].fg : "var(--color-line)"}`,
                            background: x?.status === st ? STATUS_TONE[st].bg : "var(--color-surface)",
                            color: x?.status === st ? STATUS_TONE[st].fg : "var(--color-muted)",
                            fontWeight: x?.status === st ? 700 : 400,
                          }}
                        >
                          {STATUS_LABEL[st]}
                        </button>
                      ))}

                      {perluKanal && x?.status === "hadir" && (
                        <span style={{ display: "inline-flex", gap: 6, marginLeft: 6 }}>
                          {(["daring", "luring"] as Kanal[]).map((kn) => (
                            <button
                              key={kn}
                              type="button"
                              onClick={() => setKanal(p.userId, kn)}
                              aria-pressed={x.channel === kn}
                              style={{
                                padding: "6px 11px",
                                borderRadius: 7,
                                fontSize: 13.5,
                                cursor: "pointer",
                                border: `1px solid ${x.channel === kn ? "var(--color-forest)" : "#e6d6b4"}`,
                                background: x.channel === kn ? "var(--color-mist)" : "var(--color-surface)",
                                color: x.channel === kn ? "var(--color-forest)" : "#8a6a25",
                                fontWeight: x.channel === kn ? 700 : 400,
                              }}
                            >
                              {kn === "daring" ? "Daring" : "Tatap muka"}
                            </button>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 14,
                flexWrap: "wrap",
                alignItems: "center",
                marginTop: 18,
                paddingTop: 16,
                borderTop: "1px solid var(--color-line)",
              }}
            >
              <div style={{ fontSize: 14.5, color: kanalKurang.length ? "#8a6a25" : "var(--color-faint)", lineHeight: 1.6 }}>
                {kanalKurang.length > 0 ? (
                  <>
                    {kanalKurang.length} peserta ditandai hadir tetapi kanalnya belum dipilih.
                  </>
                ) : (
                  <>
                    {Object.keys(draf).length} peserta siap disimpan
                    {belumDitandai.length > 0 && (
                      <span style={{ color: "var(--color-faint)" }}>
                        {" "}
                        · {belumDitandai.length} belum ditandai dan tidak akan ikut tersimpan
                      </span>
                    )}
                  </>
                )}
              </div>
              <button
                type="button"
                className="btn-solid-sm"
                disabled={busy || Object.keys(draf).length === 0 || kanalKurang.length > 0}
                onClick={simpan}
                style={{
                  opacity: busy || Object.keys(draf).length === 0 || kanalKurang.length > 0 ? 0.55 : 1,
                }}
              >
                {busy ? "Menyimpan…" : "Simpan kehadiran"}
              </button>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

/* --- Rekap ----------------------------------------------------------- */

function TabRekap() {
  const d = useResource<{ tahapan?: string; rows: BarisRekap[] }>("/admin/kehadiran/rekap");

  const kolom: Column<BarisRekap>[] = [
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
    {
      key: "hadir",
      head: "HADIR",
      width: "1.2fr",
      render: (r) => (
        <div>
          <span style={{ fontFamily: mono, fontWeight: 700 }}>{r.hadir}</span>
          {(r.daring > 0 || r.luring > 0) && (
            <span style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>
              {" "}
              (daring {r.daring} · tatap muka {r.luring})
            </span>
          )}
        </div>
      ),
    },
    { key: "izin", head: "IZIN", width: ".7fr", secondary: true, render: (r) => <span style={{ fontFamily: mono }}>{r.izin}</span> },
    { key: "sakit", head: "SAKIT", width: ".7fr", secondary: true, render: (r) => <span style={{ fontFamily: mono }}>{r.sakit}</span> },
    { key: "alpa", head: "ALPA", width: ".7fr", render: (r) => <span style={{ fontFamily: mono }}>{r.alpa}</span> },
    {
      key: "persen",
      head: "PERSENTASE",
      width: "1fr",
      render: (r) =>
        r.tercatat === 0 ? (
          <span style={{ color: "var(--color-faint)" }}>—</span>
        ) : (
          <Badge
            bg={r.hadir / r.tercatat >= 0.75 ? "#e4ede4" : "#f6eddb"}
            fg={r.hadir / r.tercatat >= 0.75 ? "#2f5638" : "#8a6a25"}
          >
            {Math.round((r.hadir / r.tercatat) * 100)}%
          </Badge>
        ),
    },
  ];

  const rows = d.data?.rows ?? [];
  const adaKanal = rows.some((r) => r.daring > 0 || r.luring > 0);

  return (
    <Card padding={20}>
      <CardTitle aside={d.data?.tahapan}>Rekap kehadiran</CardTitle>
      {d.loading && <div style={{ color: "var(--color-faint)", marginTop: 12 }}>Memuat rekap…</div>}
      {d.error && <div role="alert">{d.error}</div>}
      {d.data && (
        <div style={{ marginTop: 14 }}>
          <DataTable columns={kolom} rows={rows} empty="Belum ada peserta" />
          {rows.length > 0 && rows.every((r) => r.tercatat === 0) && (
            <div style={{ fontSize: 14.5, color: "var(--color-faint)", marginTop: 14, lineHeight: 1.6 }}>
              Belum ada kehadiran yang dicatat. Angka nol di sini berarti belum diambil, bukan
              berarti peserta tidak hadir — ambil kehadiran lewat tab di sebelah.
            </div>
          )}
          {adaKanal && (
            <div style={{ fontSize: 13.5, color: "var(--color-faint)", marginTop: 14, lineHeight: 1.6 }}>
              Pemisahan daring dan tatap muka hanya terisi untuk pertemuan hybrid.
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

const galat: React.CSSProperties = {
  marginBottom: 16,
  padding: "12px 14px",
  background: "#f7e6e0",
  border: "1px solid #e8cdc3",
  borderRadius: 8,
  fontSize: 15,
  color: "#8d4632",
};
