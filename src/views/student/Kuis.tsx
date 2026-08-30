import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { ApiError, api } from "../../lib/api";
import { Badge, Card, EmptyState, mono, serif } from "../../components/ui";

/**
 * Pengerjaan kuis / ujian oleh peserta.
 *
 * Tiga tipe soal: pilihan ganda, benar-salah, dan esai. Nilai objektif dihitung
 * server; esai menunggu penilaian pengajar, jadi layar hasil harus jujur
 * membedakan "nilai sementara" dari "nilai akhir".
 */

type QuestionType = "multiple_choice" | "true_false" | "essay";

type Soal = {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[] | null;
  points: number;
  sequence: number;
};

type Ringkasan = {
  id: string;
  title: string;
  kind: "kuis" | "ujian" | "latihan";
  description: string | null;
  kkm: number;
  durationMinutes: number;
  maxAttempts: number;
  showFeedback: boolean;
  questionCount: number;
  totalPoints: number;
  attemptsLeft: number | null;
  attempts: {
    id: string;
    attemptNo: number;
    status: "berlangsung" | "menunggu_penilaian" | "dinilai";
    score: number | null;
    passed: boolean | null;
    submittedAt: string | null;
  }[];
};

type HasilItem = {
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
  explanation: string | null;
};

type Hasil = {
  attempt: {
    id: string;
    status: "berlangsung" | "menunggu_penilaian" | "dinilai";
    score: number | null;
    passed: boolean | null;
    autoPoints: number;
    maxPoints: number;
    attemptNo: number;
  };
  assessment: { id: string; title: string; kind: string; kkm: number; showFeedback: boolean } | null;
  items: HasilItem[];
};

const TYPE_LABEL: Record<QuestionType, string> = {
  multiple_choice: "Pilihan ganda",
  true_false: "Benar–salah",
  essay: "Esai",
};

const STATUS_LABEL: Record<string, string> = {
  berlangsung: "Sedang dikerjakan",
  menunggu_penilaian: "Menunggu penilaian",
  dinilai: "Sudah dinilai",
};

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* --- layar hasil ------------------------------------------------- */

