import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { mutate, usePagedResource, useResource } from "../../lib/useApi";
import { useAuth } from "../../lib/auth";
import { Badge, Card, EmptyState, PageHeader, mono, serif } from "../../components/ui";
import { Area, Field, FormPanel, Select, Text } from "../../components/form";
import { Combobox } from "../../components/Combobox";
import { KOLOM, TEMPLATE_CSV, bacaBaris, type HasilBaris } from "../../lib/bankCsv";

/**
 * Bank Soal — kumpulan soal yang dapat dipakai ulang di program mana pun.
 *
 * Soal di sini sengaja tidak terikat pada program, tahapan, atau mata
 * pelajaran; pengelompokannya memakai topik dan tag. Saat dipakai pada kuis
 * atau ujian, isinya DISALIN, bukan dirujuk — supaya menyunting soal bank
 * tidak diam-diam mengubah ujian yang sudah lewat.
 */

type Soal = {
  id: string;
  type: "multiple_choice" | "true_false" | "essay";
  prompt: string;
  options: string[] | null;
  answerKey: string | null;
  explanation: string | null;
  points: number;
  topic: string | null;
  tags: string | null;
  difficulty: "mudah" | "sedang" | "sulit";
  createdAt: string;
};

const TIPE_LABEL: Record<string, string> = {
  multiple_choice: "Pilihan Ganda",
  true_false: "Benar-Salah",
  essay: "Esai",
};

const TIPE_TONE: Record<string, { bg: string; fg: string }> = {
  multiple_choice: { bg: "#e6ecef", fg: "#38525e" },
  true_false: { bg: "#f2e8da", fg: "#7a5326" },
  essay: { bg: "#ece9e3", fg: "#544e45" },
};

const TINGKAT_LABEL: Record<string, string> = {
  mudah: "Mudah",
  sedang: "Sedang",
  sulit: "Sulit",
};

const opsi = (rec: Record<string, string>, semua?: string) => [
  ...(semua ? [{ value: "", label: semua }] : []),
  ...Object.entries(rec).map(([value, label]) => ({ value, label })),
];

