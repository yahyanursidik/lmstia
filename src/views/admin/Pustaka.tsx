import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { mutate, useResource } from "../../lib/useApi";
import { Badge, Card, EmptyState, PageHeader, mono } from "../../components/ui";
import { Area, Check, DeleteButton, Field, FormPanel, Select, Text } from "../../components/form";

/**
 * Pustaka umum — materi yang diterima seluruh program.
 *
 * Dibuat sekali, terbaca semua. Adab menuntut ilmu, panduan teknis, dan
 * sejenisnya tidak perlu disalin ke tiap pertemuan di tiap caturwulan, dan
 * menyalinnya justru membuat perbaikan satu berkas harus diulang berkali-kali.
 */

type Materi = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  url: string | null;
  content: string | null;
  category: string | null;
  durationMinutes: number;
  sequence: number;
  isRequired: boolean;
  publishStatus: "draft" | "review" | "published";
};

const TIPE: Record<string, string> = {
  video: "Video",
  audio: "Audio",
  pdf: "PDF",
  article: "Artikel",
  link: "Tautan",
  exercise: "Latihan",
};

const TERBIT_WARNA: Record<string, { bg: string; fg: string }> = {
  draft: { bg: "#efe9df", fg: "#6d665c" },
  review: { bg: "#f7eddc", fg: "#8a6520" },
  published: { bg: "#e4ede4", fg: "#2f5638" },
};

const TERBIT_LABEL: Record<string, string> = {
  draft: "Draf",
  review: "Ditinjau",
  published: "Terbit",
};

