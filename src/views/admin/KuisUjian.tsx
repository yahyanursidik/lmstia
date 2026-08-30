import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { mutate, useResource } from "../../lib/useApi";
import { useAuth } from "../../lib/auth";
import { Badge, Card, EmptyState, PageHeader, mono, serif } from "../../components/ui";
import { Area, Check, DeleteButton, Field, FormPanel, Select, Text } from "../../components/form";
import SoalEditor from "./SoalEditor";

/**
 * Kuis & Ujian — satu tempat untuk seluruh asesmen pada tahapan berjalan.
 *
 * Sebelumnya kuis hanya bisa dijangkau dengan menelusuri Program → Tahapan →
 * Mata Pelajaran → Pertemuan, dan tidak ada jalan untuk membuatnya. Halaman ini
 * menampung daftar, pembuatan, pengaturan KKM, bank soal, dan rekap hasil.
 */

type Tahapan = { id: string; name: string; status: string };
type Subject = { id: string; name: string; code: string };
type Meeting = { id: string; number: number; title: string };

type Kuis = {
  id: string;
  kind: "kuis" | "ujian" | "latihan";
  title: string;
  description: string | null;
  kkm: number;
  durationMinutes: number;
  weight: number | null;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showFeedback: boolean;
  publishStatus: "draft" | "review" | "published";
  meetingId: string | null;
  subjectId: string | null;
  meetingNumber: number | null;
  meetingTitle: string | null;
  subjectName: string | null;
  questionCount: number;
  totalPoints: number;
  attemptCount: number;
  pendingGrading: number;
};

type Rekap = {
  assessment: { id: string; title: string; kkm: number; kind: string };
  summary: {
    attempts: number;
    graded: number;
    pendingGrading: number;
    passed: number;
    failed: number;
    averageScore: number | null;
  };
  rows: {
    attemptId: string;
    name: string;
    attemptNo: number;
    status: string;
    score: number | null;
    passed: boolean | null;
  }[];
};

const PUBLISH_TONE: Record<string, { bg: string; fg: string }> = {
  published: { bg: "#e6ede7", fg: "#1f3d34" },
  review: { bg: "#f6eddb", fg: "#8a6a25" },
  draft: { bg: "#ecebe6", fg: "#6d675e" },
};
const PUBLISH_LABEL: Record<string, string> = {
  published: "Diterbitkan",
  review: "Review",
  draft: "Draf",
};
const KIND_TONE: Record<string, { bg: string; fg: string }> = {
  kuis: { bg: "#f6eddb", fg: "#8a6a25" },
  ujian: { bg: "#f7e6e0", fg: "#8d4632" },
  latihan: { bg: "#e2ecf5", fg: "#2f5b80" },
};

type Draft = {
  induk: "meeting" | "subject";
  meetingId: string;
  subjectId: string;
  kind: "kuis" | "ujian" | "latihan";
  title: string;
  description: string;
  kkm: number;
  durationMinutes: number;
  weight: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  showFeedback: boolean;
  publishStatus: "draft" | "review" | "published";
};

const kosong: Draft = {
  induk: "meeting",
  meetingId: "",
  subjectId: "",
  kind: "kuis",
  title: "",
  description: "",
  kkm: 70,
  durationMinutes: 10,
  weight: 20,
  maxAttempts: 0,
  shuffleQuestions: false,
  showFeedback: true,
  publishStatus: "draft",
};