export default function BankSoal() {
  const { user } = useAuth();
  const canWrite = user?.role === "academic_admin" || user?.role === "super_admin";

  const [q, setQ] = useState("");
  const [tipe, setTipe] = useState("");
  const [tingkat, setTingkat] = useState("");
  const [topik, setTopik] = useState("");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"daftar" | "impor">("daftar");

  const [draf, setDraf] = useState<Partial<Soal> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("perPage", "20");
    if (q.trim()) p.set("q", q.trim());
    if (tipe) p.set("type", tipe);
    if (tingkat) p.set("difficulty", tingkat);
    if (topik) p.set("topic", topik);
    return p.toString();
  }, [page, q, tipe, tingkat, topik]);

  const daftar = usePagedResource<Soal[]>(`/admin/bank-soal?${query}`);
  const topics = useResource<string[]>("/admin/bank-soal/topics");
  const meta = daftar.meta;

  async function simpan() {
    if (!draf) return;
    setBusy(true);
    const body: Record<string, unknown> = {
      type: draf.type ?? "multiple_choice",
      prompt: draf.prompt,
      explanation: draf.explanation || null,
      points: draf.points ?? 1,
      topic: draf.topic || null,
      tags: draf.tags || null,
      difficulty: draf.difficulty ?? "sedang",
    };
    if (draf.type === "multiple_choice") {
      body.options = (draf.options ?? []).filter((o) => o.trim());
      body.answerKey = draf.answerKey ?? "0";
    } else if (draf.type === "true_false") {
      body.answerKey = draf.answerKey ?? "true";
    } else {
      body.answerKey = null;
    }

    const m = await mutate(() =>
      draf.id ? api.patch(`/admin/bank-soal/${draf.id}`, body) : api.post("/admin/bank-soal", body),
    );
    setBusy(false);
    if (m) return setErr(m);
    setErr(null);
    setDraf(null);
    daftar.reload();
    topics.reload();
  }

  async function hapus(id: string) {
    const m = await mutate(() => api.del(`/admin/bank-soal/${id}`));
    if (m) return setErr(m);
    setErr(null);
    daftar.reload();
  }

  const baru = (): Partial<Soal> => ({
    type: "multiple_choice",
    prompt: "",
    options: ["", ""],
    answerKey: "0",
    points: 1,
    difficulty: "sedang",
  });

  return (
    <>
      <PageHeader
        eyebrow="Penilaian"
        title="Bank Soal"
        lead="Kumpulan soal yang dapat dipakai ulang di program mana pun. Saat dipakai pada kuis, isinya disalin — menyunting soal di sini tidak mengubah ujian yang sudah lewat."
        actions={
          canWrite && tab === "daftar" && !draf ? (
            <button type="button" className="btn-solid-sm" onClick={() => setDraf(baru())}>
              + Soal baru
            </button>
          ) : undefined
        }
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(
          [
            ["daftar", "Daftar Soal"],
            ["impor", "Impor"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={tab === k ? "btn-solid-sm" : "btn-sm"}
            onClick={() => {
              setTab(k);
              setDraf(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {err && (
        <div role="alert" style={galat}>
          {err}
        </div>
      )}

      {tab === "impor" ? (
        <PanelImpor
          canWrite={canWrite}
          onSelesai={() => {
            daftar.reload();
            topics.reload();
            setTab("daftar");
          }}
        />
      ) : (
        <>
          {draf && (
            <FormPanel
              title={draf.id ? "Ubah soal" : "Soal baru"}
              error={err}
              busy={busy}
              onSubmit={simpan}
              onCancel={() => {
                setDraf(null);
                setErr(null);
              }}
            >
              <Field label="Tipe soal">
                <Select
                  value={draf.type ?? "multiple_choice"}
                  onChange={(v) =>
                    setDraf({
                      ...draf,
                      type: v as Soal["type"],
                      /* Bentuknya berbeda per tipe; nilai lama justru menyesatkan. */
                      options: v === "multiple_choice" ? (draf.options ?? ["", ""]) : undefined,
                      answerKey: v === "multiple_choice" ? "0" : v === "true_false" ? "true" : null,
                    })
                  }
                  options={opsi(TIPE_LABEL)}
                />
              </Field>
              <Field label="Tingkat">
                <Select
                  value={draf.difficulty ?? "sedang"}
                  onChange={(v) => setDraf({ ...draf, difficulty: v as Soal["difficulty"] })}
                  options={opsi(TINGKAT_LABEL)}
                />
              </Field>

              <Field label="Pertanyaan" span>
                <Area value={draf.prompt ?? ""} onChange={(v) => setDraf({ ...draf, prompt: v })} />
              </Field>

              {draf.type === "multiple_choice" && (
                <Field label="Pilihan jawaban" span hint="Tandai satu sebagai kunci.">
                  <div style={{ display: "grid", gap: 8 }}>
                    {(draf.options ?? []).map((o, i) => (
                      <div key={i} style={{ display: "flex", gap: 9, alignItems: "center" }}>
                        <input
                          type="radio"
                          name="kunci"
                          checked={String(draf.answerKey) === String(i)}
                          onChange={() => setDraf({ ...draf, answerKey: String(i) })}
                          aria-label={`Kunci pilihan ${i + 1}`}
                        />
                        <input
                          value={o}
                          onChange={(e) => {
                            const next = [...(draf.options ?? [])];
                            next[i] = e.target.value;
                            setDraf({ ...draf, options: next });
                          }}
                          placeholder={`Pilihan ${i + 1}`}
                          style={{ ...kotak, flex: 1 }}
                        />
                        {(draf.options ?? []).length > 2 && (
                          <button
                            type="button"
                            className="btn-sm"
                            onClick={() => {
                              const next = (draf.options ?? []).filter((_, j) => j !== i);
                              const k = Number(draf.answerKey);
                              setDraf({
                                ...draf,
                                options: next,
                                answerKey: String(k >= next.length ? next.length - 1 : k),
                              });
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {(draf.options ?? []).length < 5 && (
                      <button
                        type="button"
                        className="btn-sm"
                        style={{ justifySelf: "start" }}
                        onClick={() => setDraf({ ...draf, options: [...(draf.options ?? []), ""] })}
                      >
                        + Tambah pilihan
                      </button>
                    )}
                  </div>
                </Field>
              )}

              {draf.type === "true_false" && (
                <Field label="Kunci jawaban">
                  <Select
                    value={draf.answerKey ?? "true"}
                    onChange={(v) => setDraf({ ...draf, answerKey: v })}
                    options={[
                      { value: "true", label: "BENAR" },
                      { value: "false", label: "SALAH" },
                    ]}
                  />
                </Field>
              )}

              {draf.type === "essay" && (
                <Field label="Kunci jawaban" hint="Esai dinilai manual, jadi tidak punya kunci.">
                  <div style={{ ...kotak, color: "var(--color-faint)" }}>Dinilai manual</div>
                </Field>
              )}

              <Field label="Poin">
                <Text
                  value={String(draf.points ?? 1)}
                  onChange={(v) => setDraf({ ...draf, points: Number(v.replace(/\D/g, "")) || 1 })}
                />
              </Field>

              <Field label="Pembahasan" span hint="Ditampilkan ke peserta bila umpan balik diaktifkan.">
                <Area
                  value={draf.explanation ?? ""}
                  onChange={(v) => setDraf({ ...draf, explanation: v })}
                />
              </Field>

              <Field label="Topik" hint="Pengelompokan bebas, mis. Bahasa Arab — Hijaiyah.">
                <Text value={draf.topic ?? ""} onChange={(v) => setDraf({ ...draf, topic: v })} />
              </Field>
              <Field label="Tag" hint="Dipisah koma.">
                <Text value={draf.tags ?? ""} onChange={(v) => setDraf({ ...draf, tags: v })} />
              </Field>
            </FormPanel>
          )}

          {/* --- penyaring --- */}
          <Card padding={18} style={{ marginBottom: 18 }}>
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
                  Cari
                </label>
                <input
                  type="search"
                  value={q}
                  placeholder="Cari pertanyaan, topik, atau tag…"
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  style={kotak}
                />
              </div>
              <div>
                <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
                  Tipe
                </label>
                <Combobox
                  value={tipe}
                  onChange={(v) => {
                    setTipe(v);
                    setPage(1);
                  }}
                  options={opsi(TIPE_LABEL, "Semua tipe")}
                  searchable={false}
                  ariaLabel="Tipe soal"
                />
              </div>
              <div>
                <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
                  Tingkat
                </label>
                <Combobox
                  value={tingkat}
                  onChange={(v) => {
                    setTingkat(v);
                    setPage(1);
                  }}
                  options={opsi(TINGKAT_LABEL, "Semua tingkat")}
                  searchable={false}
                  ariaLabel="Tingkat"
                />
              </div>
              <div>
                <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
                  Topik
                </label>
                <Combobox
                  value={topik}
                  onChange={(v) => {
                    setTopik(v);
                    setPage(1);
                  }}
                  options={[
                    { value: "", label: "Semua topik" },
                    ...(topics.data ?? []).map((t) => ({ value: t, label: t })),
                  ]}
                  ariaLabel="Topik"
                />
              </div>
            </div>
          </Card>

          <Card padding={20}>
            {daftar.loading && <div style={{ color: "var(--color-faint)" }}>Memuat soal…</div>}
            {daftar.error && <div role="alert">{daftar.error}</div>}
            {daftar.data && daftar.data.length === 0 && (
              <EmptyState
                title="Belum ada soal"
                hint="Tambahkan satu per satu, atau impor sekaligus lewat tab Impor."
              />
            )}

            {daftar.data && daftar.data.length > 0 && (
              <div style={{ display: "grid", gap: 12 }}>
                {daftar.data.map((s) => (
                  <KartuSoal
                    key={s.id}
                    soal={s}
                    canWrite={canWrite}
                    onUbah={() => setDraf({ ...s, options: s.options ?? ["", ""] })}
                    onHapus={() => hapus(s.id)}
                  />
                ))}
              </div>
            )}

            {daftar.data && meta.total > 0 && (
              <div style={paginasi}>
                <div style={{ fontSize: 14.5, color: "var(--color-faint)" }}>
                  Menampilkan {(page - 1) * meta.perPage + 1}–
                  {Math.min(page * meta.perPage, meta.total)} dari {meta.total} soal
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn-sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    style={{ opacity: page <= 1 ? 0.45 : 1 }}
                  >
                    ← Sebelumnya
                  </button>
                  <span style={{ fontFamily: mono, fontSize: 14 }}>
                    {page} / {meta.totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn-sm"
                    disabled={page >= meta.totalPages}
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    style={{ opacity: page >= meta.totalPages ? 0.45 : 1 }}
                  >
                    Berikutnya →
                  </button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}

/* --- kartu satu soal ------------------------------------------------ */

function KartuSoal({
  soal,
  canWrite,
  onUbah,
  onHapus,
}: {
  soal: Soal;
  canWrite: boolean;
  onUbah: () => void;
  onHapus: () => void;
}) {
  const [buka, setBuka] = useState(false);
  const tone = TIPE_TONE[soal.type]!;

  return (
    <div style={{ border: "1px solid var(--color-line)", borderRadius: 10, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <Badge bg={tone.bg} fg={tone.fg}>
              {TIPE_LABEL[soal.type]}
            </Badge>
            <span style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>
              {soal.points} poin · {TINGKAT_LABEL[soal.difficulty]}
              {soal.topic ? ` · ${soal.topic}` : ""}
            </span>
          </div>
          <div style={{ fontSize: 16.5, lineHeight: 1.6 }}>{soal.prompt}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
          <button type="button" className="btn-sm" onClick={() => setBuka((v) => !v)}>
            {buka ? "Tutup" : "Lihat kunci"}
          </button>
          {canWrite && (
            <>
              <button type="button" className="btn-sm" onClick={onUbah}>
                Ubah
              </button>
              <HapusDuaLangkah onConfirm={onHapus} />
            </>
          )}
        </div>
      </div>

      {buka && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--color-line-soft, var(--color-line))" }}>
          {soal.type === "multiple_choice" && soal.options && (
            <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
              {soal.options.map((o, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: 15.5,
                    fontWeight: String(soal.answerKey) === String(i) ? 700 : 400,
                    color:
                      String(soal.answerKey) === String(i) ? "var(--color-forest)" : "var(--color-body)",
                  }}
                >
                  {o}
                  {String(soal.answerKey) === String(i) && " ✓"}
                </li>
              ))}
            </ol>
          )}
          {soal.type === "true_false" && (
            <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--color-forest)" }}>
              Kunci: {soal.answerKey === "true" ? "BENAR" : "SALAH"}
            </div>
          )}
          {soal.type === "essay" && (
            <div style={{ fontSize: 15.5, color: "var(--color-faint)" }}>Dinilai manual.</div>
          )}
          {soal.explanation && (
            <div style={{ fontSize: 15, lineHeight: 1.65, color: "var(--color-muted)", marginTop: 10 }}>
              {soal.explanation}
            </div>
          )}
          {soal.tags && (
            <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)", marginTop: 10 }}>
              {soal.tags}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* --- impor ----------------------------------------------------------- */

function PanelImpor({ canWrite, onSelesai }: { canWrite: boolean; onSelesai: () => void }) {
  const [teks, setTeks] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hasil, setHasil] = useState<{ diimpor: number } | null>(null);

  const baris: HasilBaris[] = useMemo(() => (teks.trim() ? bacaBaris(teks) : []), [teks]);
  const sah = baris.filter((b) => b.ok);
  const rusak = baris.filter((b) => !b.ok);

  function unduhTemplate() {
    /* BOM agar Excel membaca UTF-8 dengan benar. */
    const blob = new Blob(["﻿" + TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "template-bank-soal.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function impor() {
    if (!sah.length) return;
    setBusy(true);
    const pesan = await mutate(() =>
      api.post<{ diimpor: number }>("/admin/bank-soal/import", {
        rows: sah.map((b) => (b as { data: unknown }).data),
      }),
    );
    setBusy(false);
    if (pesan) return setErr(pesan);
    setErr(null);
    setHasil({ diimpor: sah.length });
    setTeks("");
    onSelesai();
  }

  return (
    <>
      <Card padding={22} style={{ marginBottom: 18 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          Langkah impor
        </div>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 15.5, lineHeight: 1.8, color: "var(--color-body)" }}>
          <li>Unduh template, isi di Excel atau Google Sheets, lalu simpan sebagai CSV.</li>
          <li>Unggah berkasnya, atau tempel isinya langsung ke kotak di bawah.</li>
          <li>Periksa pratinjau — baris bermasalah ditandai dan tidak akan ikut diimpor.</li>
        </ol>

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button type="button" className="btn-solid-sm" onClick={unduhTemplate}>
            Unduh template CSV
          </button>
          <label className="btn-sm" style={{ cursor: "pointer" }}>
            Unggah berkas CSV
            <input
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setTeks(await f.text());
                e.target.value = "";
              }}
            />
          </label>
        </div>

        <div style={{ fontFamily: mono, fontSize: 12, color: "var(--color-faint)", marginTop: 14, lineHeight: 1.7, wordBreak: "break-word" }}>
          {KOLOM.join(" · ")}
        </div>
        <div style={{ fontSize: 13.5, color: "var(--color-faint)", marginTop: 8, lineHeight: 1.6 }}>
          <strong>tipe</strong>: pg, bs, atau esai · <strong>kunci</strong> pilihan ganda ditulis
          sebagai nomor pilihan (1–5), benar-salah sebagai BENAR/SALAH, esai dikosongkan ·{" "}
          <strong>tingkat</strong>: mudah, sedang, sulit
        </div>
      </Card>

      <Card padding={22} style={{ marginBottom: 18 }}>
        <label className="eyebrow" style={{ display: "block", marginBottom: 8 }}>
          Isi CSV
        </label>
        <textarea
          value={teks}
          onChange={(e) => {
            setTeks(e.target.value);
            setHasil(null);
          }}
          placeholder="Tempel isi CSV di sini…"
          style={{ ...kotak, minHeight: 150, resize: "vertical", fontFamily: mono, fontSize: 13.5 }}
        />
      </Card>

      {err && (
        <div role="alert" style={galat}>
          {err}
        </div>
      )}

      {hasil && (
        <div
          style={{
            marginBottom: 18,
            padding: "12px 14px",
            background: "#e4ede4",
            border: "1px solid #cfe0d2",
            borderRadius: 8,
            fontSize: 15,
            color: "#2f5638",
          }}
        >
          {hasil.diimpor} soal berhasil diimpor.
        </div>
      )}

      {baris.length > 0 && (
        <Card padding={20}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div style={{ fontFamily: serif, fontSize: 20 }}>Pratinjau</div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Badge bg="#e4ede4" fg="#2f5638">
                {sah.length} siap
              </Badge>
              {rusak.length > 0 && (
                <Badge bg="#f7e6e0" fg="#8d4632">
                  {rusak.length} bermasalah
                </Badge>
              )}
              {canWrite && (
                <button
                  type="button"
                  className="btn-solid-sm"
                  disabled={busy || sah.length === 0}
                  onClick={impor}
                  style={{ opacity: busy || sah.length === 0 ? 0.55 : 1 }}
                >
                  {busy ? "Mengimpor…" : `Impor ${sah.length} soal`}
                </button>
              )}
            </div>
          </div>

          {rusak.length > 0 && (
            <div style={{ fontSize: 14.5, color: "#8d4632", marginBottom: 14, lineHeight: 1.6 }}>
              Baris bermasalah tidak akan diimpor. Perbaiki di berkas Anda lalu tempel ulang bila
              ingin menyertakannya.
            </div>
          )}

          <div style={{ display: "grid", gap: 10 }}>
            {baris.map((b) => (
              <div
                key={b.nomor}
                style={{
                  border: `1px solid ${b.ok ? "var(--color-line)" : "#e8cdc3"}`,
                  background: b.ok ? "transparent" : "#fdf6f3",
                  borderRadius: 9,
                  padding: "12px 14px",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>
                    BARIS {b.nomor}
                  </span>
                  {b.ok ? (
                    <Badge bg={TIPE_TONE[b.data.type]!.bg} fg={TIPE_TONE[b.data.type]!.fg}>
                      {TIPE_LABEL[b.data.type]}
                    </Badge>
                  ) : (
                    <Badge bg="#f7e6e0" fg="#8d4632">
                      Bermasalah
                    </Badge>
                  )}
                </div>

                {b.ok ? (
                  <>
                    <div style={{ fontSize: 15.5, marginTop: 8, lineHeight: 1.55 }}>{b.data.prompt}</div>
                    {b.data.type === "multiple_choice" && b.data.options && (
                      <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 6 }}>
                        {b.data.options.map((o, i) => (
                          <span key={i} style={{ marginRight: 12 }}>
                            {String(b.data.answerKey) === String(i) ? "✓ " : ""}
                            {o}
                          </span>
                        ))}
                      </div>
                    )}
                    {b.data.type === "true_false" && (
                      <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 6 }}>
                        Kunci: {b.data.answerKey === "true" ? "BENAR" : "SALAH"}
                      </div>
                    )}
                    <div style={{ fontFamily: mono, fontSize: 12, color: "var(--color-faint)", marginTop: 6 }}>
                      {b.data.points} poin · {TINGKAT_LABEL[b.data.difficulty]}
                      {b.data.topic ? ` · ${b.data.topic}` : ""}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 8 }}>
                      {(b.mentah[1] ?? "").slice(0, 90) || <em>(pertanyaan kosong)</em>}
                    </div>
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#8d4632", fontSize: 14.5, lineHeight: 1.6 }}>
                      {b.masalah.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

/* --- potongan bersama ------------------------------------------------ */

const kotak: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  border: "1px solid var(--color-line)",
  borderRadius: 9,
  background: "var(--color-surface)",
  fontSize: 15.5,
  fontFamily: "inherit",
  color: "var(--color-ink)",
};

const galat: React.CSSProperties = {
  marginBottom: 16,
  padding: "12px 14px",
  background: "#f7e6e0",
  border: "1px solid #e8cdc3",
  borderRadius: 8,
  fontSize: 15,
  color: "#8d4632",
};

const paginasi: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
  marginTop: 18,
  paddingTop: 16,
  borderTop: "1px solid var(--color-line)",
};

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
