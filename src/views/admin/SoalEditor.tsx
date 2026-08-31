import { useState } from "react";
import { api } from "../../lib/api";
import { mutate, useResource } from "../../lib/useApi";
import { Badge, EmptyState, mono, serif } from "../../components/ui";
import { Area, Check, DeleteButton, Field, FormPanel, Select, Text } from "../../components/form";

/**
 * Bank soal satu kuis/ujian.
 *
 * Formulir berubah bentuk mengikuti tipe soal: pilihan ganda butuh daftar
 * pilihan dan satu kunci, benar-salah cukup satu kunci, esai tidak punya
 * kunci sama sekali karena dinilai manual.
 */

export type QuestionType = "multiple_choice" | "true_false" | "essay";

export type Soal = {
  id: string;
  assessmentId: string;
  type: QuestionType;
  prompt: string;
  options: string | null;
  answerKey: string | null;
  explanation: string | null;
  points: number;
  sequence: number;
};

export const TYPE_LABEL: Record<QuestionType, string> = {
  multiple_choice: "Pilihan ganda",
  true_false: "Benar–salah",
  essay: "Esai",
};

export const TYPE_TONE: Record<QuestionType, { bg: string; fg: string }> = {
  multiple_choice: { bg: "#e2ecf5", fg: "#2f5b80" },
  true_false: { bg: "#e6ede7", fg: "#1f3d34" },
  essay: { bg: "#f6eddb", fg: "#8a6a25" },
};

type Draft = {
  type: QuestionType;
  prompt: string;
  options: string[];
  answerKey: string;
  explanation: string;
  points: number;
  sequence: number;
};

const kosong = (seq: number): Draft => ({
  type: "multiple_choice",
  prompt: "",
  options: ["", ""],
  answerKey: "0",
  explanation: "",
  points: 1,
  sequence: seq,
});

