import { useState } from "react";
import { Link, useParams } from "react-router";
import { useResource } from "../../lib/useApi";
import { Card, Eyebrow, EmptyState, mono, serif } from "../../components/ui";

function PageShell({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="shell" style={{ paddingBlock: "56px 80px" }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 style={{ fontSize: 44, lineHeight: 1.1, marginTop: 16, maxWidth: 780 }}>{title}</h1>
      {lead && (
        <p
          style={{
            margin: "22px 0 0",
            fontSize: 17,
            lineHeight: 1.65,
            color: "var(--color-body)",
            maxWidth: 640,
          }}
        >
          {lead}
        </p>
      )}
      <div style={{ marginTop: 44 }}>{children}</div>
    </div>
  );
}

/* --- /program -------------------------------------------------- */

export function Program() {
  const stages = [
    { code: "I'dad", name: "Persiapan", desc: "Membangun alat dan fondasi awal: huruf, kosakata, tauhid dasar, dan adab menuntut ilmu." },
    { code: "Ta'sis", name: "Fondasi", desc: "Memperkuat dasar Bahasa Arab dan menambah Fiqh serta Hadits sebagai fondasi amal." },
    { code: "Tanmiyah", name: "Pengembangan", desc: "Mulai membaca teks berbahasa Arab dan mengikuti kajian kitab sederhana." },
    { code: "Taqwiyah", name: "Penguatan", desc: "Pendalaman dan pembiasaan — ilmu yang sudah dikuasai dijaga melalui murojaah terstruktur." },
    { code: "Takhassus", name: "Peminatan", desc: "Fokus pada bidang ilmu pilihan sesuai kesiapan dan minat peserta." },
  ];
  return (
    <PageShell
      eyebrow="Program"
      title="Program panjang bagi tim kurikulum, program pendek bagi peserta."
      lead="Roadmap akademik TIA memang panjang. Tetapi Anda tidak mendaftar untuk seluruhnya. Anda mendaftar satu caturwulan, menyelesaikannya, lalu memutuskan apakah ingin melanjutkan."
    >
      <div style={{ border: "1px solid var(--color-line)", borderRadius: 12, overflow: "hidden", background: "var(--color-surface)" }}>
        {stages.map((s, i) => (
          <div
            key={s.code}
            style={{
              display: "grid",
              gridTemplateColumns: "150px 1fr",
              gap: 24,
              padding: "26px 28px",
              borderTop: i === 0 ? undefined : "1px solid var(--color-line-soft)",
              background: i === 0 ? "var(--color-mist)" : undefined,
            }}
            className="split"
          >
            <div>
              <div style={{ fontFamily: serif, fontSize: 22, color: "var(--color-forest)" }}>
                {s.code}
              </div>
              <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: ".1em", color: "var(--color-faint)", marginTop: 4 }}>
                {s.name.toUpperCase()}
              </div>
              {i === 0 && (
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-forest)", marginTop: 8 }}>
                  ● SEDANG DIJALANI
                </div>
              )}
            </div>
            <div style={{ fontSize: 16.5, lineHeight: 1.65, color: "var(--color-body)" }}>{s.desc}</div>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 22, fontSize: 15.5, color: "var(--color-muted)", lineHeight: 1.6, maxWidth: 640 }}>
        Setiap marhalah terdiri atas beberapa caturwulan. Pendaftaran selalu dilakukan per caturwulan — tidak ada
        pendaftaran otomatis ke tahap berikutnya.
      </p>
    </PageShell>
  );
}

/* --- /caturwulan ----------------------------------------------- */

type TahapanPublik = {
  id: string;
  slug: string;
  code: string;
  name: string;
  title: string | null;
  subtitle: string | null;
  durationWeeks: number;
  status: string;
};