function LayarHasil({ hasil, onUlangi }: { hasil: Hasil; onUlangi: () => void }) {
  const { attempt, assessment, items } = hasil;
  const menunggu = attempt.status === "menunggu_penilaian";
  const kkm = assessment?.kkm ?? 70;

  // Selama esai belum dinilai, yang bisa ditampilkan hanyalah nilai sementara.
  const sementara = attempt.maxPoints
    ? Math.round((attempt.autoPoints / attempt.maxPoints) * 100)
    : 0;

  return (
    <>
      <Card
        tone={menunggu ? "sand" : attempt.passed ? "mist" : "surface"}
        padding={28}
        style={{
          marginBottom: 20,
          border: menunggu
            ? undefined
            : `1px solid ${attempt.passed ? "#d6e0d8" : "#e8cdc3"}`,
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          Percobaan ke-{attempt.attemptNo} · {STATUS_LABEL[attempt.status]}
        </div>

        {menunggu ? (
          <>
            <div style={{ fontFamily: serif, fontSize: 30, lineHeight: 1.2 }}>
              Jawaban Anda sudah terkirim.
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 15.5, lineHeight: 1.65, color: "var(--color-body)", maxWidth: 620 }}>
              Bagian pilihan ganda dan benar–salah sudah dinilai otomatis. Bagian esai menunggu
              penilaian pengajar, jadi nilai akhir belum dapat ditetapkan.
            </p>
            <div
              style={{
                display: "flex",
                gap: 30,
                marginTop: 22,
                paddingTop: 18,
                borderTop: "1px solid var(--color-line-soft)",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div className="eyebrow">Nilai sementara</div>
                <div style={{ fontFamily: serif, fontSize: 34, lineHeight: 1.1, marginTop: 6 }}>
                  {sementara}
                </div>
                <div style={{ fontSize: 13, color: "var(--color-muted)", marginTop: 4 }}>
                  {attempt.autoPoints} dari {attempt.maxPoints} poin objektif
                </div>
              </div>
              <div>
                <div className="eyebrow">KKM</div>
                <div style={{ fontFamily: serif, fontSize: 34, lineHeight: 1.1, marginTop: 6 }}>{kkm}</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
              <div style={{ fontFamily: serif, fontSize: 52, lineHeight: 1 }}>{attempt.score}</div>
              <div style={{ fontSize: 16, color: "var(--color-muted)" }}>dari 100 · KKM {kkm}</div>
            </div>
            <div style={{ marginTop: 16 }}>
              {attempt.passed ? (
                <Badge bg="#e6ede7" fg="#1f3d34">Mencapai KKM</Badge>
              ) : (
                <Badge bg="#f7e6e0" fg="#8d4632">Belum mencapai KKM</Badge>
              )}
            </div>
            <p style={{ margin: "16px 0 0", fontSize: 15, lineHeight: 1.65, color: "var(--color-body)", maxWidth: 620 }}>
              {attempt.passed
                ? "Pemahaman Anda sudah memadai. Lanjutkan, dan jaga dengan murojaah."
                : "Belum mencapai KKM. Ulangi bagian yang keliru — ini bagian dari proses, bukan kegagalan."}
            </p>
          </>
        )}
      </Card>

      <Card padding={0} style={{ overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #ece6da" }}>
          <h2 style={{ fontFamily: serif, fontSize: 21 }}>Rincian jawaban</h2>
        </div>
        {items.map((it, i) => {
          const belumDinilai = it.earnedPoints == null;
          return (
            <div key={it.id} style={{ padding: "20px 24px", borderTop: i === 0 ? undefined : "1px solid var(--color-line-softer)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                <div className="eyebrow">
                  Soal {i + 1} · {TYPE_LABEL[it.type]}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {belumDinilai ? (
                    <Badge bg="#f6eddb" fg="#8a6a25">Menunggu penilaian</Badge>
                  ) : it.isCorrect ? (
                    <Badge bg="#e6ede7" fg="#1f3d34">Benar</Badge>
                  ) : (
                    <Badge bg="#f7e6e0" fg="#8d4632">Belum tepat</Badge>
                  )}
                  <span style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-muted)" }}>
                    {belumDinilai ? "—" : it.earnedPoints}/{it.points}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: 16, lineHeight: 1.6, marginTop: 10 }}>{it.prompt}</div>

              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {it.type === "multiple_choice" && it.options
                  ? it.options.map((opt, idx) => {
                      const dipilih = it.response === String(idx);
                      const kunci = it.answerKey === String(idx);
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            fontSize: 15,
                            border: `1px solid ${kunci ? "#1f3d34" : dipilih ? "#e8cdc3" : "var(--color-line)"}`,
                            background: kunci ? "#e6ede7" : dipilih ? "#f7e6e0" : "transparent",
                          }}
                        >
                          {opt}
                          {dipilih && <span style={{ color: "var(--color-muted)", fontSize: 13 }}> — jawaban Anda</span>}
                          {kunci && <span style={{ color: "#1f3d34", fontSize: 13, fontWeight: 700 }}> — kunci</span>}
                        </div>
                      );
                    })
                  : null}

                {it.type === "true_false" && (
                  <div style={{ fontSize: 15 }}>
                    Jawaban Anda:{" "}
                    <strong>{it.response === "true" ? "Benar" : it.response === "false" ? "Salah" : "—"}</strong>
                    {it.answerKey && (
                      <>
                        {" "}· kunci: <strong>{it.answerKey === "true" ? "Benar" : "Salah"}</strong>
                      </>
                    )}
                  </div>
                )}

                {it.type === "essay" && (
                  <div
                    style={{
                      padding: "12px 15px",
                      background: "var(--color-paper)",
                      borderRadius: 8,
                      fontSize: 15,
                      lineHeight: 1.65,
                      color: "var(--color-body)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {it.response || "(tidak dijawab)"}
                  </div>
                )}
              </div>

              {it.feedback && (
                <div style={{ marginTop: 12, padding: "12px 15px", background: "var(--color-mist)", borderRadius: 8, fontSize: 14.5, lineHeight: 1.6, color: "#2f4a3f" }}>
                  <strong>Umpan balik pengajar:</strong> {it.feedback}
                </div>
              )}
              {it.explanation && (
                <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, color: "var(--color-muted)" }}>
                  {it.explanation}
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
        <button type="button" className="btn-sm" onClick={onUlangi}>
          Kembali ke ringkasan kuis
        </button>
        <Link to="/belajar/nilai" className="btn-sm">
          Lihat semua nilai
        </Link>
      </div>
    </>
  );
}

/* --- halaman ------------------------------------------------------ */

export default function Kuis() {
  const { id } = useParams();
  const [ringkasan, setRingkasan] = useState<Ringkasan | null>(null);
  const [soal, setSoal] = useState<Soal[] | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [jawaban, setJawaban] = useState<Record<string, string>>({});
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [sisaDetik, setSisaDetik] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const muat = useCallback(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<Ringkasan>(`/kuis/${id}`)
      .then((d) => {
        setRingkasan(d);
        setErr(null);
      })
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Gagal memuat kuis."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(muat, [muat]);

  const kembali = useCallback(() => {
    setHasil(null);
    setSoal(null);
    setAttemptId(null);
    setJawaban({});
    setSisaDetik(null);
    muat();
  }, [muat]);

  const kirim = useCallback(
    async (otomatis = false) => {
      if (!attemptId || busy) return;
      setBusy(true);
      try {
        await api.post(`/kuis/attempts/${attemptId}/submit`, {
          responses: Object.entries(jawaban).map(([questionId, response]) => ({ questionId, response })),
        });
        const h = await api.get<Hasil>(`/kuis/attempts/${attemptId}/result`);
        setHasil(h);
        setSoal(null);
        setSisaDetik(null);
        if (otomatis) setErr("Waktu habis — jawaban Anda dikumpulkan otomatis.");
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : "Gagal mengumpulkan jawaban.");
      } finally {
        setBusy(false);
      }
    },
    [attemptId, jawaban, busy],
  );

  // Hitung mundur. Simpan `kirim` di ref agar interval tidak dibuat ulang
  // setiap kali jawaban berubah.
  const kirimRef = useRef(kirim);
  kirimRef.current = kirim;

  useEffect(() => {
    if (sisaDetik == null) return;
    if (sisaDetik <= 0) {
      void kirimRef.current(true);
      return;
    }
    const t = setTimeout(() => setSisaDetik((v) => (v == null ? null : v - 1)), 1000);
    return () => clearTimeout(t);
  }, [sisaDetik]);

  async function mulai() {
    if (!id) return;
    setBusy(true);
    setErr(null);
    try {
      const d = await api.post<{ attemptId: string; questions: Soal[]; durationMinutes: number }>(
        `/kuis/${id}/start`,
      );
      setAttemptId(d.attemptId);
      setSoal(d.questions);
      setJawaban({});
      setSisaDetik(d.durationMinutes > 0 ? d.durationMinutes * 60 : null);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Tidak dapat memulai kuis.");
    } finally {
      setBusy(false);
    }
  }

  async function lihatHasil(attId: string) {
    try {
      setHasil(await api.get<Hasil>(`/kuis/attempts/${attId}/result`));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Gagal memuat hasil.");
    }
  }

  const terjawab = useMemo(
    () => (soal ?? []).filter((q) => (jawaban[q.id] ?? "").trim() !== "").length,
    [soal, jawaban],
  );

  if (loading) return <div className="shell" style={{ padding: 40, color: "var(--color-muted)" }}>Memuat kuis…</div>;

  if (err && !ringkasan) {
    return (
      <div className="shell" style={{ paddingBlock: "40px 80px" }}>
        <EmptyState title="Kuis tidak dapat dibuka" hint={err} />
        <div style={{ marginTop: 20 }}>
          <Link to="/belajar/dashboard" className="btn-sm">Kembali ke dasbor</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shell" style={{ paddingBlock: "32px 80px" }}>
      <nav aria-label="Breadcrumb" style={{ display: "flex", gap: 9, fontSize: 14, color: "#807a70", marginBottom: 20, flexWrap: "wrap" }}>
        <Link to="/belajar/dashboard" style={{ color: "var(--color-forest)", fontWeight: 600 }}>Dasbor</Link>
        <span style={{ color: "#c9c1b2" }}>/</span>
        <Link to="/belajar/nilai">Nilai</Link>
        <span style={{ color: "#c9c1b2" }}>/</span>
        <span style={{ color: "var(--color-ink)", fontWeight: 600 }}>{ringkasan?.title}</span>
      </nav>

      <header style={{ marginBottom: 24 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          {ringkasan?.kind === "ujian" ? "Ujian" : "Kuis"} · KKM {ringkasan?.kkm}
        </div>
        <h1 style={{ fontSize: 34 }}>{ringkasan?.title}</h1>
        {ringkasan?.description && (
          <p style={{ margin: "12px 0 0", fontSize: 16, lineHeight: 1.65, color: "var(--color-body)", maxWidth: 660 }}>
            {ringkasan.description}
          </p>
        )}
      </header>

      {err && soal && (
        <div role="alert" style={{ padding: "13px 15px", background: "#f6eddb", border: "1px solid #e8dcc0", borderRadius: 8, fontSize: 14.5, color: "#8a6a25", marginBottom: 18 }}>
          {err}
        </div>
      )}

      {/* --- hasil --- */}
      {hasil ? (
        <LayarHasil hasil={hasil} onUlangi={kembali} />
      ) : soal ? (
        /* --- sedang mengerjakan --- */
        <>
          <div
            style={{
              position: "sticky",
              top: 56,
              zIndex: 20,
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "center",
              padding: "14px 20px",
              background: "var(--color-surface)",
              border: "1px solid var(--color-line)",
              borderRadius: 10,
              marginBottom: 18,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontSize: 14.5, color: "var(--color-muted)" }}>
              {terjawab} dari {soal.length} soal terjawab
            </div>
            {sisaDetik != null && (
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 16,
                  fontWeight: 700,
                  color: sisaDetik <= 60 ? "#8d4632" : "var(--color-forest)",
                }}
              >
                {mmss(sisaDetik)}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {soal.map((q, i) => (
              <Card key={q.id} padding={24}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                  <div className="eyebrow">Soal {i + 1} · {TYPE_LABEL[q.type]}</div>
                  <span style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>{q.points} poin</span>
                </div>
                <div style={{ fontSize: 17, lineHeight: 1.6, marginTop: 10, marginBottom: 16 }}>{q.prompt}</div>

                {q.type === "multiple_choice" && q.options && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {q.options.map((opt, idx) => {
                      const dipilih = jawaban[q.id] === String(idx);
                      return (
                        <label
                          key={idx}
                          style={{
                            display: "flex",
                            gap: 11,
                            alignItems: "flex-start",
                            padding: "12px 15px",
                            borderRadius: 8,
                            border: `1px solid ${dipilih ? "var(--color-forest)" : "var(--color-line)"}`,
                            background: dipilih ? "var(--color-mist)" : "transparent",
                            cursor: "pointer",
                            fontSize: 15.5,
                            lineHeight: 1.5,
                          }}
                        >
                          <input
                            type="radio"
                            name={q.id}
                            checked={dipilih}
                            onChange={() => setJawaban({ ...jawaban, [q.id]: String(idx) })}
                            style={{ marginTop: 3 }}
                          />
                          {opt}
                        </label>
                      );
                    })}
                  </div>
                )}

                {q.type === "true_false" && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {[
                      { v: "true", l: "Benar" },
                      { v: "false", l: "Salah" },
                    ].map((o) => (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => setJawaban({ ...jawaban, [q.id]: o.v })}
                        className={jawaban[q.id] === o.v ? "btn-solid-sm" : "btn-sm"}
                        style={{ minWidth: 120 }}
                      >
                        {o.l}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === "essay" && (
                  <textarea
                    rows={5}
                    value={jawaban[q.id] ?? ""}
                    onChange={(e) => setJawaban({ ...jawaban, [q.id]: e.target.value })}
                    placeholder="Tulis jawaban Anda…"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      border: "1px solid var(--color-line-strong)",
                      borderRadius: 8,
                      background: "var(--color-paper)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 15.5,
                      lineHeight: 1.65,
                      resize: "vertical",
                    }}
                  />
                )}
              </Card>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 22, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => kirim(false)} style={{ opacity: busy ? 0.6 : 1 }}>
              {busy ? "Mengirim…" : "Kumpulkan jawaban"}
            </button>
            <span style={{ fontSize: 14, color: "var(--color-muted)" }}>
              Esai dinilai pengajar, jadi nilai akhir muncul setelah diperiksa.
            </span>
          </div>
        </>
      ) : (
        /* --- ringkasan sebelum mulai --- */
        <>
          <Card padding={26} style={{ marginBottom: 20 }}>
            <div className="quad" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }}>
              {[
                { k: "KKM", v: String(ringkasan?.kkm ?? "—") },
                { k: "Jumlah soal", v: String(ringkasan?.questionCount ?? 0) },
                { k: "Total poin", v: String(ringkasan?.totalPoints ?? 0) },
                {
                  k: "Waktu",
                  v: ringkasan?.durationMinutes ? `${ringkasan.durationMinutes} menit` : "Tanpa batas",
                },
              ].map((x) => (
                <div key={x.k}>
                  <div className="eyebrow">{x.k}</div>
                  <div style={{ fontFamily: serif, fontSize: 28, lineHeight: 1.1, marginTop: 6 }}>{x.v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--color-line-soft)", fontSize: 14.5, color: "var(--color-muted)" }}>
              {ringkasan?.maxAttempts === 0
                ? "Dapat dikerjakan berulang kali."
                : `Kesempatan tersisa: ${ringkasan?.attemptsLeft ?? 0} dari ${ringkasan?.maxAttempts}.`}
            </div>
          </Card>

          {err && (
            <div role="alert" style={{ padding: "13px 15px", background: "#f7e6e0", border: "1px solid #e8cdc3", borderRadius: 8, fontSize: 14.5, color: "#8d4632", marginBottom: 18 }}>
              {err}
            </div>
          )}

          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || (ringkasan?.attemptsLeft === 0)}
            onClick={mulai}
            style={{ opacity: busy || ringkasan?.attemptsLeft === 0 ? 0.6 : 1 }}
          >
            {busy ? "Menyiapkan…" : "Mulai mengerjakan"}
          </button>

          {(ringkasan?.attempts.length ?? 0) > 0 && (
            <Card padding={0} style={{ marginTop: 24, overflow: "hidden" }}>
              <div style={{ padding: "16px 22px", borderBottom: "1px solid #ece6da" }}>
                <h2 style={{ fontFamily: serif, fontSize: 20 }}>Riwayat percobaan</h2>
              </div>
              {ringkasan?.attempts.map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 22px",
                    borderTop: "1px solid var(--color-line-softer)",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontFamily: mono, fontSize: 13, color: "var(--color-faint)", width: 90 }}>
                    KE-{a.attemptNo}
                  </div>
                  <div style={{ flex: 1, minWidth: 140, fontSize: 14.5 }}>{STATUS_LABEL[a.status]}</div>
                  <div style={{ fontFamily: serif, fontSize: 22, minWidth: 50 }}>{a.score ?? "—"}</div>
                  {a.passed != null &&
                    (a.passed ? (
                      <Badge bg="#e6ede7" fg="#1f3d34">Lulus KKM</Badge>
                    ) : (
                      <Badge bg="#f7e6e0" fg="#8d4632">Belum lulus</Badge>
                    ))}
                  {a.status !== "berlangsung" && (
                    <button type="button" className="btn-sm" onClick={() => lihatHasil(a.id)}>
                      Lihat hasil
                    </button>
                  )}
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