export default function KuisUjian() {
  const { user } = useAuth();
  const canWrite = user?.role === "academic_admin" || user?.role === "super_admin";

  const tahapanList = useResource<Tahapan[]>("/admin/tahapan");
  const [tahapanId, setTahapanId] = useState<string | null>(null);
  const tid =
    tahapanId ??
    tahapanList.data?.find((t) => t.status === "running")?.id ??
    tahapanList.data?.[0]?.id ??
    null;

  const list = useResource<Kuis[]>(tid ? `/admin/assessments?tahapanId=${tid}` : null);
  const subjects = useResource<Subject[]>(tid ? `/admin/subjects?tahapanId=${tid}` : null);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [soalUntuk, setSoalUntuk] = useState<string | null>(null);
  const [rekapUntuk, setRekapUntuk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"semua" | "kuis" | "ujian" | "perlu-dinilai">("semua");

  // Pertemuan dimuat hanya ketika formulir memilih induk "pertemuan".
  const meetings = useResource<Meeting[]>(
    draft?.induk === "meeting" && draft.subjectId ? `/admin/meetings?subjectId=${draft.subjectId}` : null,
  );
  const rekap = useResource<Rekap>(rekapUntuk ? `/admin/assessments/${rekapUntuk}/results` : null);

  const rows = list.data ?? [];
  const terlihat = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const cocok = !q || r.title.toLowerCase().includes(q) || (r.subjectName ?? "").toLowerCase().includes(q);
      const lolos =
        filter === "semua" ||
        (filter === "perlu-dinilai" ? r.pendingGrading > 0 : r.kind === filter);
      return cocok && lolos;
    });
  }, [rows, query, filter]);

  const totalPerluDinilai = rows.reduce((n, r) => n + r.pendingGrading, 0);

  function buatBaru() {
    setErr(null);
    setEditingId(null);
    setDraft({ ...kosong, subjectId: subjects.data?.[0]?.id ?? "" });
  }

  function ubah(k: Kuis) {
    setErr(null);
    setEditingId(k.id);
    setDraft({
      induk: k.meetingId ? "meeting" : "subject",
      meetingId: k.meetingId ?? "",
      subjectId: k.subjectId ?? "",
      kind: k.kind,
      title: k.title,
      description: k.description ?? "",
      kkm: k.kkm,
      durationMinutes: k.durationMinutes,
      weight: k.weight ?? 0,
      maxAttempts: k.maxAttempts,
      shuffleQuestions: k.shuffleQuestions,
      showFeedback: k.showFeedback,
      publishStatus: k.publishStatus,
    });
  }

  async function simpan() {
    if (!draft) return;
    setBusy(true);
    // Tepat satu induk yang dikirim — server juga menolak bila keduanya terisi.
    const body = {
      meetingId: draft.induk === "meeting" ? draft.meetingId || null : null,
      subjectId: draft.induk === "subject" ? draft.subjectId || null : null,
      kind: draft.kind,
      title: draft.title,
      description: draft.description || null,
      kkm: draft.kkm,
      durationMinutes: draft.durationMinutes,
      weight: draft.weight || null,
      maxAttempts: draft.maxAttempts,
      shuffleQuestions: draft.shuffleQuestions,
      showFeedback: draft.showFeedback,
      publishStatus: draft.publishStatus,
    };
    const m = await mutate(() =>
      editingId ? api.patch(`/admin/assessments/${editingId}`, body) : api.post("/admin/assessments", body),
    );
    setBusy(false);
    if (m) return setErr(m);
    setDraft(null);
    setEditingId(null);
    list.reload();
  }

  return (
    <>
      <PageHeader
        eyebrow="Penilaian"
        title="Kuis & Ujian"
        lead="Kuis menempel pada pertemuan; ujian menempel pada mata pelajaran. Setiap asesmen punya KKM sendiri dan tiga tipe soal: pilihan ganda, benar–salah, dan esai."
        actions={
          canWrite ? (
            <button type="button" className="btn-solid-sm" onClick={buatBaru}>
              + Tambah Kuis / Ujian
            </button>
          ) : (
            <Badge bg="#ecebe6" fg="#6d675e">Hanya baca</Badge>
          )
        }
      />

      {tahapanList.loading ? (
        <div style={{ padding: 40, color: "var(--color-muted)" }}>Memuat…</div>
      ) : tahapanList.error ? (
        <EmptyState title="Tidak dapat memuat data" hint={tahapanList.error} />
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
            {(tahapanList.data ?? []).map((t) => (
              <button
                key={t.id}
                type="button"
                className={t.id === tid ? "btn-solid-sm" : "btn-sm"}
                onClick={() => {
                  setTahapanId(t.id);
                  setSoalUntuk(null);
                  setRekapUntuk(null);
                }}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* --- ringkasan --- */}
          <div className="quad" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
            {[
              { k: "TOTAL ASESMEN", v: String(rows.length) },
              { k: "DITERBITKAN", v: String(rows.filter((r) => r.publishStatus === "published").length) },
              { k: "TOTAL SOAL", v: String(rows.reduce((n, r) => n + r.questionCount, 0)) },
              { k: "PERLU DINILAI", v: String(totalPerluDinilai) },
            ].map((x) => (
              <Card key={x.k} padding={18}>
                <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".11em", color: "var(--color-soft)" }}>
                  {x.k}
                </div>
                <div style={{ fontFamily: serif, fontSize: 30, lineHeight: 1.1, marginTop: 8 }}>{x.v}</div>
              </Card>
            ))}
          </div>

          {/* --- pencarian & penyaring --- */}
          <Card padding={18} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari kuis atau ujian…"
                aria-label="Cari kuis"
                style={{
                  flex: 1,
                  minWidth: 220,
                  padding: "11px 13px",
                  border: "1px solid var(--color-line-strong)",
                  borderRadius: 8,
                  background: "var(--color-paper)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 16,
                }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { v: "semua", l: "Semua" },
                  { v: "kuis", l: "Kuis" },
                  { v: "ujian", l: "Ujian" },
                  { v: "perlu-dinilai", l: `Perlu dinilai${totalPerluDinilai ? ` (${totalPerluDinilai})` : ""}` },
                ].map((f) => (
                  <button
                    key={f.v}
                    type="button"
                    className={filter === f.v ? "btn-solid-sm" : "btn-sm"}
                    onClick={() => setFilter(f.v as typeof filter)}
                  >
                    {f.l}
                  </button>
                ))}
              </div>
              <span style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-muted)" }}>
                {terlihat.length} ditampilkan
              </span>
            </div>
          </Card>

          {/* --- formulir --- */}
          {draft && (
            <FormPanel
              title={editingId ? "Ubah kuis / ujian" : "Kuis / ujian baru"}
              error={err}
              busy={busy}
              onSubmit={simpan}
              onCancel={() => {
                setDraft(null);
                setEditingId(null);
                setErr(null);
              }}
            >
              <Field label="Judul" span>
                <Text value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} placeholder="Cek Pemahaman Pertemuan 9" />
              </Field>

              <Field label="Jenis">
                <Select
                  value={draft.kind}
                  onChange={(v) => setDraft({ ...draft, kind: v })}
                  options={[
                    { value: "kuis", label: "Kuis" },
                    { value: "ujian", label: "Ujian" },
                    { value: "latihan", label: "Latihan" },
                  ]}
                />
              </Field>

              <Field label="Menempel pada" hint="Kuis biasanya per pertemuan; ujian akhir per mata pelajaran.">
                <Select
                  value={draft.induk}
                  onChange={(v) => setDraft({ ...draft, induk: v, meetingId: "" })}
                  options={[
                    { value: "meeting", label: "Pertemuan" },
                    { value: "subject", label: "Mata pelajaran" },
                  ]}
                />
              </Field>

              <Field label="Mata pelajaran">
                <Select
                  value={draft.subjectId}
                  onChange={(v) => setDraft({ ...draft, subjectId: v, meetingId: "" })}
                  options={[
                    { value: "", label: "— pilih —" },
                    ...(subjects.data ?? []).map((s) => ({ value: s.id, label: s.name })),
                  ]}
                />
              </Field>

              {draft.induk === "meeting" && (
                <Field label="Pertemuan">
                  <Select
                    value={draft.meetingId}
                    onChange={(v) => setDraft({ ...draft, meetingId: v })}
                    options={[
                      { value: "", label: meetings.loading ? "Memuat…" : "— pilih —" },
                      ...(meetings.data ?? []).map((m) => ({
                        value: m.id,
                        label: `Pertemuan ${m.number} — ${m.title}`,
                      })),
                    ]}
                  />
                </Field>
              )}

              <Field label="KKM" hint="Ambang kelulusan, 0–100.">
                <Text type="number" value={String(draft.kkm)} onChange={(v) => setDraft({ ...draft, kkm: Number(v) || 0 })} />
              </Field>
              <Field label="Durasi (menit)" hint="0 = tanpa batas waktu.">
                <Text type="number" value={String(draft.durationMinutes)} onChange={(v) => setDraft({ ...draft, durationMinutes: Number(v) || 0 })} />
              </Field>
              <Field label="Bobot terhadap nilai akhir (%)">
                <Text type="number" value={String(draft.weight)} onChange={(v) => setDraft({ ...draft, weight: Number(v) || 0 })} />
              </Field>
              <Field label="Maksimal percobaan" hint="0 = tanpa batas.">
                <Text type="number" value={String(draft.maxAttempts)} onChange={(v) => setDraft({ ...draft, maxAttempts: Number(v) || 0 })} />
              </Field>
              <Field label="Status terbit">
                <Select
                  value={draft.publishStatus}
                  onChange={(v) => setDraft({ ...draft, publishStatus: v })}
                  options={[
                    { value: "draft", label: "Draf" },
                    { value: "review", label: "Review" },
                    { value: "published", label: "Terbit" },
                  ]}
                />
              </Field>
              <Field label="Pengaturan">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Check checked={draft.shuffleQuestions} onChange={(v) => setDraft({ ...draft, shuffleQuestions: v })} label="Acak urutan soal" />
                  <Check checked={draft.showFeedback} onChange={(v) => setDraft({ ...draft, showFeedback: v })} label="Tampilkan kunci setelah dinilai" />
                </div>
              </Field>
              <Field label="Deskripsi" span>
                <Area value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} rows={2} />
              </Field>
            </FormPanel>
          )}

          {/* --- daftar --- */}
          {list.loading ? (
            <div style={{ padding: 40, color: "var(--color-muted)" }}>Memuat kuis…</div>
          ) : terlihat.length === 0 ? (
            <EmptyState
              title={rows.length === 0 ? "Belum ada kuis atau ujian" : "Tidak ada yang cocok"}
              hint={rows.length === 0 ? "Tambahkan kuis untuk pertemuan atau ujian untuk mata pelajaran." : "Ubah kata kunci atau penyaring."}
            />
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {terlihat.map((k) => (
                <Card key={k.id} padding={20}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
                        <Badge bg={KIND_TONE[k.kind].bg} fg={KIND_TONE[k.kind].fg}>{k.kind}</Badge>
                        <span style={{ fontSize: 16.5, fontWeight: 700 }}>{k.title}</span>
                        <Badge bg={PUBLISH_TONE[k.publishStatus].bg} fg={PUBLISH_TONE[k.publishStatus].fg}>
                          {PUBLISH_LABEL[k.publishStatus]}
                        </Badge>
                        {k.pendingGrading > 0 && (
                          <Badge bg="#f6eddb" fg="#8a6a25">{k.pendingGrading} perlu dinilai</Badge>
                        )}
                      </div>
                      <div style={{ fontSize: 14, color: "var(--color-faint)", marginTop: 6 }}>
                        {k.subjectName}
                        {k.meetingNumber != null ? ` · Pertemuan ${k.meetingNumber}` : " · ujian mata pelajaran"}
                        {" · KKM "}{k.kkm}
                        {" · "}{k.questionCount} soal / {k.totalPoints} poin
                        {" · "}{k.attemptCount} percobaan
                        {k.durationMinutes > 0 ? ` · ${k.durationMinutes} menit` : " · tanpa batas waktu"}
                        {k.maxAttempts > 0 ? ` · maks ${k.maxAttempts}×` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className={soalUntuk === k.id ? "btn-solid-sm" : "btn-sm"}
                        onClick={() => {
                          setSoalUntuk(soalUntuk === k.id ? null : k.id);
                          setRekapUntuk(null);
                        }}
                      >
                        Soal ({k.questionCount})
                      </button>
                      <button
                        type="button"
                        className={rekapUntuk === k.id ? "btn-solid-sm" : "btn-sm"}
                        onClick={() => {
                          setRekapUntuk(rekapUntuk === k.id ? null : k.id);
                          setSoalUntuk(null);
                        }}
                      >
                        Hasil
                      </button>
                      {canWrite && (
                        <>
                          <button type="button" className="btn-sm" onClick={() => ubah(k)}>Ubah</button>
                          <DeleteButton
                            onConfirm={async () => {
                              await mutate(() => api.del(`/admin/assessments/${k.id}`));
                              list.reload();
                            }}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {soalUntuk === k.id && <SoalEditor assessmentId={k.id} canWrite={canWrite} />}

                  {rekapUntuk === k.id && (
                    <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--color-line-soft)" }}>
                      {rekap.loading ? (
                        <div style={{ color: "var(--color-muted)" }}>Memuat hasil…</div>
                      ) : !rekap.data || rekap.data.rows.length === 0 ? (
                        <EmptyState title="Belum ada yang mengerjakan" />
                      ) : (
                        <>
                          <div className="quad" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 14 }}>
                            {[
                              { k: "RATA-RATA", v: rekap.data.summary.averageScore ?? "—" },
                              { k: "LULUS KKM", v: rekap.data.summary.passed },
                              { k: "BELUM LULUS", v: rekap.data.summary.failed },
                              { k: "PERLU DINILAI", v: rekap.data.summary.pendingGrading },
                            ].map((x) => (
                              <div key={x.k}>
                                <div style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: ".1em", color: "var(--color-soft)" }}>
                                  {x.k}
                                </div>
                                <div style={{ fontFamily: serif, fontSize: 24, marginTop: 5 }}>{x.v}</div>
                              </div>
                            ))}
                          </div>
                          {rekap.data.rows.map((r) => (
                            <div
                              key={r.attemptId}
                              style={{ display: "flex", gap: 14, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--color-line-softer)", flexWrap: "wrap" }}
                            >
                              <div style={{ flex: 1, minWidth: 160, fontSize: 15 }}>{r.name}</div>
                              <span style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>
                                ke-{r.attemptNo}
                              </span>
                              <div style={{ fontFamily: serif, fontSize: 20, minWidth: 42, textAlign: "right" }}>
                                {r.score ?? "—"}
                              </div>
                              {r.passed === true && <Badge bg="#e6ede7" fg="#1f3d34">Lulus</Badge>}
                              {r.passed === false && <Badge bg="#f7e6e0" fg="#8d4632">Belum</Badge>}
                              {r.status === "menunggu_penilaian" && <Badge bg="#f6eddb" fg="#8a6a25">Menunggu</Badge>}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