export function CaturwulanList() {
  const t = useResource<TahapanPublik[]>("/tahapan");
  const terms = t.data ?? [];

  if (t.loading) {
    return (
      <PageShell eyebrow="Caturwulan" title="Setiap caturwulan adalah unit belajar yang utuh.">
        <div style={{ color: "var(--color-faint)" }}>Memuat caturwulan…</div>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Caturwulan"
      title="Setiap caturwulan adalah unit belajar yang utuh."
      lead="Satu caturwulan berlangsung 12 pekan dan memuat satu mata pelajaran intensif, satu fondasi, dan satu pendamping mandiri."
    >
      {terms.length === 0 && (
        <EmptyState
          title="Belum ada caturwulan yang dibuka"
          hint="Informasi caturwulan berikutnya akan muncul di sini."
        />
      )}
      <div style={{ display: "grid", gap: 16 }}>
        {terms.map((t) => (
          <Link
            key={t.id}
            to={`/caturwulan/${t.slug}`}
            className="card"
            style={{ padding: 26, display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center" }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: ".11em", color: "var(--color-soft)" }}>
                  MARHALAH I&apos;DAD
                </span>
                <span
                  style={{
                    padding: "3px 9px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    background: t.status === "running" ? "var(--color-mist)" : "var(--color-sand)",
                    color: t.status === "running" ? "var(--color-forest)" : "#a07c46",
                  }}
                >
                  {t.status === "running" ? "SEDANG BERJALAN" : "PENDAFTARAN DIBUKA"}
                </span>
              </div>
              <div style={{ fontFamily: serif, fontSize: 25 }}>
                {t.name} — {t.title}
              </div>
              <div style={{ fontSize: 16, color: "var(--color-muted)", marginTop: 8 }}>{t.subtitle}</div>
              <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)", marginTop: 12 }}>
                {t.durationWeeks} PEKAN · 4–6 JAM / PEKAN
              </div>
            </div>
            <div style={{ color: "var(--color-forest)", fontWeight: 700, fontSize: 16 }}>Lihat →</div>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}

/* --- /caturwulan/:slug ----------------------------------------- */

type MapelPublik = {
  id: string;
  name: string;
  role: string;
  description: string | null;
  deliveryModel: string | null;
  weeklyLoad: string | null;
  meetings: { id: string; number: number; title: string; type: string }[];
};

type TahapanDetail = TahapanPublik & { subjects: MapelPublik[] };

const PERAN_MAPEL_PUBLIK: Record<string, string> = {
  INTENSIVE: "INTENSIF",
  FOUNDATION: "FONDASI",
  COMPANION: "PENDAMPING",
};

const TIPE_PERTEMUAN_PUBLIK: Record<string, string> = {
  ORIENTATION: "Orientasi",
  REGULAR: "Pembelajaran",
  REVIEW: "Murojaah",
  ASSESSMENT: "Evaluasi",
  PRACTICE: "Latihan",
  BREAK: "Jeda",
};

export function CaturwulanDetail() {
  const { slug } = useParams();
  const detail = useResource<TahapanDetail>(slug ? `/tahapan/${slug}` : null);

  if (detail.loading) {
    return (
      <div className="shell" style={{ paddingBlock: "80px", color: "var(--color-faint)" }}>
        Memuat caturwulan…
      </div>
    );
  }

  if (detail.error || !detail.data) {
    return (
      <div className="shell" style={{ paddingBlock: "80px" }}>
        <EmptyState
          title="Caturwulan tidak ditemukan"
          hint="Caturwulan yang Anda cari mungkin belum dipublikasikan."
        />
        <div style={{ marginTop: 20 }}>
          <Link to="/caturwulan" className="btn-sm">
            Kembali ke daftar caturwulan
          </Link>
        </div>
      </div>
    );
  }

  const term = detail.data;

  /*
   * Timeline diambil dari mata pelajaran intensif caturwulan ini, bukan slug
   * yang ditulis keras, agar tetap benar ketika kurikulumnya berganti.
   */
  const inti = term.subjects.find((s) => s.role === "INTENSIVE") ?? term.subjects[0];
  const pertemuan = inti?.meetings ?? [];

  return (
    <PageShell
      eyebrow={`${term.name} · ${term.code}`}
      title={term.title ?? term.name}
      lead={term.subtitle ?? undefined}
    >
      {term.subjects.length === 0 ? (
        <Card tone="sand" padding={22} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, lineHeight: 1.6, color: "var(--color-body)" }}>
            Rincian pertemuan untuk {term.name} akan dibuka menjelang pendaftaran.
          </div>
        </Card>
      ) : (
        <>
          <h2 style={{ fontSize: 26, marginBottom: 18 }}>Mata pelajaran</h2>
          <div style={{ display: "grid", gap: 14, marginBottom: 44 }}>
            {term.subjects.map((c) => (
              <Card key={c.id} padding={24}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{c.name}</div>
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: 12,
                      color: "var(--color-forest)",
                      letterSpacing: ".06em",
                    }}
                  >
                    {PERAN_MAPEL_PUBLIK[c.role] ?? c.role}
                  </div>
                </div>
                {c.description && (
                  <div
                    style={{
                      fontSize: 16,
                      lineHeight: 1.6,
                      color: "var(--color-body)",
                      marginTop: 10,
                    }}
                  >
                    {c.description}
                  </div>
                )}
                {(c.deliveryModel || c.weeklyLoad) && (
                  <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 12 }}>
                    {[c.deliveryModel, c.weeklyLoad].filter(Boolean).join(" · ")}
                  </div>
                )}
              </Card>
            ))}
          </div>

          {pertemuan.length > 0 && (
            <>
              <h2 style={{ fontSize: 26, marginBottom: 18 }}>
                Timeline {pertemuan.length} pertemuan
                <span
                  style={{ fontSize: 15, color: "var(--color-faint)", fontWeight: 400, marginLeft: 10 }}
                >
                  {inti?.name}
                </span>
              </h2>
              <div style={{ display: "grid", gap: 8 }}>
                {pertemuan.map((w) => (
                  <div
                    key={w.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "120px 1fr 130px",
                      gap: 16,
                      alignItems: "center",
                      padding: "13px 18px",
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-line)",
                      borderRadius: 8,
                      fontSize: 16,
                    }}
                    className="split"
                  >
                    <div style={{ fontFamily: mono, fontSize: 13, color: "var(--color-faint)" }}>
                      PERTEMUAN {w.number}
                    </div>
                    <div>{w.title}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-forest)" }}>
                      {TIPE_PERTEMUAN_PUBLIK[w.type] ?? w.type}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <div style={{ marginTop: 44, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link to="/daftar" className="btn btn-primary">
          Daftar {term.name} <span style={{ opacity: 0.6 }}>→</span>
        </Link>
        <Link to="/cara-belajar" className="btn btn-ghost">
          Lihat cara belajar
        </Link>
      </div>
    </PageShell>
  );
}

/* --- /cara-belajar --------------------------------------------- */

export function CaraBelajar() {
  const steps = [
    { n: "01", t: "Belajar", d: "Materi utama disampaikan lewat kelas online dan materi mandiri di LMS." },
    { n: "02", t: "Latihan", d: "Setiap materi diikuti latihan terarah, bukan sekadar menonton." },
    { n: "03", t: "Murojaah", d: "Pengulangan adalah bagian inti kurikulum, bukan aktivitas tambahan." },
    { n: "04", t: "Amal", d: "Ilmu diarahkan untuk diamalkan, bukan hanya dikumpulkan." },
    { n: "05", t: "Refleksi", d: "Peserta mencatat pemahaman, manfaat, dan penerapan setiap pekan." },
  ];
  return (
    <PageShell
      eyebrow="Cara belajar"
      title="Ilmu → Faham → Latihan → Murojaah → Amal"
      lead="Struktur ini berulang setiap pekan. Dengan pola yang sama setiap pekan, Anda tidak perlu menebak apa yang harus dikerjakan."
    >
      <div style={{ display: "grid", gap: 2, background: "var(--color-line)", border: "1px solid var(--color-line)", borderRadius: 12, overflow: "hidden" }}>
        {steps.map((s) => (
          <div key={s.n} style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: 20, padding: "24px 26px", background: "var(--color-surface)" }} className="split">
            <div style={{ fontFamily: mono, fontSize: 15, color: "var(--color-ochre)" }}>{s.n}</div>
            <div>
              <div style={{ fontFamily: serif, fontSize: 21, color: "var(--color-forest)" }}>{s.t}</div>
              <div style={{ fontSize: 16.5, lineHeight: 1.6, color: "var(--color-body)", marginTop: 6 }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 26, margin: "48px 0 18px" }}>Struktur satu unit pekanan</h2>
      <div className="quad" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {["Sebelum Belajar", "Materi Utama", "Latihan", "Worksheet", "Murojaah", "Cek Pemahaman", "Refleksi"].map((p, i) => (
          <div
            key={p}
            style={{
              padding: "16px 18px",
              border: "1px solid var(--color-line)",
              borderRadius: 9,
              background: "var(--color-surface)",
              fontSize: 15.5,
              fontWeight: 600,
            }}
          >
            <div style={{ fontFamily: mono, fontSize: 11.5, color: "var(--color-faint)", marginBottom: 6 }}>
              0{i + 1}
            </div>
            {p}
          </div>
        ))}
      </div>

      <Card tone="mist" padding={24} style={{ marginTop: 24 }}>
        <div style={{ fontSize: 16.5, lineHeight: 1.65, color: "#2f4a3f" }}>
          <strong>Jika tertinggal:</strong> tersedia Jalur Mengejar Ketertinggalan berisi materi esensial — satu video
          inti, satu PDF ringkas, satu latihan wajib, dan satu cek pemahaman. Jalur ini bersifat suportif.
        </div>
      </Card>
    </PageShell>
  );
}

/* --- /pengajar -------------------------------------------------- */

type PengajarPublikRow = {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

/** Inisial dari nama, karena avatar belum tentu ada. */
const inisial = (nama: string) =>
  nama
    .replace(/[^p{L}s]/gu, " ")
    .trim()
    .split(/s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

export function PengajarPublik() {
  const pengajar = useResource<PengajarPublikRow[]>("/pengajar");
  const list = pengajar.data ?? [];
  return (
    <PageShell
      eyebrow="Pengajar"
      title="Pendampingan, bukan sekadar penyampaian materi."
      lead="Setiap mata pelajaran diampu pengajar yang mendampingi latihan, memberi umpan balik, dan memantau perkembangan peserta."
    >
      {pengajar.loading && <div style={{ color: "var(--color-faint)" }}>Memuat pengajar…</div>}
      {!pengajar.loading && list.length === 0 && (
        <EmptyState title="Belum ada pengajar yang ditampilkan" />
      )}
      <div style={{ display: "grid", gap: 16 }}>
        {list.map((p) => (
          <Card key={p.id} padding={26}>
            <div style={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: 20 }} className="split">
              <div
                aria-hidden="true"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--color-mist)",
                  color: "var(--color-forest)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: serif,
                  fontSize: 20,
                }}
              >
                {inisial(p.name)}
              </div>
              <div>
                <div style={{ fontFamily: serif, fontSize: 22 }}>{p.name}</div>
                <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: ".1em", color: "var(--color-faint)", marginTop: 5 }}>
                  {(p.title ?? "Pengajar").toUpperCase()}
                </div>
                <div style={{ fontSize: 16.5, lineHeight: 1.65, color: "var(--color-body)", marginTop: 12 }}>{p.bio}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}

/*
 * FAQ tetap di kode: naskah editorial, bukan data yang dikelola admin.
 * Tanpa penyunting FAQ di portal, memindahkannya ke basis data hanya
 * membuatnya lebih sulit diubah.
 */
const FAQ_HALAMAN: { q: string; a: string }[] = [
  { q: "Apakah program ini untuk pemula?", a: "Ya. Caturwulan 1 dirancang untuk yang belum pernah belajar Bahasa Arab maupun ilmu syar'i secara terstruktur." },
  { q: "Berapa beban belajar per pekan?", a: "Sekitar 4–6 jam per pekan, sudah termasuk kelas, latihan, worksheet, dan murojaah." },
  { q: "Apakah harus mengikuti seluruh tahapan?", a: "Tidak. Pendaftaran dilakukan per caturwulan, dan setiap caturwulan adalah unit belajar yang utuh." },
  { q: "Bagaimana bila saya tertinggal?", a: "Tersedia Jalur Mengejar Ketertinggalan berisi materi esensial, agar yang tertinggal tidak menumpuk." },
  { q: "Apakah ada evaluasi dan sertifikat?", a: "Ada. Setiap caturwulan diakhiri dengan pertemuan murojaah dan evaluasi akhir." },
];

/* --- /faq ------------------------------------------------------- */

export function Faq() {
  const items = FAQ_HALAMAN;
  const [open, setOpen] = useState<number | null>(0);
  return (
    <PageShell eyebrow="FAQ" title="Pertanyaan yang sering diajukan">
      <div style={{ border: "1px solid var(--color-line)", borderRadius: 12, overflow: "hidden", background: "var(--color-surface)" }}>
        {items.map((it, i) => (
          <div key={it.q} style={{ borderTop: i === 0 ? undefined : "1px solid var(--color-line-soft)" }}>
            <button
              type="button"
              aria-expanded={open === i}
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: "100%",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                gap: 20,
                alignItems: "center",
                padding: "20px 26px",
                background: "transparent",
                border: 0,
                cursor: "pointer",
                fontSize: 18.5,
                fontWeight: 600,
                color: "var(--color-ink)",
              }}
            >
              {it.q}
              <span aria-hidden="true" style={{ color: "var(--color-forest)", fontSize: 18, flex: "none" }}>
                {open === i ? "−" : "+"}
              </span>
            </button>
            {open === i && (
              <div style={{ padding: "0 26px 22px", fontSize: 16.5, lineHeight: 1.7, color: "var(--color-body)", maxWidth: 720 }}>
                {it.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </PageShell>
  );
}