export default function Pustaka() {
  const daftar = useResource<Materi[]>("/admin/materials?scope=umum");
  const [draf, setDraf] = useState<Partial<Materi> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Dikelompokkan per kategori supaya pustaka tetap terbaca saat menumpuk. */
  const kelompok = useMemo(() => {
    const peta = new Map<string, Materi[]>();
    for (const m of daftar.data ?? []) {
      const k = m.category?.trim() || "Tanpa kategori";
      if (!peta.has(k)) peta.set(k, []);
      peta.get(k)!.push(m);
    }
    return [...peta.entries()].sort(([a], [b]) => a.localeCompare(b, "id"));
  }, [daftar.data]);

  async function simpan() {
    if (!draf) return;
    setBusy(true);
    const body = {
      /* `scope: "umum"` dan tanpa `meetingId` — keduanya harus sebaris, dan
         server menolak bila tidak. */
      scope: "umum" as const,
      meetingId: null,
      title: draf.title ?? "",
      description: draf.description?.trim() || null,
      type: draf.type ?? "article",
      url: draf.url?.trim() || null,
      content: draf.content?.trim() || null,
      category: draf.category?.trim() || null,
      durationMinutes: draf.durationMinutes ?? 0,
      sequence: draf.sequence ?? 1,
      isRequired: draf.isRequired ?? false,
      publishStatus: draf.publishStatus ?? "draft",
    };
    const m = await mutate(() =>
      draf.id ? api.patch(`/admin/materials/${draf.id}`, body) : api.post("/admin/materials", body),
    );
    setBusy(false);
    if (m) return setErr(m);
    setErr(null);
    setDraf(null);
    daftar.reload();
  }

  async function hapus(id: string) {
    const m = await mutate(() => api.del(`/admin/materials/${id}`));
    if (m) return setErr(m);
    setErr(null);
    daftar.reload();
  }

  const artikel = (draf?.type ?? "article") === "article";

  return (
    <>
      <PageHeader
        eyebrow="Akademik"
        title="Pustaka Umum"
        lead="Materi yang diterima seluruh program tanpa kecuali. Dibuat sekali di sini, langsung terbaca oleh setiap peserta."
        actions={
          <button
            type="button"
            className="btn-solid-sm"
            onClick={() => {
              setDraf({ type: "article", publishStatus: "draft", sequence: 1, isRequired: false });
              setErr(null);
            }}
          >
            Tambah materi
          </button>
        }
      />

      {err && !draf && (
        <div role="alert" className="alert-error" style={{ marginBottom: 14 }}>
          {err}
        </div>
      )}

      {draf && (
        <FormPanel
          title={draf.id ? `Ubah — ${draf.title}` : "Materi umum baru"}
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

          <Field label="Kategori" hint="Mis. Adab, Panduan Teknis, Murojaah.">
            <Text
              value={draf.category ?? ""}
              onChange={(v) => setDraf({ ...draf, category: v })}
              placeholder="Adab"
            />
          </Field>
          <Field label="Jenis">
            <Select
              value={draf.type ?? "article"}
              onChange={(v) => setDraf({ ...draf, type: v })}
              options={Object.entries(TIPE).map(([value, label]) => ({ value, label }))}
            />
          </Field>

          {artikel ? (
            <Field label="Isi artikel" span hint="Materi berjenis artikel menyimpan isinya di sini.">
              <Area
                value={draf.content ?? ""}
                onChange={(v) => setDraf({ ...draf, content: v })}
                rows={8}
              />
            </Field>
          ) : (
            <Field label="Tautan sumber" span hint="Materi selain artikel wajib punya tautan.">
              <Text value={draf.url ?? ""} onChange={(v) => setDraf({ ...draf, url: v })} />
            </Field>
          )}

          <Field label="Keterangan singkat" span>
            <Area
              value={draf.description ?? ""}
              onChange={(v) => setDraf({ ...draf, description: v })}
              rows={2}
            />
          </Field>

          <Field label="Urutan">
            <Text
              type="number"
              value={String(draf.sequence ?? 1)}
              onChange={(v) => setDraf({ ...draf, sequence: Number(v) || 1 })}
            />
          </Field>
          <Field label="Status terbit" hint="Peserta hanya melihat yang sudah terbit.">
            <Select
              value={draf.publishStatus ?? "draft"}
              onChange={(v) => setDraf({ ...draf, publishStatus: v as Materi["publishStatus"] })}
              options={Object.entries(TERBIT_LABEL).map(([value, label]) => ({ value, label }))}
            />
          </Field>

          <Field label="Wajib dibaca" span>
            <Check
              checked={draf.isRequired ?? false}
              onChange={(v) => setDraf({ ...draf, isRequired: v })}
              label="Tandai sebagai materi wajib"
            />
          </Field>
        </FormPanel>
      )}

      {daftar.loading && <div style={{ color: "var(--color-faint)" }}>Memuat pustaka…</div>}
      {daftar.error && <div role="alert">{daftar.error}</div>}

      {daftar.data && daftar.data.length === 0 && (
        <EmptyState
          title="Pustaka umum masih kosong"
          hint="Materi di sini muncul pada portal setiap peserta, apa pun programnya."
        />
      )}

      <div style={{ display: "grid", gap: 20 }}>
        {kelompok.map(([kategori, isi]) => (
          <Card key={kategori} padding={20}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>
              {kategori} · {isi.length}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {isi.map((m) => (
                <div
                  key={m.id}
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
                    <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 9 }}>
                      {m.title}
                      <Badge
                        bg={TERBIT_WARNA[m.publishStatus]!.bg}
                        fg={TERBIT_WARNA[m.publishStatus]!.fg}
                      >
                        {TERBIT_LABEL[m.publishStatus]}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 13.5, color: "var(--color-muted)" }}>
                      <span style={{ fontFamily: mono, fontSize: 12.5 }}>
                        {TIPE[m.type] ?? m.type}
                      </span>
                      {m.description ? ` · ${m.description}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flex: "none" }}>
                    <button
                      type="button"
                      className="btn-sm"
                      onClick={() => {
                        setDraf({ ...m });
                        setErr(null);
                      }}
                    >
                      Ubah
                    </button>
                    <DeleteButton onConfirm={() => hapus(m.id)} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