export default function SoalEditor({
  assessmentId,
  canWrite,
}: {
  assessmentId: string;
  canWrite: boolean;
}) {
  const list = useResource<Soal[]>(`/admin/assessments/${assessmentId}/questions`);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ambilBank, setAmbilBank] = useState(false);

  const rows = list.data ?? [];
  const totalPoin = rows.reduce((n, r) => n + r.points, 0);

  async function simpan() {
    if (!draft) return;
    setBusy(true);
    const body = {
      assessmentId,
      type: draft.type,
      prompt: draft.prompt,
      // Hanya pilihan ganda yang mengirim options.
      options: draft.type === "multiple_choice" ? draft.options.filter((o) => o.trim() !== "") : null,
      // Esai tidak punya kunci.
      answerKey: draft.type === "essay" ? null : draft.answerKey,
      explanation: draft.explanation || null,
      points: draft.points,
      sequence: draft.sequence,
    };
    const m = await mutate(() =>
      editingId
        ? api.patch(`/admin/assessments/questions/${editingId}`, body)
        : api.post("/admin/assessments/questions", body),
    );
    setBusy(false);
    if (m) return setErr(m);
    setDraft(null);
    setEditingId(null);
    setErr(null);
    list.reload();
  }

  function ubah(q: Soal) {
    setErr(null);
    setEditingId(q.id);
    setDraft({
      type: q.type,
      prompt: q.prompt,
      options: q.options ? (JSON.parse(q.options) as string[]) : ["", ""],
      answerKey: q.answerKey ?? (q.type === "true_false" ? "true" : "0"),
      explanation: q.explanation ?? "",
      points: q.points,
      sequence: q.sequence,
    });
  }

  return (
    <section className="card" style={{ padding: 22, marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
        <h3 style={{ fontFamily: serif, fontSize: 20 }}>Soal</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-muted)" }}>
            {rows.length} soal · {totalPoin} poin
          </span>
          {canWrite && (
            <>
              <button
                type="button"
                className="btn-sm"
                onClick={() => {
                  setErr(null);
                  setDraft(null);
                  setAmbilBank((v) => !v);
                }}
              >
                {ambilBank ? "Tutup bank" : "Ambil dari bank"}
              </button>
              <button
                type="button"
                className="btn-solid-sm"
                onClick={() => {
                  setErr(null);
                  setEditingId(null);
                  setAmbilBank(false);
                  setDraft(kosong(rows.length + 1));
                }}
              >
                Tambah soal
              </button>
            </>
          )}
        </div>
      </div>

      {ambilBank && (
        <AmbilDariBank
          assessmentId={assessmentId}
          onSelesai={(n) => {
            setAmbilBank(false);
            if (n > 0) list.reload();
          }}
        />
      )}

      {draft && (
        <FormPanel
          title={editingId ? "Ubah soal" : "Soal baru"}
          error={err}
          busy={busy}
          onSubmit={simpan}
          onCancel={() => {
            setDraft(null);
            setEditingId(null);
            setErr(null);
          }}
        >
          <Field label="Tipe soal">
            <Select
              value={draft.type}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  type: v,
                  // Kunci disesuaikan agar tidak membawa nilai tipe sebelumnya.
                  answerKey: v === "true_false" ? "true" : v === "multiple_choice" ? "0" : "",
                })
              }
              options={[
                { value: "multiple_choice", label: "Pilihan ganda" },
                { value: "true_false", label: "Benar–salah" },
                { value: "essay", label: "Esai" },
              ]}
            />
          </Field>
          <Field label="Poin" hint="Bobot soal ini terhadap total poin kuis.">
            <Text type="number" value={String(draft.points)} onChange={(v) => setDraft({ ...draft, points: Number(v) || 1 })} />
          </Field>

          <Field label="Pertanyaan" span>
            <Area value={draft.prompt} onChange={(v) => setDraft({ ...draft, prompt: v })} rows={3} />
          </Field>

          {draft.type === "multiple_choice" && (
            <Field label="Pilihan jawaban" hint="Tandai satu pilihan sebagai kunci." span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {draft.options.map((opt, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      type="radio"
                      name="kunci"
                      checked={draft.answerKey === String(i)}
                      onChange={() => setDraft({ ...draft, answerKey: String(i) })}
                      aria-label={`Jadikan pilihan ${i + 1} sebagai kunci`}
                    />
                    <input
                      type="text"
                      value={opt}
                      placeholder={`Pilihan ${i + 1}`}
                      onChange={(e) => {
                        const next = [...draft.options];
                        next[i] = e.target.value;
                        setDraft({ ...draft, options: next });
                      }}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        border: `1px solid ${draft.answerKey === String(i) ? "var(--color-forest)" : "var(--color-line-strong)"}`,
                        borderRadius: 6,
                        background: draft.answerKey === String(i) ? "var(--color-mist)" : "var(--color-paper)",
                        fontFamily: "var(--font-sans)",
                        fontSize: 15,
                      }}
                    />
                    {draft.options.length > 2 && (
                      <button
                        type="button"
                        className="btn-sm"
                        onClick={() => {
                          const next = draft.options.filter((_, j) => j !== i);
                          const key = Number(draft.answerKey);
                          setDraft({
                            ...draft,
                            options: next,
                            answerKey: String(key > i ? key - 1 : key === i ? 0 : key),
                          });
                        }}
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                ))}
                {draft.options.length < 8 && (
                  <button
                    type="button"
                    className="btn-sm"
                    style={{ alignSelf: "flex-start" }}
                    onClick={() => setDraft({ ...draft, options: [...draft.options, ""] })}
                  >
                    Tambah pilihan
                  </button>
                )}
              </div>
            </Field>
          )}

          {draft.type === "true_false" && (
            <Field label="Kunci jawaban" span>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { v: "true", l: "Benar" },
                  { v: "false", l: "Salah" },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    className={draft.answerKey === o.v ? "btn-solid-sm" : "btn-sm"}
                    style={{ minWidth: 120 }}
                    onClick={() => setDraft({ ...draft, answerKey: o.v })}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </Field>
          )}

          {draft.type === "essay" && (
            <Field label="Penilaian" span>
              <div style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--color-muted)" }}>
                Soal esai tidak memiliki kunci jawaban. Pengajar menilai manual lewat antrean
                penilaian, dan nilai akhir peserta baru muncul setelah esai diperiksa.
              </div>
            </Field>
          )}

          <Field label="Pembahasan" hint="Ditampilkan ke peserta bila kuis mengizinkan umpan balik." span>
            <Area value={draft.explanation} onChange={(v) => setDraft({ ...draft, explanation: v })} rows={2} />
          </Field>
        </FormPanel>
      )}

      {list.loading ? (
        <div style={{ padding: 20, color: "var(--color-muted)" }}>Memuat soal…</div>
      ) : rows.length === 0 ? (
        <EmptyState title="Belum ada soal" hint="Tambahkan soal pilihan ganda, benar–salah, atau esai." />
      ) : (
        rows.map((q, i) => {
          const opts = q.options ? (JSON.parse(q.options) as string[]) : null;
          return (
            <div key={q.id} style={{ padding: "16px 0", borderTop: "1px solid var(--color-line-soft)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Badge bg={TYPE_TONE[q.type].bg} fg={TYPE_TONE[q.type].fg}>
                  {TYPE_LABEL[q.type]}
                </Badge>
                <span style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-muted)" }}>{q.points} poin</span>
                <div style={{ flex: 1 }} />
                {canWrite && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" className="btn-sm" onClick={() => ubah(q)}>
                      Ubah
                    </button>
                    <DeleteButton
                      onConfirm={async () => {
                        await mutate(() => api.del(`/admin/assessments/questions/${q.id}`));
                        list.reload();
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{ fontSize: 16, lineHeight: 1.6, marginTop: 10 }}>{q.prompt}</div>

              {opts && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                  {opts.map((o, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: 14.5,
                        padding: "7px 12px",
                        borderRadius: 6,
                        background: q.answerKey === String(idx) ? "var(--color-mist)" : "var(--color-paper)",
                        color: q.answerKey === String(idx) ? "var(--color-forest)" : "var(--color-body)",
                        fontWeight: q.answerKey === String(idx) ? 700 : 400,
                      }}
                    >
                      {o}
                      {q.answerKey === String(idx) && " ✓"}
                    </div>
                  ))}
                </div>
              )}

              {q.type === "true_false" && (
                <div style={{ fontSize: 14.5, marginTop: 8, color: "var(--color-forest)", fontWeight: 600 }}>
                  Kunci: {q.answerKey === "true" ? "Benar" : "Salah"}
                </div>
              )}

              {q.type === "essay" && (
                <div style={{ fontSize: 14, marginTop: 8, color: "var(--color-muted)" }}>
                  Dinilai manual oleh pengajar.
                </div>
              )}
            </div>
          );
        })
      )}
    </section>
  );
}

