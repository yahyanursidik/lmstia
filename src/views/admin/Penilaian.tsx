import { useState } from "react";
import { api } from "../../lib/api";
import { mutate, useResource } from "../../lib/useApi";
import { Badge, Card, EmptyState, PageHeader, mono, serif } from "../../components/ui";
import { CardTitle } from "../../components/ui";
import { Combobox } from "../../components/Combobox";
import { TYPE_LABEL, TYPE_TONE, type QuestionType } from "./SoalEditor";

/**
 * Antrean penilaian esai.
 *
 * Pilihan ganda dan benar-salah sudah dinilai server saat dikumpulkan, jadi
 * yang tersisa di sini hanya esai. Setelah seluruh esai satu percobaan diberi
 * poin, server menghitung nilai akhir dan membandingkannya dengan KKM.
 */

type Antre = {
  attemptId: string;
  assessmentId: string;
  assessmentTitle: string;
  kind: string;
  kkm: number;
  userId: string;
  userName: string;
  submittedAt: string | null;
  autoPoints: number;
  maxPoints: number;
};

type Item = {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[] | null;
  points: number;
  response: string | null;
  earnedPoints: number | null;
  isCorrect: boolean | null;
  feedback: string | null;
  answerKey: string | null;
};

type Detail = {
  attempt: { id: string; status: string; score: number | null; autoPoints: number; maxPoints: number; attemptNo: number };
  assessment: { id: string; title: string; kkm: number } | null;
  items: Item[];
};

