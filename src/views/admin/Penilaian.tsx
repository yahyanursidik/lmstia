import { useState } from "react";
import { api } from "../../lib/api";
import { mutate, useResource } from "../../lib/useApi";
import { Badge, Card, EmptyState, PageHeader, mono, serif } from "../../components/ui";
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

export default function Penilaian() {
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
    setSukses("Penilaian tersimpan. Nilai akhir peserta sudah diperbarui.");
    setAktif(null);
    antrean.reload();
  }

  const rows = antrean.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Penilaian"
        title="Penilaian Esai"
        lead="Pilihan ganda dan benar–salah dinilai otomatis. Hanya esai yang menunggu pemeriksaan pengajar di sini."
      />

      {sukses && (
        <div
          role="status"
          style={{ padding: "13px 16px", background: "var(--color-mist)", border: "1px solid #d6e0d8", borderRadius: 8, fontSize: 14.5, color: "#2f4a3f", marginBottom: 18 }}
        >
          {sukses}
        </div>
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
