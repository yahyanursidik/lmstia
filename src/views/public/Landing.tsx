import { useState } from "react";
import { Link } from "react-router";
import { useResource } from "../../lib/useApi";
import { roadmap, segmen } from "../../data/tia";

/**
 * Landing page — follows the 11-section order in 05-LANDING-PAGE.md, with the
 * hero copy taken verbatim from that spec. Visual language comes from the
 * design canvas (TIA.dc.html).
 *
 * Hallmark discipline (12-HALLMARK-RULES.md): section treatments alternate
 * deliberately — editorial two-column, numbered rows, a dark band, a schedule
 * table, an accordion — so the page never becomes a stack of identical cards.
 * No gradient blobs, no floating dashboards, no dome/crescent ornament.
 */

const mono = "var(--font-mono)";
const serif = "var(--font-serif)";

/* --- shared bits ------------------------------------------------ */

function SectionHead({
  eyebrow,
  title,
  lead,
  tone = "light",
  max = 620,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: string;
  tone?: "light" | "dark";
  max?: number;
}) {
  return (
    <div style={{ marginBottom: 34 }}>
      <div className={tone === "dark" ? "eyebrow eyebrow-on-dark" : "eyebrow"} style={{ marginBottom: 18 }}>
        {eyebrow}
      </div>
      <h2 className="h2-lg" style={{ fontSize: 38, lineHeight: 1.15, maxWidth: 780 }}>
        {title}
      </h2>
      {lead && (
        <p
          style={{
            margin: "22px 0 0",
            fontSize: 16.5,
            lineHeight: 1.65,
            color: tone === "dark" ? "rgba(238,242,238,.72)" : "var(--color-body)",
            maxWidth: max,
            textWrap: "pretty",
          }}
        >
          {lead}
        </p>
      )}
    </div>
  );
}

type MapelBeranda = {
  id: string;
  name: string;
  code: string;
  role: string;
  description: string | null;
  deliveryModel: string | null;
  weeklyLoad: string | null;
  instructorId: string | null;
};

type PengajarBeranda = {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
};

type Beranda = {
  tahapan: { id: string; name: string; title: string | null } | null;
  subjects: MapelBeranda[];
  pengajar: PengajarBeranda[];
};

/** Inisial dari nama, karena avatar belum tentu ada. */
const inisialNama = (nama: string) =>
  nama
    .replace(/[^p{L}s]/gu, " ")
    .trim()
    .split(/s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

/* --- 1. Hero ---------------------------------------------------- */

function Hero({ mapel }: { mapel: MapelBeranda[] }) {
  return (
    <section
      className="shell split"
      style={{
        paddingBlock: "84px 64px",
        display: "grid",
        gridTemplateColumns: "1.2fr .8fr",
        gap: 64,
        alignItems: "start",
      }}
    >
      <div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 12px 5px 8px",
            border: "1px solid #d8d0c1",
            borderRadius: 100,
            fontFamily: mono,
            fontSize: 11.5,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--color-muted)",
            marginBottom: 30,
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-ochre)" }} />
          Pendaftaran Caturwulan 1 dibuka
        </div>

        <h1 className="hero-h1" style={{ fontSize: 62, lineHeight: 1.06, letterSpacing: "-.022em" }}>
          Mulai Menuntut Ilmu,
          <br />
          <span style={{ fontStyle: "italic", color: "var(--color-forest)" }}>
            Satu Caturwulan Sekaligus.
          </span>
        </h1>

        <p
          style={{
            margin: "30px 0 0",
            maxWidth: 560,
            fontSize: 18.5,
            lineHeight: 1.62,
            color: "var(--color-body)",
            textWrap: "pretty",
          }}
        >
          Belajar Bahasa Arab dan ilmu syar&apos;i secara bertahap, terarah, dan realistis dijalani di tengah
          pekerjaan, kuliah, dan keluarga.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 36 }}>
          <Link to="/caturwulan/caturwulan-1" className="btn btn-primary">
            Lihat Caturwulan 1 <span style={{ opacity: 0.6 }}>→</span>
          </Link>
          <Link to="/cara-belajar" className="btn btn-ghost">
            Lihat Cara Belajar
          </Link>
        </div>

        <p style={{ margin: "22px 0 0", fontSize: 16, color: "var(--color-muted)", fontStyle: "italic" }}>
          Tidak perlu langsung berkomitmen untuk program bertahun-tahun.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 22px",
            marginTop: 26,
            paddingTop: 22,
            borderTop: "1px solid var(--color-line)",
            fontFamily: mono,
            fontSize: 12.5,
            letterSpacing: ".03em",
            color: "#807a70",
          }}
        >
          <span>4–6 JAM / PEKAN</span>
          <span style={{ color: "#cfc7b8" }}>·</span>
          <span>12 PEKAN</span>
          <span style={{ color: "#cfc7b8" }}>·</span>
          <span>UNTUK MUSLIM DEWASA</span>
        </div>
      </div>

      {/* Isi caturwulan aktif — label + tiga mata pelajaran, per spec hero. */}
      <div
        className="card"
        style={{
          padding: 28,
          boxShadow: "0 1px 2px rgba(28,26,23,.04), 0 12px 32px -18px rgba(28,26,23,.16)",
        }}
      >
        <div style={{ paddingBottom: 18, borderBottom: "1px solid #ece6da" }}>
          <div className="eyebrow" style={{ letterSpacing: ".12em" }}>
            Yang sedang dibuka
          </div>
          <div style={{ fontFamily: serif, fontSize: 26, lineHeight: 1.2, marginTop: 8 }}>
            Caturwulan 1 · Marhalah I&apos;dad
          </div>
          <div style={{ fontSize: 15.5, color: "var(--color-muted)", marginTop: 8, lineHeight: 1.55 }}>
            Tema: <strong style={{ color: "var(--color-ink)" }}>Membangun Fondasi Menuntut Ilmu</strong>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {mapel.map((m, i) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "14px 0",
                borderTop: i === 0 ? undefined : "1px solid var(--color-line-soft)",
              }}
            >
              <div style={{ width: 26, flex: "none", fontFamily: mono, fontSize: 12.5, color: "#b0a897", paddingTop: 2 }}>
                0{i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17.5, fontWeight: 700 }}>{m.name}</div>
                <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 3 }}>{m.weeklyLoad}</div>
              </div>
              <div
                style={{
                  flex: "none",
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: ".06em",
                  color: m.role === "INTENSIVE" ? "var(--color-forest)" : "var(--color-soft)",
                  paddingTop: 4,
                }}
              >
                {m.role}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 18,
            padding: "14px 16px",
            background: "var(--color-paper)",
            borderRadius: 8,
            fontSize: 14.5,
            lineHeight: 1.55,
            color: "#5c564d",
          }}
        >
          Satu mata pelajaran intensif, satu fondasi, dan satu pendamping mandiri. Tidak lebih.
        </div>
      </div>
    </section>
  );
}