function TabAntrean() {
  const antrean = useResource<Antre[]>("/admin/assessments/grading/queue");
  const [aktif, setAktif] = useState<string | null>(null);
  const detail = useResource<Detail>(aktif ? `/admin/assessments/attempts/${aktif}` : null);

  const [nilai, setNilai] = useState<Record<string, { points: number; feedback: string }>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sukses, setSukses] = useState<string | null>(null);

  const esai = (detail.data?.items ?? []).filter((i) => i.type === "essay");

  function buka(attemptId: string) {
    setAktif(attemptId);
    setNilai({});
    setErr(null);
    setSukses(null);
  }

  async function simpan() {
    if (!aktif) return;
    const grades = esai.map((i) => ({
      questionId: i.id,
      earnedPoints: nilai[i.id]?.points ?? i.earnedPoints ?? 0,
      feedback: nilai[i.id]?.feedback || undefined,
    }));
    setBusy(true);
    const m = await mutate(() => api.post(`/admin/assessments/attempts/${aktif}/grade`, { grades }));
    setBusy(false);
    if (m) return setErr(m);
    /* Cari yang berikutnya SEBELUM daftar dimuat ulang. */
    const sisa = (antrean.data ?? []).filter((r) => r.attemptId !== aktif);
    const berikutnya = sisa[0];
    setSukses(
      berikutnya
        ? `Penilaian tersimpan. Lanjut ke ${berikutnya.userName}.`
        : "Penilaian tersimpan. Antrean selesai.",
    );
    setNilai({});
    setAktif(berikutnya ? berikutnya.attemptId : null);
    antrean.reload();
  }

  const [cari, setCari] = useState("");

  /*
   * Setelah satu percobaan dinilai, antrean langsung membuka berikutnya.
   * Kembali ke daftar setiap kali hanya menambah langkah pada pekerjaan yang
   * dilakukan berulang-ulang.
   */
  const semua = antrean.data ?? [];
  const k = cari.trim().toLowerCase();
  const rows = k
    ? semua.filter(
        (r) => r.userName.toLowerCase().includes(k) || r.assessmentTitle.toLowerCase().includes(k),
      )
    : semua;

  return (
    <>
      {sukses && (
        <div
          role="status"
          style={{ padding: "13px 16px", background: "var(--color-mist)", border: "1px solid #d6e0d8", borderRadius: 8, fontSize: 14.5, color: "#2f4a3f", marginBottom: 18 }}
        >
          {sukses}
        </div>
      )}

      {semua.length > 0 && (
        <Card padding={16} style={{ marginBottom: 16 }}>
          <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
            Cari dalam antrean
          </label>
          <input
            type="search"
            value={cari}
            placeholder="Nama peserta atau judul kuis…"
            onChange={(e) => setCari(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--color-line)",
              borderRadius: 8,
              background: "var(--color-surface)",
              fontSize: 15,
              fontFamily: "inherit",
              color: "var(--color-ink)",
            }}
          />
          <div style={{ fontSize: 13.5, color: "var(--color-faint)", marginTop: 8 }}>
            {rows.length} dari {semua.length} percobaan menunggu penilaian
          </div>
        </Card>
      )}

      {antrean.loading ? (
        <div style={{ padding: 40, color: "var(--color-muted)" }}>Memuat antrean…</div>
      ) : antrean.error ? (
        <EmptyState title="Tidak dapat memuat antrean" hint={antrean.error} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Tidak ada esai yang menunggu"
          hint="Semua percobaan yang dikumpulkan sudah selesai dinilai."
        />
      ) : (
        <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
          {rows.map((r) => (
            <Card key={r.attemptId} padding={18}>
              <div
                className="split"
                style={{ display: "grid", gridTemplateColumns: "1fr 200px 150px 130px", gap: 16, alignItems: "center" }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 700 }}>{r.userName}</div>
                  <div style={{ fontSize: 13.5, color: "var(--color-faint)", marginTop: 3 }}>
                    {r.assessmentTitle}
                  </div>
                </div>
                <div className="col-hide" style={{ fontSize: 13.5, color: "var(--color-muted)" }}>
                  Objektif {r.autoPoints}/{r.maxPoints} poin
                </div>
                <div className="col-hide">
                  <Badge bg="#f6eddb" fg="#8a6a25">KKM {r.kkm}</Badge>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className={aktif === r.attemptId ? "btn-solid-sm" : "btn-sm"}
                    onClick={() => (aktif === r.attemptId ? setAktif(null) : buka(r.attemptId))}
                  >
                    {aktif === r.attemptId ? "Tutup" : "Nilai"}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {aktif && detail.data && (
        <Card padding={24}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "baseline", marginBottom: 18 }}>
            <h2 style={{ fontFamily: serif, fontSize: 22 }}>{detail.data.assessment?.title}</h2>
            <span style={{ fontFamily: mono, fontSize: 13, color: "var(--color-muted)" }}>
              Percobaan ke-{detail.data.attempt.attemptNo} · KKM {detail.data.assessment?.kkm}
            </span>
          </div>

          {/* Soal objektif ditampilkan sebagai konteks, tidak bisa diubah. */}
          {detail.data.items
            .filter((i) => i.type !== "essay")
            .map((i) => (
              <div key={i.id} style={{ padding: "12px 0", borderTop: "1px solid var(--color-line-soft)", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <Badge bg={TYPE_TONE[i.type].bg} fg={TYPE_TONE[i.type].fg}>
                  {TYPE_LABEL[i.type]}
                </Badge>
                <div style={{ flex: 1, minWidth: 200, fontSize: 14.5, color: "var(--color-muted)" }}>{i.prompt}</div>
                <Badge bg={i.isCorrect ? "#e6ede7" : "#f7e6e0"} fg={i.isCorrect ? "#1f3d34" : "#8d4632"}>
                  {i.isCorrect ? "Benar" : "Salah"}
                </Badge>
                <span style={{ fontFamily: mono, fontSize: 13 }}>
                  {i.earnedPoints}/{i.points}
                </span>
              </div>
            ))}

          {esai.map((i) => {
            const cur = nilai[i.id] ?? { points: i.earnedPoints ?? 0, feedback: i.feedback ?? "" };
            return (
              <div key={i.id} style={{ padding: "18px 0", borderTop: "1px solid var(--color-line-soft)" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
                  <Badge bg={TYPE_TONE.essay.bg} fg={TYPE_TONE.essay.fg}>Esai</Badge>
                  <span style={{ fontFamily: mono, fontSize: 13, color: "var(--color-muted)" }}>
                    maksimal {i.points} poin
                  </span>
                </div>
                <div style={{ fontSize: 16, lineHeight: 1.6 }}>{i.prompt}</div>

                <div
                  style={{
                    marginTop: 12,
                    padding: "14px 16px",
                    background: "var(--color-paper)",
                    borderRadius: 8,
                    fontSize: 15,
                    lineHeight: 1.7,
                    color: "var(--color-body)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {i.response || "(tidak dijawab)"}
                </div>

                <div className="split" style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 14, marginTop: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--color-muted)", marginBottom: 6 }}>
                      Poin (0–{i.points})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={i.points}
                      value={cur.points}
                      onChange={(e) =>
                        setNilai({
                          ...nilai,
                          [i.id]: { ...cur, points: Math.max(0, Math.min(i.points, Number(e.target.value) || 0)) },
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid var(--color-line-strong)",
                        borderRadius: 6,
                        background: "var(--color-paper)",
                        fontFamily: "var(--font-sans)",
                        fontSize: 15,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--color-muted)", marginBottom: 6 }}>
                      Umpan balik
                    </label>
                    <textarea
                      rows={2}
                      value={cur.feedback}
                      onChange={(e) => setNilai({ ...nilai, [i.id]: { ...cur, feedback: e.target.value } })}
                      placeholder="Catatan untuk peserta…"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid var(--color-line-strong)",
                        borderRadius: 6,
                        background: "var(--color-paper)",
                        fontFamily: "var(--font-sans)",
                        fontSize: 15,
                        resize: "vertical",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {err && (
            <div role="alert" style={{ marginTop: 16, padding: "12px 14px", background: "#f7e6e0", border: "1px solid #e8cdc3", borderRadius: 8, fontSize: 14.5, color: "#8d4632" }}>
              {err}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" className="btn-solid-sm" disabled={busy} onClick={simpan} style={{ opacity: busy ? 0.6 : 1 }}>
              {busy ? "Menyimpan…" : "Simpan penilaian"}
            </button>
            <button type="button" className="btn-sm" onClick={() => setAktif(null)}>
              Batal
            </button>
            <span style={{ fontSize: 13.5, color: "var(--color-muted)" }}>
              Nilai akhir dihitung server setelah seluruh esai diberi poin.
            </span>
          </div>
        </Card>
      )}
    </>
  );
}

/* --- Tab 2: Hasil & Analisis Butir ---------------------------------- */

type Tahapan = { id: string; name: string; programId: string; status: string };
type AsesmenRingkas = {
  id: string;
  title: string;
  kind: string;
  kkm: number;
  publishStatus: string;
  subjectName: string | null;
  meetingNumber: number | null;
};

type Hasil = {
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
    userId: string;
    name: string;
    attemptNo: number;
    status: string;
    score: number | null;
    passed: boolean | null;
    submittedAt: string | null;
  }[];
};

type Butir = {
  id: string;
  sequence: number;
  type: QuestionType;
  prompt: string;
  points: number;
  options: string[] | null;
  answerKey: string | null;
  dijawab: number;
  benar: number;
  belumDinilai: number;
  rataPoin: number | null;
  persenBenar: number | null;
  sebaran: { label: string; indeks: number; kunci: boolean; n: number }[];
};

type Analisis = { assessment: { id: string; title: string }; butir: Butir[] };

/**
 * Ambang tingkat kesukaran.
 *
 * Soal yang dijawab benar oleh hampir semua orang tidak membedakan apa pun,
 * dan yang hampir tak seorang pun benar biasanya bukan berarti pesertanya
 * lemah — lebih sering soalnya ambigu atau materinya belum tersampaikan.
 */
function nadaKesukaran(persen: number | null) {
  if (persen === null) return { label: "Manual", bg: "#ece9e3", fg: "#544e45" };
  if (persen >= 85) return { label: "Terlalu mudah", bg: "#ece9e3", fg: "#6b6459" };
  if (persen >= 40) return { label: "Seimbang", bg: "#e4ede4", fg: "#2f5638" };
  if (persen >= 20) return { label: "Sulit", bg: "#f6eddb", fg: "#8a6a25" };
  return { label: "Perlu ditinjau", bg: "#f7e6e0", fg: "#8d4632" };
}

function TabHasil() {
  const programs = useResource<{ id: string; name: string; status: string }[]>("/admin/programs");
  const semuaTahapan = useResource<Tahapan[]>("/admin/tahapan");
  const [programId, setProgramId] = useState("");
  const [tahapanId, setTahapanId] = useState("");
  const [asesmenId, setAsesmenId] = useState("");

  const programAktif =
    programId || programs.data?.find((p) => p.status === "active")?.id || programs.data?.[0]?.id || "";
  const tahapanProgram = (semuaTahapan.data ?? []).filter((t) => t.programId === programAktif);
  const tahapanAktif =
    tahapanId && tahapanProgram.some((t) => t.id === tahapanId)
      ? tahapanId
      : tahapanProgram.find((t) => t.status === "running")?.id || tahapanProgram[0]?.id || "";

  const asesmen = useResource<AsesmenRingkas[]>(
    tahapanAktif ? `/admin/assessments?tahapanId=${tahapanAktif}` : null,
  );
  const hasil = useResource<Hasil>(asesmenId ? `/admin/assessments/${asesmenId}/results` : null);
  const analisis = useResource<Analisis>(
    asesmenId ? `/admin/assessments/${asesmenId}/analisis` : null,
  );

  const s = hasil.data?.summary;

  return (
    <>
      <Card padding={18} style={{ marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
              Program
            </label>
            <Combobox
              value={programAktif}
              onChange={(v) => {
                setProgramId(v);
                setTahapanId("");
                setAsesmenId("");
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
                setAsesmenId("");
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
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
              Kuis / Ujian
            </label>
            <Combobox
              value={asesmenId}
              onChange={setAsesmenId}
              options={[
                { value: "", label: "— pilih kuis atau ujian —" },
                ...(asesmen.data ?? []).map((a) => ({
                  value: a.id,
                  label: a.title,
                  hint: [a.kind, a.subjectName, a.meetingNumber !== null ? `P${a.meetingNumber}` : null]
                    .filter(Boolean)
                    .join(" · "),
                })),
              ]}
              loading={asesmen.loading}
              emptyText="Caturwulan ini belum punya kuis"
              ariaLabel="Kuis atau ujian"
            />
          </div>
        </div>
      </Card>

      {!asesmenId && (
        <EmptyState
          title="Pilih kuis atau ujian"
          hint="Ringkasan hasil dan analisis butir soal muncul setelah satu asesmen dipilih."
        />
      )}

      {asesmenId && hasil.loading && <div style={{ color: "var(--color-faint)" }}>Memuat hasil…</div>}
      {asesmenId && hasil.error && <div role="alert">{hasil.error}</div>}

      {s && (
        <>
          <div
            className="quad"
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 22 }}
          >
            <Card>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                Percobaan
              </div>
              <div style={{ fontFamily: serif, fontSize: 30, lineHeight: 1 }}>{s.attempts}</div>
            </Card>
            <Card>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                Rata-rata
              </div>
              <div style={{ fontFamily: serif, fontSize: 30, lineHeight: 1 }}>
                {s.averageScore ?? "—"}
              </div>
            </Card>
            <Card>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                Lulus
              </div>
              <div style={{ fontFamily: serif, fontSize: 30, lineHeight: 1, color: "#2f5638" }}>
                {s.passed}
              </div>
            </Card>
            <Card>
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                Menunggu dinilai
              </div>
              <div
                style={{
                  fontFamily: serif,
                  fontSize: 30,
                  lineHeight: 1,
                  color: s.pendingGrading ? "#8a6a25" : undefined,
                }}
              >
                {s.pendingGrading}
              </div>
            </Card>
          </div>

          {s.pendingGrading > 0 && (
            <div
              style={{
                marginBottom: 20,
                padding: "12px 14px",
                background: "#f6eddb",
                border: "1px solid #e6d6b4",
                borderRadius: 8,
                fontSize: 14.5,
                color: "#8a6a25",
                lineHeight: 1.6,
              }}
            >
              {s.pendingGrading} percobaan masih menunggu penilaian esai. Rata-rata dan jumlah lulus
              di atas belum memperhitungkannya — angkanya akan berubah setelah dinilai.
            </div>
          )}

          <Card padding={20} style={{ marginBottom: 22 }}>
            <CardTitle aside={`${hasil.data!.rows.length} percobaan`}>Hasil peserta</CardTitle>
            {hasil.data!.rows.length === 0 ? (
              <EmptyState title="Belum ada yang mengerjakan" />
            ) : (
              <div style={{ display: "grid", gap: 9, marginTop: 14 }}>
                {hasil.data!.rows.map((r) => (
                  <div
                    key={r.attemptId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "center",
                      border: "1px solid var(--color-line)",
                      borderRadius: 9,
                      padding: "11px 14px",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontWeight: 600 }}>{r.name}</span>
                      <span style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)", marginLeft: 8 }}>
                        percobaan ke-{r.attemptNo}
                      </span>
                    </div>
                    {r.score === null ? (
                      <Badge bg="#f6eddb" fg="#8a6a25">
                        Menunggu penilaian
                      </Badge>
                    ) : (
                      <Badge bg={r.passed ? "#e4ede4" : "#f7e6e0"} fg={r.passed ? "#2f5638" : "#8d4632"}>
                        {r.score} · {r.passed ? "Lulus" : "Belum lulus"}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* --- analisis butir --- */}
      {asesmenId && analisis.data && analisis.data.butir.length > 0 && (
        <Card padding={20}>
          <CardTitle aside={`${analisis.data.butir.length} soal`}>Analisis butir soal</CardTitle>
          <div style={{ fontSize: 14.5, color: "var(--color-faint)", margin: "8px 0 16px", lineHeight: 1.6 }}>
            Soal yang hampir semua orang jawab salah biasanya bukan berarti pesertanya lemah — lebih
            sering soalnya ambigu atau materinya belum tersampaikan.
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            {analisis.data.butir.map((b) => {
              const nada = nadaKesukaran(b.persenBenar);
              return (
                <div
                  key={b.id}
                  style={{ border: "1px solid var(--color-line)", borderRadius: 10, padding: 16 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 7 }}>
                        <span style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>
                          NO.{b.sequence}
                        </span>
                        <Badge bg={TYPE_TONE[b.type].bg} fg={TYPE_TONE[b.type].fg}>
                          {TYPE_LABEL[b.type]}
                        </Badge>
                        <Badge bg={nada.bg} fg={nada.fg}>
                          {nada.label}
                        </Badge>
                      </div>
                      <div style={{ fontSize: 16, lineHeight: 1.55 }}>{b.prompt}</div>
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 13, color: "var(--color-muted)", textAlign: "right" }}>
                      {b.persenBenar !== null ? (
                        <>
                          <div style={{ fontSize: 20, color: "var(--color-ink)" }}>{b.persenBenar}%</div>
                          <div>
                            {b.benar}/{b.dijawab} benar
                          </div>
                        </>
                      ) : (
                        <>
                          <div>{b.dijawab} jawaban</div>
                          {b.belumDinilai > 0 && (
                            <div style={{ color: "#8a6a25" }}>{b.belumDinilai} belum dinilai</div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {b.sebaran.length > 0 && (
                    <div style={{ marginTop: 14, display: "grid", gap: 7 }}>
                      {b.sebaran.map((o) => {
                        const lebar = b.dijawab ? Math.round((o.n / b.dijawab) * 100) : 0;
                        return (
                          <div
                            key={o.indeks}
                            style={{ display: "grid", gridTemplateColumns: "1fr 54px", gap: 10, alignItems: "center" }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 14.5,
                                  marginBottom: 3,
                                  fontWeight: o.kunci ? 700 : 400,
                                  color: o.kunci ? "var(--color-forest)" : "var(--color-body)",
                                }}
                              >
                                {o.kunci && "✓ "}
                                {o.label}
                              </div>
                              <div
                                style={{
                                  height: 7,
                                  borderRadius: 4,
                                  background: "var(--color-paper)",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${lebar}%`,
                                    height: "100%",
                                    background: o.kunci ? "var(--color-forest)" : "#c9c1b2",
                                  }}
                                />
                              </div>
                            </div>
                            <div style={{ fontFamily: mono, fontSize: 13, color: "var(--color-faint)", textAlign: "right" }}>
                              {o.n}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {b.rataPoin !== null && (
                    <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)", marginTop: 12 }}>
                      rata-rata {b.rataPoin} dari {b.points} poin
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {asesmenId && analisis.data && analisis.data.butir.length === 0 && (
        <EmptyState title="Asesmen ini belum punya soal" />
      )}
    </>
  );
}

/* --- pembungkus ------------------------------------------------------ */

export default function Penilaian() {
  const [tab, setTab] = useState<"antrean" | "hasil">("antrean");

  return (
    <>
      <PageHeader
        eyebrow="Penilaian"
        title="Penilaian"
        lead="Pilihan ganda dan benar-salah dinilai server saat dikumpulkan. Yang menunggu pengajar hanya esai — dan setelahnya, hasil serta analisis butir soalnya."
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(
          [
            ["antrean", "Antrean Esai"],
            ["hasil", "Hasil & Analisis"],
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

      {tab === "antrean" ? <TabAntrean /> : <TabHasil />}
    </>
  );
}
