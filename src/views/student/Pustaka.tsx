import { useMemo, useState } from "react";
import { useResource } from "../../lib/useApi";
import { Card, EmptyState, PageHeader, mono } from "../../components/ui";

/**
 * Pustaka umum bagi peserta.
 *
 * Materi yang diterima seluruh program — tidak terikat caturwulan maupun
 * pertemuan, jadi tetap terbaca meski peserta sedang tidak mengikuti kelas
 * apa pun. Hanya yang sudah terbit yang sampai ke sini; penyaringannya di
 * server.
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
  isRequired: boolean;
};

const TIPE: Record<string, string> = {
  video: "Video",
  audio: "Audio",
  pdf: "PDF",
  article: "Artikel",
  link: "Tautan",
  exercise: "Latihan",
};

export default function PustakaPeserta() {
  const daftar = useResource<Materi[]>("/pustaka");
  const [buka, setBuka] = useState<string | null>(null);

  const kelompok = useMemo(() => {
    const peta = new Map<string, Materi[]>();
    for (const m of daftar.data ?? []) {
      const k = m.category?.trim() || "Lainnya";
      if (!peta.has(k)) peta.set(k, []);
      peta.get(k)!.push(m);
    }
    return [...peta.entries()].sort(([a], [b]) => a.localeCompare(b, "id"));
  }, [daftar.data]);

  return (
    <div className="shell" style={{ paddingBlock: "34px 70px" }}>
      <PageHeader
        eyebrow="Pustaka"
        title="Bacaan Umum"
        lead="Materi yang berlaku untuk seluruh program — adab menuntut ilmu, panduan teknis, dan bacaan pendukung lainnya."
      />

      {daftar.loading && <div style={{ color: "var(--color-faint)" }}>Memuat pustaka…</div>}
      {daftar.error && <div role="alert">{daftar.error}</div>}

      {daftar.data && daftar.data.length === 0 && (
        <EmptyState
          title="Pustaka umum masih kosong"
          hint="Materi yang berlaku lintas program akan muncul di sini."
        />
      )}

      <div style={{ display: "grid", gap: 22 }}>
        {kelompok.map(([kategori, isi]) => (
          <section key={kategori}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              {kategori}
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {isi.map((m) => {
                const terbuka = buka === m.id;
                return (
                  <Card key={m.id} padding={18}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 14,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 17, fontWeight: 700 }}>
                          {m.title}
                          {m.isRequired && (
                            <span
                              style={{
                                fontFamily: mono,
                                fontSize: 11,
                                letterSpacing: ".1em",
                                color: "var(--color-ochre)",
                                marginLeft: 10,
                              }}
                            >
                              WAJIB
                            </span>
                          )}
                        </div>
                        <div
                          style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 4, lineHeight: 1.6 }}
                        >
                          <span style={{ fontFamily: mono, fontSize: 12.5 }}>
                            {TIPE[m.type] ?? m.type}
                          </span>
                          {m.durationMinutes > 0 && (
                            <span style={{ fontFamily: mono, fontSize: 12.5 }}>
                              {" · "}
                              {m.durationMinutes} menit
                            </span>
                          )}
                          {m.description ? ` · ${m.description}` : ""}
                        </div>
                      </div>

                      <div style={{ flex: "none" }}>
                        {m.type === "article" ? (
                          <button
                            type="button"
                            className="btn-sm"
                            aria-expanded={terbuka}
                            onClick={() => setBuka(terbuka ? null : m.id)}
                          >
                            {terbuka ? "Tutup" : "Baca"}
                          </button>
                        ) : (
                          m.url && (
                            <a
                              href={m.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-sm"
                            >
                              Buka →
                            </a>
                          )
                        )}
                      </div>
                    </div>

                    {terbuka && m.content && (
                      <div
                        style={{
                          marginTop: 16,
                          paddingTop: 16,
                          borderTop: "1px solid var(--color-line-soft)",
                          fontSize: 16,
                          lineHeight: 1.75,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {m.content}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