export { Check };

/* --- mengambil soal dari Bank Soal ---------------------------------- */

type SoalBank = {
  id: string;
  type: "multiple_choice" | "true_false" | "essay";
  prompt: string;
  options: string[] | null;
  answerKey: string | null;
  points: number;
  topic: string | null;
  difficulty: string;
};

const TIPE_RINGKAS: Record<string, string> = {
  multiple_choice: "PG",
  true_false: "B/S",
  essay: "Esai",
};

/**
 * Memilih soal dari bank untuk disalin ke asesmen ini.
 *
 * Isinya disalin, bukan dirujuk: menyunting soal di bank setelahnya tidak
 * mengubah asesmen ini, sehingga ujian yang sudah berjalan tetap utuh.
 */
function AmbilDariBank({
  assessmentId,
  onSelesai,
}: {
  assessmentId: string;
  onSelesai: (jumlah: number) => void;
}) {
  const [q, setQ] = useState("");
  const [tipe, setTipe] = useState("");
  const [pilih, setPilih] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const query = new URLSearchParams({ perPage: "50" });
  if (q.trim()) query.set("q", q.trim());
  if (tipe) query.set("type", tipe);
  const bank = useResource<SoalBank[]>(`/admin/bank-soal?${query.toString()}`);

  async function salin() {
    if (!pilih.length) return;
    setBusy(true);
    const pesan = await mutate(() =>
      api.post(`/admin/bank-soal/to-assessment/${assessmentId}`, { questionIds: pilih }),
    );
    setBusy(false);
    if (pesan) return setErr(pesan);
    const n = pilih.length;
    setPilih([]);
    onSelesai(n);
  }

  return (
    <div
      style={{
        border: "1px solid var(--color-forest)",
        borderRadius: 11,
        padding: 18,
        marginBottom: 18,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ fontFamily: serif, fontSize: 18 }}>Ambil dari Bank Soal</div>
        <button
          type="button"
          className="btn-solid-sm"
          disabled={busy || pilih.length === 0}
          onClick={salin}
          style={{ opacity: busy || pilih.length === 0 ? 0.55 : 1 }}
        >
          {busy ? "Menyalin…" : `Salin ${pilih.length} soal`}
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <input
          type="search"
          value={q}
          placeholder="Cari pertanyaan atau topik…"
          onChange={(e) => setQ(e.target.value)}
          style={{
            flex: "1 1 220px",
            padding: "9px 12px",
            border: "1px solid var(--color-line)",
            borderRadius: 8,
            background: "var(--color-surface)",
            fontSize: 15,
            fontFamily: "inherit",
            color: "var(--color-ink)",
          }}
        />
        {["", "multiple_choice", "true_false", "essay"].map((t) => (
          <button
            key={t || "semua"}
            type="button"
            className={tipe === t ? "btn-solid-sm" : "btn-sm"}
            onClick={() => setTipe(t)}
          >
            {t ? TIPE_RINGKAS[t] : "Semua"}
          </button>
        ))}
      </div>

      {err && (
        <div role="alert" style={{ fontSize: 14.5, color: "#8d4632", marginBottom: 10 }}>
          {err}
        </div>
      )}

      {bank.loading && <div style={{ color: "var(--color-faint)" }}>Memuat bank soal…</div>}
      {bank.data && bank.data.length === 0 && (
        <div style={{ fontSize: 15, color: "var(--color-faint)", lineHeight: 1.6 }}>
          Bank soal masih kosong atau tidak ada yang cocok. Tambahkan lewat menu Bank Soal.
        </div>
      )}

      {bank.data && bank.data.length > 0 && (
        <div style={{ display: "grid", gap: 8, maxHeight: 340, overflowY: "auto" }}>
          {bank.data.map((s) => {
            const dipilih = pilih.includes(s.id);
            return (
              <label
                key={s.id}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  border: "1px solid var(--color-line)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  cursor: "pointer",
                  background: dipilih ? "var(--color-paper)" : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={dipilih}
                  onChange={() =>
                    setPilih((v) => (dipilih ? v.filter((x) => x !== s.id) : [...v, s.id]))
                  }
                  style={{ marginTop: 3 }}
                />
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontFamily: mono, fontSize: 11.5, color: "var(--color-faint)" }}>
                    {TIPE_RINGKAS[s.type]} · {s.points} poin
                    {s.topic ? ` · ${s.topic}` : ""}
                  </span>
                  <span style={{ display: "block", fontSize: 15.5, lineHeight: 1.5, marginTop: 3 }}>
                    {s.prompt}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