/* --- 2. Mengapa sistem caturwulan -------------------------------- */

function MengapaCaturwulan() {
  const [open, setOpen] = useState(false);

  return (
    <section style={{ borderTop: "1px solid var(--color-line)", background: "var(--color-surface)" }}>
      <div className="shell" style={{ paddingBlock: 80 }}>
        <div
          className="split"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "start" }}
        >
          <div>
            <SectionHead
              eyebrow="Mengapa sistem caturwulan"
              title={
                <>
                  Program panjang bagi tim kurikulum,{" "}
                  <span style={{ fontStyle: "italic", color: "var(--color-forest)" }}>
                    program pendek bagi peserta.
                  </span>
                </>
              }
              lead="Roadmap akademik TIA memang panjang. Tetapi peserta tidak boleh merasa sejak awal sedang mendaftar program bertahun-tahun. Anda cukup berkomitmen untuk satu caturwulan terlebih dahulu — dan setelah menyelesaikannya, Anda yang memutuskan apakah ingin melanjutkan."
            />
            <div
              style={{
                padding: "22px 24px",
                borderLeft: "2px solid var(--color-forest)",
                background: "var(--color-paper)",
                fontFamily: serif,
                fontSize: 19,
                lineHeight: 1.5,
                fontStyle: "italic",
                color: "var(--color-forest)",
              }}
            >
              Setiap caturwulan adalah unit belajar yang utuh: punya tema, target, evaluasi, dan penutup sendiri.
            </div>
          </div>

          {/* Kontras dua pola — bukan kartu seragam, tapi dua kolom berdampingan. */}
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1,
                background: "var(--color-line)",
                border: "1px solid var(--color-line)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: 24, background: "var(--color-sand)" }}>
                <div style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: ".1em", color: "var(--color-faint)", marginBottom: 14 }}>
                  POLA YANG DIHINDARI
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 15.5, color: "var(--color-soft)", lineHeight: 1.4 }}>
                  <div>Semangat tinggi</div>
                  <div>Beban menumpuk</div>
                  <div>Tertinggal</div>
                  <div>Merasa gagal</div>
                  <div>Bosan</div>
                  <div style={{ textDecoration: "line-through" }}>Berhenti</div>
                </div>
              </div>
              <div style={{ padding: 24, background: "var(--color-surface)" }}>
                <div style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: ".1em", color: "var(--color-forest)", marginBottom: 14 }}>
                  POLA YANG DIBANGUN TIA
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 15.5, color: "#2f2c27", lineHeight: 1.4, fontWeight: 600 }}>
                  <div>Mulai</div>
                  <div>Belajar</div>
                  <div>Berlatih</div>
                  <div>Murojaah</div>
                  <div>Menyelesaikan</div>
                  <div>Beristirahat</div>
                  <div style={{ color: "var(--color-forest)" }}>Melanjutkan</div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: "16px 18px",
                background: "var(--color-mist)",
                borderRadius: 8,
              }}
            >
              <div style={{ flex: "none", fontSize: 15, fontWeight: 700, color: "var(--color-forest)", fontFamily: mono }}>
                JEDA
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.55, color: "#3d5a4e" }}>
                Cawu selesai → jeda 1–2 pekan → cawu berikutnya dimulai. Jeda adalah bagian dari desain pembelajaran,
                bukan waktu kosong.
              </div>
            </div>
          </div>
        </div>

        {/* Roadmap penuh sengaja disembunyikan: tersedia, tapi tidak menuntut komitmen. */}
        <div style={{ marginTop: 44, paddingTop: 30, borderTop: "1px solid var(--color-line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div style={{ fontSize: 16.5, color: "var(--color-body)", maxWidth: 560, lineHeight: 1.6 }}>
              Ingin melihat perjalanan lengkapnya? Roadmap panjang tersedia untuk yang penasaran — tetapi{" "}
              <strong>tidak menjadi kewajiban komitmen sejak awal.</strong>
            </div>
            <button type="button" className="btn-sm" aria-expanded={open} aria-controls="roadmap-penuh" onClick={() => setOpen((v) => !v)}>
              {open ? "Sembunyikan roadmap lengkap" : "Lihat roadmap lengkap"}
            </button>
          </div>

          {open && (
            <div
              id="roadmap-penuh"
              style={{ marginTop: 22, border: "1px solid var(--color-line)", borderRadius: 10, overflow: "hidden", background: "var(--color-paper)" }}
            >
              <div
                className="table-head"
                style={{
                  display: "grid",
                  gridTemplateColumns: "130px 110px 1fr",
                  padding: "13px 22px",
                  background: "var(--color-sand)",
                  fontFamily: mono,
                  fontSize: 11.5,
                  letterSpacing: ".1em",
                  color: "var(--color-soft)",
                }}
              >
                <div>MARHALAH</div>
                <div className="col-hide">CAWU</div>
                <div className="col-hide">MATA PELAJARAN</div>
              </div>
              {roadmap.map((r) => (
                <div
                  key={r.marhalah + r.cawu}
                  className="table-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "130px 110px 1fr",
                    padding: "15px 22px",
                    borderTop: "1px solid var(--color-line-soft)",
                    fontSize: 16,
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "var(--color-forest)" }}>{r.marhalah}</div>
                  <div style={{ color: "var(--color-muted)", fontFamily: mono, fontSize: 14.5 }}>{r.cawu}</div>
                  <div className="col-hide" style={{ color: "#3d3a34" }}>
                    {r.mapel}
                  </div>
                </div>
              ))}
              <div style={{ padding: "16px 22px", borderTop: "1px solid var(--color-line-soft)", fontSize: 14.5, color: "#807a70", lineHeight: 1.55 }}>
                Roadmap ini terutama berfungsi bagi tim kurikulum. Anda cukup berkomitmen satu caturwulan.
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* --- 3. Fokus Caturwulan 1 --------------------------------------- */

function FokusCawu1({ mapel, pengajar }: { mapel: MapelBeranda[]; pengajar: PengajarBeranda[] }) {
  const struktur = [
    { p: "PERTEMUAN 0", t: "Orientasi", d: "Mengenal ritme belajar, menyiapkan target, dan memilih pengingat." },
    { p: "PERTEMUAN 1–10", t: "Pembelajaran inti", d: "Materi, latihan, worksheet, dan murojaah setiap pekan." },
    { p: "PERTEMUAN 11", t: "Pertemuan Murojaah", d: "Tidak ada materi baru. Fokus mengulang dan menutup yang tertinggal." },
    { p: "PERTEMUAN 12", t: "Evaluasi Akhir", d: "Evaluasi, laporan capaian, dan muhasabah perjalanan." },
  ];

  return (
    <section className="shell" style={{ paddingBlock: 80 }}>
      <SectionHead
        eyebrow="Fokus Caturwulan 1"
        title="Membangun Fondasi Menuntut Ilmu"
        lead="Satu caturwulan hanya menampilkan sedikit mata pelajaran utama. Fokus itulah yang membuat program ini bisa diselesaikan, bukan sekadar dimulai."
      />

      {/* Tiga mata pelajaran sebagai baris bernomor, bukan tiga kartu seragam. */}
      <div style={{ border: "1px solid var(--color-line)", borderRadius: 12, overflow: "hidden", background: "var(--color-surface)" }}>
        {mapel.map((m, i) => {
          const guru = pengajar.find((g) => g.id === m.instructorId);
          return (
            <div
              key={m.id}
              className="split"
              style={{
                display: "grid",
                gridTemplateColumns: "58px 1fr 200px",
                gap: 24,
                padding: "28px 30px",
                borderTop: i === 0 ? undefined : "1px solid var(--color-line-soft)",
                background: m.role === "INTENSIVE" ? "var(--color-mist)" : undefined,
              }}
            >
              <div style={{ fontFamily: mono, fontSize: 15, color: "var(--color-ochre)" }}>0{i + 1}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontFamily: serif, fontSize: 24 }}>{m.name}</div>
                  <span
                    style={{
                      fontFamily: mono,
                      fontSize: 11,
                      letterSpacing: ".1em",
                      color: m.role === "INTENSIVE" ? "var(--color-forest)" : "var(--color-faint)",
                    }}
                  >
                    {m.role}
                  </span>
                </div>
                <div style={{ fontSize: 16.5, lineHeight: 1.65, color: "var(--color-body)", marginTop: 10 }}>
                  {m.description}
                </div>
              </div>
              <div style={{ fontSize: 14.5, color: "var(--color-muted)", lineHeight: 1.6 }}>
                <div>{m.deliveryModel}</div>
                <div style={{ marginTop: 8, color: "var(--color-faint)" }}>{m.weeklyLoad}</div>
                {guru && <div style={{ marginTop: 8 }}>{guru.name}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Struktur 12 pekan — strip mendatar, bukan kartu. */}
      <h3 style={{ fontSize: 22, margin: "48px 0 20px" }}>Bentuk 12 pekannya</h3>
      <div className="quad" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, border: "1px solid var(--color-line)", borderRadius: 10, overflow: "hidden" }}>
        {struktur.map((s, i) => (
          <div
            key={s.p}
            style={{
              padding: "24px 22px",
              background: "var(--color-surface)",
              borderLeft: i === 0 ? undefined : "1px solid var(--color-line-soft)",
            }}
          >
            <div style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: ".1em", color: "var(--color-ochre)" }}>{s.p}</div>
            <div style={{ fontFamily: serif, fontSize: 19, color: "var(--color-forest)", marginTop: 10 }}>{s.t}</div>
            <div style={{ fontSize: 15, lineHeight: 1.6, color: "var(--color-muted)", marginTop: 8 }}>{s.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --- 4. Cara belajar --------------------------------------------- */

function CaraBelajar() {
  const langkah = [
    { n: "01", t: "Ilmu", d: "Materi disampaikan lewat kelas online dan materi mandiri." },
    { n: "02", t: "Faham", d: "Konsep dipastikan dipahami sebelum lanjut, bukan sekadar didengar." },
    { n: "03", t: "Latihan", d: "Setiap materi diikuti latihan terarah dengan umpan balik." },
    { n: "04", t: "Murojaah", d: "Pengulangan adalah bagian inti kurikulum, bukan tambahan." },
    { n: "05", t: "Amal", d: "Ilmu diarahkan untuk diamalkan, bukan hanya dikumpulkan." },
  ];
  const unit = [
    "Sebelum Belajar",
    "Materi Utama",
    "Latihan",
    "Worksheet",
    "Murojaah",
    "Cek Pemahaman",
    "Refleksi",
  ];

  return (
    <section style={{ background: "var(--color-forest)", color: "var(--color-mist)" }}>
      <div className="shell" style={{ paddingBlock: 80 }}>
        <SectionHead
          tone="dark"
          eyebrow="Cara belajar"
          title="Ilmu → Faham → Latihan → Murojaah → Amal"
          lead="TIA bukan sekadar kumpulan kajian, melainkan jalur belajar yang memiliki struktur, jenjang, target, evaluasi, pendampingan, dan rekam jejak belajar."
        />

        <div className="quad" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1, background: "rgba(238,242,238,.16)", border: "1px solid rgba(238,242,238,.16)", borderRadius: 10, overflow: "hidden" }}>
          {langkah.map((l) => (
            <div key={l.n} style={{ background: "var(--color-forest)", padding: "26px 22px" }}>
              <div style={{ fontFamily: mono, fontSize: 12.5, color: "rgba(238,242,238,.45)" }}>{l.n}</div>
              <div style={{ fontFamily: serif, fontSize: 23, marginTop: 12 }}>{l.t}</div>
              <div style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(238,242,238,.7)", marginTop: 8 }}>{l.d}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 40, paddingTop: 30, borderTop: "1px solid rgba(238,242,238,.16)" }}>
          <div className="eyebrow eyebrow-on-dark" style={{ marginBottom: 18 }}>
            Struktur satu unit pekanan
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {unit.map((u, i) => (
              <span
                key={u}
                style={{
                  padding: "10px 15px",
                  borderRadius: 6,
                  border: "1px solid rgba(238,242,238,.22)",
                  fontSize: 15.5,
                  fontWeight: 600,
                }}
              >
                <span style={{ fontFamily: mono, fontSize: 11.5, color: "rgba(238,242,238,.45)", marginRight: 8 }}>
                  0{i + 1}
                </span>
                {u}
              </span>
            ))}
          </div>
          <p style={{ margin: "20px 0 0", fontSize: 16, color: "rgba(238,242,238,.7)", maxWidth: 620, lineHeight: 1.65 }}>
            Pola yang sama berulang setiap pekan. Karena bentuknya tetap, Anda tidak perlu menebak apa yang harus
            dikerjakan — cukup lanjutkan dari bagian terakhir yang belum selesai.
          </p>
        </div>
      </div>
    </section>
  );
}

/* --- 5. Bahasa Arab hybrid --------------------------------------- */

function BahasaArabHybrid() {
  const pola = [
    { h: "SENIN", t: "Kelas Materi — online", d: "Penjelasan konsep baru bersama pengajar.", w: "60–75 menit" },
    { h: "RABU", t: "Kelas Latihan — online", d: "Membaca, menulis, dan koreksi kesalahan bersama.", w: "45–60 menit" },
    { h: "SABTU / AHAD", t: "Praktik dan Penguatan — tatap muka", d: "Praktik langsung dan penguatan bacaan.", w: "Pekanan" },
  ];
  return (
    <section style={{ borderTop: "1px solid var(--color-line)", background: "var(--color-surface)" }}>
      <div className="shell split" style={{ paddingBlock: 80, display: "grid", gridTemplateColumns: ".9fr 1.1fr", gap: 60, alignItems: "start" }}>
        <div>
          <SectionHead
            eyebrow="Mata pelajaran intensif"
            title={
              <>
                Bahasa Arab dipelajari secara{" "}
                <span style={{ fontStyle: "italic", color: "var(--color-forest)" }}>hybrid</span>.
              </>
            }
            lead="Bahasa Arab adalah alat untuk memahami ilmu. Karena itu ia mendapat porsi paling besar — dua kelas online dan satu pertemuan tatap muka setiap pekan, agar bacaan dan tulisan benar-benar terkoreksi."
            max={440}
          />
        </div>
        <div style={{ border: "1px solid var(--color-line)", borderRadius: 12, overflow: "hidden", background: "var(--color-paper)" }}>
          {pola.map((p, i) => (
            <div
              key={p.h}
              className="split"
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 110px",
                gap: 18,
                padding: "22px 24px",
                borderTop: i === 0 ? undefined : "1px solid var(--color-line-soft)",
                alignItems: "start",
              }}
            >
              <div style={{ fontFamily: mono, fontSize: 12.5, letterSpacing: ".08em", color: "var(--color-faint)", paddingTop: 3 }}>
                {p.h}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{p.t}</div>
                <div style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--color-muted)", marginTop: 5 }}>{p.d}</div>
              </div>
              <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-forest)", paddingTop: 3 }}>{p.w}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --- 6. Aqidah + Majlis Ta'sil ----------------------------------- */

function AqidahMajlis() {
  const bulan = [
    { b: "BULAN 1", t: "Mengenal Tujuan Kehidupan", isi: "Mengapa mempelajari agama, tujuan penciptaan, mengenal Allah sebagai Rabb, makna ibadah.", m: "Untuk Apa Kita Diciptakan?" },
    { b: "BULAN 2", t: "Hanya kepada Allah Kita Beribadah", isi: "Pengertian tauhid, rububiyah, uluhiyah, serta pengantar nama dan sifat Allah.", m: "Hanya kepada Allah Kita Beribadah" },
    { b: "BULAN 3", t: "Ilmu, Iman, dan Amal", isi: "Pengantar iman, hubungan ilmu dan amal, ikhlas, mengikuti Rasulullah, dan istiqamah.", m: "Ilmu, Iman, dan Amal" },
  ];
  return (
    <section className="shell" style={{ paddingBlock: 80 }}>
      <SectionHead
        eyebrow="Mata pelajaran fondasi"
        title="Aqidah dipelajari mandiri, lalu dikuatkan dalam Majlis Ta'sil."
        lead="Setiap pekan Anda mempelajari satu hingga dua materi mandiri melalui LMS. Sekali sebulan, seluruh peserta berkumpul dalam Majlis Ta'sil untuk murojaah, tanya jawab, dan pembahasan dalil."
      />
      <div className="quad" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {bulan.map((x) => (
          <div key={x.b} style={{ border: "1px solid var(--color-line)", borderRadius: 10, background: "var(--color-surface)", padding: 26 }}>
            <div style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: ".11em", color: "var(--color-faint)" }}>{x.b}</div>
            <div style={{ fontFamily: serif, fontSize: 21, lineHeight: 1.3, marginTop: 10 }}>{x.t}</div>
            <div style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--color-muted)", marginTop: 12 }}>{x.isi}</div>
            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: "1px solid var(--color-line-soft)",
                fontSize: 14.5,
                lineHeight: 1.55,
                color: "var(--color-muted)",
              }}
            >
              Majlis Ta&apos;sil: <span style={{ color: "var(--color-forest)", fontWeight: 600 }}>{x.m}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --- 7. Materi LMS ------------------------------------------------ */

function MateriLMS() {
  const fitur = [
    "Video dan audio materi",
    "PDF ringkas dan lembar kosakata",
    "Latihan dengan umpan balik pengajar",
    "Worksheet lintas mata pelajaran",
    "Cek pemahaman singkat",
    "Catatan pribadi dan penanda murojaah",
    "Progres per caturwulan",
    "Jalur mengejar ketertinggalan",
  ];
  return (
    <section style={{ borderTop: "1px solid var(--color-line)", background: "var(--color-sand)" }}>
      <div className="shell split" style={{ paddingBlock: 76, display: "grid", gridTemplateColumns: ".9fr 1.1fr", gap: 60, alignItems: "center" }}>
        <div>
          <SectionHead
            eyebrow="Di dalam LMS"
            title="Semua yang Anda perlukan untuk satu pekan, di satu tempat."
            lead="LMS TIA tidak menampilkan seluruh perjalanan sekaligus. Yang tampil adalah pertemuan yang sedang Anda jalani dan satu langkah berikutnya."
            max={420}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "var(--color-line)", border: "1px solid var(--color-line)", borderRadius: 10, overflow: "hidden" }}>
          {fitur.map((f) => (
            <div key={f} style={{ background: "var(--color-surface)", padding: "18px 20px", fontSize: 15.5, lineHeight: 1.45, color: "var(--color-body)" }}>
              {f}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --- 8. Ritme satu pekan ------------------------------------------ */

function RitmeSatuPekan() {
  const baris = [
    { h: "SENIN", k: "Bahasa Arab — Kelas Materi", m: "Online", tm: false },
    { h: "RABU", k: "Bahasa Arab — Kelas Latihan", m: "Online", tm: false },
    { h: "SAB/AHAD", k: "Praktik dan Penguatan", m: "Tatap muka", tm: true },
    { h: "PEKANAN", k: "Aqidah & Adab Menuntut Ilmu", m: "LMS mandiri", tm: false },
    { h: "BULANAN", k: "Majlis Ta'sil Aqidah", m: "Tatap muka", tm: true },
  ];
  const stats = [
    { n: "4–6", l: "JAM / PEKAN" },
    { n: "12", l: "PEKAN / CAWU" },
    { n: "3", l: "MATA PELAJARAN" },
  ];

  return (
    <section style={{ background: "var(--color-forest)", color: "var(--color-mist)" }}>
      <div className="shell split" style={{ paddingBlock: 76, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
        <div>
          <SectionHead
            tone="dark"
            eyebrow="Ritme satu pekan"
            title={
              <>
                Anda tidak perlu kelas <span style={{ fontStyle: "italic" }}>setiap hari</span>.
              </>
            }
            lead="Dua kelas online, satu praktik tatap muka pekanan, dan belajar mandiri melalui LMS sepanjang pekan. Sekali sebulan, Majlis Ta'sil untuk pendalaman Aqidah."
            max={420}
          />
          <div style={{ display: "flex", gap: 34, paddingTop: 26, borderTop: "1px solid rgba(238,242,238,.16)" }}>
            {stats.map((s) => (
              <div key={s.l}>
                <div style={{ fontFamily: serif, fontSize: 34, lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: 13, color: "rgba(238,242,238,.55)", marginTop: 5, letterSpacing: ".04em" }}>
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "rgba(255,253,249,.05)", border: "1px solid rgba(238,242,238,.14)", borderRadius: 10, padding: 8 }}>
          {baris.map((r, i) => (
            <div
              key={r.h}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "15px 18px",
                borderBottom: i === baris.length - 1 ? undefined : "1px solid rgba(238,242,238,.1)",
              }}
            >
              <div style={{ width: 84, flex: "none", fontFamily: mono, fontSize: 12.5, color: "rgba(238,242,238,.5)" }}>
                {r.h}
              </div>
              <div style={{ flex: 1, fontSize: 16.5, minWidth: 0 }}>{r.k}</div>
              <div style={{ fontSize: 12.5, color: r.tm ? "#c9d8cf" : "rgba(238,242,238,.5)", flex: "none" }}>{r.m}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --- Untuk siapa (Target Pengguna, 01-PRODUCT-BRIEF §5) ----------- */

function UntukSiapa() {
  return (
    <section className="shell" style={{ paddingBlock: 80 }}>
      <SectionHead
        eyebrow="Untuk siapa"
        title="Dirancang untuk orang dewasa yang punya kesibukan lain."
        lead="Beban belajar disusun realistis agar tetap bisa dijalani di tengah pekerjaan, kuliah, dan keluarga."
      />
      <div className="quad" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        {segmen.map((s) => (
          <div key={s.nama} style={{ padding: 24, border: "1px solid #e8e2d6", borderRadius: 10, background: "var(--color-surface)" }}>
            <div style={{ fontSize: 18.5, fontWeight: 700, lineHeight: 1.35 }}>{s.nama}</div>
            <div style={{ fontFamily: mono, fontSize: 12, color: "var(--color-faint)", marginTop: 6 }}>{s.usia}</div>
            <div style={{ fontSize: 15.5, lineHeight: 1.6, color: "#5c564d", marginTop: 14 }}>{s.butuh}</div>
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: "1px solid #e8e2d6",
                fontSize: 15,
                lineHeight: 1.55,
                color: "var(--color-forest)",
                fontWeight: 600,
              }}
            >
              {s.nilai}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --- 9. Pengajar --------------------------------------------------- */

function Pengajar({ list }: { list: PengajarBeranda[] }) {
  return (
    <section style={{ borderTop: "1px solid var(--color-line)", background: "var(--color-surface)" }}>
      <div className="shell" style={{ paddingBlock: 76 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 24, flexWrap: "wrap", marginBottom: 32 }}>
          <SectionHead
            eyebrow="Pengajar"
            title="Pendampingan, bukan sekadar penyampaian materi."
            lead="Setiap mata pelajaran diampu pengajar yang mendampingi latihan, memberi umpan balik, dan memantau perkembangan peserta."
          />
        </div>
        <div className="quad" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {list.map((p) => (
            <div key={p.id} style={{ border: "1px solid var(--color-line)", borderRadius: 10, background: "var(--color-paper)", padding: 26 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: "50%",
                  background: "var(--color-mist)",
                  color: "var(--color-forest)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: serif,
                  fontSize: 17,
                }}
              >
                {inisialNama(p.name)}
              </div>
              <div style={{ fontSize: 16.5, fontWeight: 700, marginTop: 16 }}>{p.name}</div>
              <div style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: ".1em", color: "var(--color-faint)", marginTop: 6 }}>
                {(p.title ?? "Pengajar").toUpperCase()}
              </div>
              <div style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--color-body)", marginTop: 14 }}>{p.bio}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --- 10. FAQ ------------------------------------------------------- */

const FAQ_BERANDA: { q: string; a: string }[] = [
  {
    q: "Apakah program ini untuk pemula?",
    a: "Ya. Caturwulan 1 dirancang untuk yang belum pernah belajar Bahasa Arab maupun ilmu syar'i secara terstruktur.",
  },
  {
    q: "Berapa beban belajar per pekan?",
    a: "Sekitar 4–6 jam per pekan, sudah termasuk kelas, latihan, worksheet, dan murojaah. Beban ini dirancang realistis bagi orang dewasa yang bekerja atau kuliah.",
  },
  {
    q: "Apakah harus mengikuti seluruh tahapan?",
    a: "Tidak. Pendaftaran dilakukan per caturwulan, dan setiap caturwulan adalah unit belajar yang utuh.",
  },
  {
    q: "Apakah ada evaluasi dan sertifikat?",
    a: "Ada. Setiap caturwulan diakhiri dengan pertemuan murojaah dan evaluasi akhir. Peserta yang memenuhi syarat menerima laporan capaian dan Syahadah Penyelesaian.",
  },
];

function FaqSection() {
  const items = FAQ_BERANDA;
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="shell" style={{ paddingBlock: 80 }}>
      <SectionHead eyebrow="FAQ" title="Pertanyaan yang sering diajukan" />
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
              <div style={{ padding: "0 26px 22px", fontSize: 16.5, lineHeight: 1.7, color: "var(--color-body)", maxWidth: 760 }}>
                {it.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* --- 11. CTA pendaftaran ------------------------------------------- */

function CtaPendaftaran() {
  const pesan = [
    "Pendaftaran dilakukan per caturwulan.",
    "Setiap caturwulan adalah unit belajar yang utuh.",
    "Peserta dapat melanjutkan ketika siap.",
    "Roadmap panjang tidak menjadi kewajiban komitmen sejak awal.",
  ];
  const info = [
    { k: "Program", v: "TIA — Caturwulan 1" },
    { k: "Marhalah", v: "I'dad" },
    { k: "Durasi", v: "1 caturwulan · 12 pekan" },
    { k: "Beban belajar", v: "4–6 jam / pekan" },
  ];

  return (
    <section id="daftar" style={{ borderTop: "1px solid var(--color-line)", background: "var(--color-surface)" }}>
      <div className="shell split" style={{ paddingBlock: 84, display: "grid", gridTemplateColumns: "1fr .8fr", gap: 60, alignItems: "center" }}>
        <div>
          <h2 className="h2-lg" style={{ fontSize: 44, lineHeight: 1.1, letterSpacing: "-.02em" }}>
            Mari selesaikan{" "}
            <span style={{ fontStyle: "italic", color: "var(--color-forest)" }}>Caturwulan 1</span> terlebih dahulu.
          </h2>
          <p style={{ margin: "24px 0 0", fontSize: 16.5, lineHeight: 1.65, color: "var(--color-body)", maxWidth: 480 }}>
            Mulai dari fondasi. Belajar dengan tertib. Jaga istiqamah. Tidak harus mempelajari semuanya sekaligus.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "26px 0 0" }}>
            {pesan.map((p) => (
              <div key={p} style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 16, lineHeight: 1.6, color: "var(--color-body)" }}>
                <span aria-hidden="true" style={{ color: "var(--color-forest)", flex: "none", paddingTop: 1 }}>
                  ✓
                </span>
                {p}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
            <Link to="/daftar" className="btn btn-primary" style={{ padding: "16px 28px", fontSize: 18 }}>
              Daftar Caturwulan 1 <span style={{ opacity: 0.6 }}>→</span>
            </Link>
            <Link to="/caturwulan/caturwulan-1" className="btn btn-ghost">
              Lihat rincian caturwulan
            </Link>
          </div>
        </div>

        <div style={{ border: "1px solid var(--color-line)", borderRadius: 10, background: "var(--color-paper)", overflow: "hidden" }}>
          <div style={{ padding: "14px 22px", background: "var(--color-sand)", fontFamily: mono, fontSize: 11.5, letterSpacing: ".11em", color: "var(--color-soft)" }}>
            INFORMASI PENDAFTARAN
          </div>
          {info.map((r) => (
            <div
              key={r.k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 18,
                padding: "15px 22px",
                borderTop: "1px solid var(--color-line-soft)",
                fontSize: 16,
              }}
            >
              <span style={{ color: "#807a70" }}>{r.k}</span>
              <span style={{ fontWeight: 700, textAlign: "right" }}>{r.v}</span>
            </div>
          ))}
          <div style={{ padding: "15px 22px", borderTop: "1px solid var(--color-line-soft)", fontSize: 15, lineHeight: 1.55, color: "#5c564d", background: "var(--color-surface)" }}>
            Setelah selesai, peserta dapat memutuskan untuk melanjutkan ke Caturwulan 2. Tidak ada pendaftaran otomatis.
          </div>
        </div>
      </div>
    </section>
  );
}

/* --- page --------------------------------------------------------- */

export default function Landing() {
  const b = useResource<Beranda>("/beranda");
  const mapel = b.data?.subjects ?? [];
  const pengajar = b.data?.pengajar ?? [];

  return (
    <>
      <Hero mapel={mapel} />
      <MengapaCaturwulan />
      <FokusCawu1 mapel={mapel} pengajar={pengajar} />
      <CaraBelajar />
      <BahasaArabHybrid />
      <AqidahMajlis />
      <MateriLMS />
      <RitmeSatuPekan />
      <UntukSiapa />
      <Pengajar list={pengajar} />
      <FaqSection />
      <CtaPendaftaran />
    </>
  );
}
