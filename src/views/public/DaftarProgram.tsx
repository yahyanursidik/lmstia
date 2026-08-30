import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { api, ApiError } from "../../lib/api";
import { useResource } from "../../lib/useApi";
import { Card, Eyebrow, EmptyState, mono, serif } from "../../components/ui";
import { Combobox } from "../../components/Combobox";
import { EDUCATION_LABEL, NEGARA, PROVINSI, kotaDi } from "../../data/wilayah";

/**
 * Halaman pendaftaran satu program.
 *
 * Setiap program punya tautannya sendiri (/daftar/<tautan>) berisi halaman
 * pengantar dan formulir yang berjudul nama programnya. Tautan grup WhatsApp
 * tidak pernah ikut dalam konfigurasi yang dibaca halaman ini — server baru
 * memberikannya setelah kiriman tercatat, agar tidak bisa dipanen tanpa
 * mendaftar.
 */

type Form = {
  id: string;
  slug: string;
  title: string;
  headline: string | null;
  description: string | null;
  commitmentText: string;
  opensAt: string | null;
  closesAt: string | null;
  status: "draf" | "terbit" | "ditutup";
  programName: string;
  buka: boolean;
  alasan: string;
};

type Hasil = { gender: "ikhwan" | "akhwat"; programName: string; tautanGrup: string | null };

const tanggal = (v: string | null) =>
  v
    ? new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : null;

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

function Isian({
  label,
  wajib,
  hint,
  children,
}: {
  label: string;
  wajib?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontFamily: mono,
          fontSize: 11.5,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: "var(--color-faint)",
          marginBottom: 7,
        }}
      >
        {label}
        {wajib && <span style={{ color: "#8d4632" }}> *</span>}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: 13, color: "var(--color-faint)", marginTop: 5, lineHeight: 1.5 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export default function DaftarProgram() {
  const { slug } = useParams();
  const form = useResource<Form>(slug ? `/daftar/${slug}` : null);

  const [d, setD] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    country: "Indonesia",
    province: "",
    city: "",
    education: "",
    segment: "",
    reason: "",
  });
  const [setuju, setSetuju] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasil, setHasil] = useState<Hasil | null>(null);

  const set = (p: Partial<typeof d>) => setD((v) => ({ ...v, ...p }));
  const indonesia = d.country === "Indonesia";

  const f = form.data;

  const jendela = useMemo(() => {
    if (!f) return null;
    const buka = tanggal(f.opensAt);
    const tutup = tanggal(f.closesAt);
    if (buka && tutup) return `${buka} – ${tutup}`;
    if (tutup) return `Ditutup ${tutup}`;
    if (buka) return `Dibuka ${buka}`;
    return null;
  }, [f]);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!d.gender) return setErr("Pilih ikhwan atau akhwat terlebih dahulu.");
    if (!setuju) return setErr("Pernyataan istiqomah harus disetujui sebelum mengirim.");

    setBusy(true);
    try {
      const r = await api.post<Hasil>(`/daftar/${slug}`, {
        ...d,
        education: d.education || null,
        province: indonesia ? d.province || null : null,
        city: d.city || null,
        segment: d.segment || null,
        reason: d.reason || null,
        commitmentAgreed: true,
      });
      setHasil(r);
    } catch (e2) {
      if (e2 instanceof ApiError) {
        const rinci = e2.details as { path: string; message: string }[] | undefined;
        setErr(Array.isArray(rinci) && rinci.length ? rinci.map((x) => x.message).join(" · ") : e2.message);
      } else {
        setErr("Terjadi kesalahan yang tidak diketahui.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (form.loading) {
    return (
      <div className="shell" style={{ paddingBlock: "56px 80px", color: "var(--color-faint)" }}>
        Memuat formulir pendaftaran…
      </div>
    );
  }

  if (form.error || !f) {
    return (
      <div className="shell" style={{ paddingBlock: "56px 80px" }}>
        <EmptyState
          title="Formulir pendaftaran tidak ditemukan"
          hint="Tautan mungkin salah atau pendaftarannya sudah tidak berlaku."
        />
        <div style={{ marginTop: 20 }}>
          <Link to="/daftar" className="btn-sm">
            Lihat pendaftaran yang dibuka
          </Link>
        </div>
      </div>
    );
  }

  /* --- setelah berhasil --- */
  if (hasil) {
    return (
      <div className="shell" style={{ paddingBlock: "56px 80px" }}>
        <Eyebrow>Pendaftaran tercatat</Eyebrow>
        <h1 style={{ fontSize: 40, lineHeight: 1.15, marginTop: 16, maxWidth: 720 }}>
          Baarakallahu fiik, pendaftaran Anda sudah kami terima.
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.7, color: "var(--color-body)", maxWidth: 620, marginTop: 20 }}>
          Tim akademik akan meninjau pendaftaran Anda untuk <strong>{hasil.programName}</strong>.
          Langkah berikutnya diumumkan melalui grup WhatsApp di bawah ini.
        </p>

        <Card padding={26} style={{ marginTop: 28, maxWidth: 620 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            Grup {hasil.gender === "ikhwan" ? "Ikhwan" : "Akhwat"}
          </div>
          {hasil.tautanGrup ? (
            <>
              <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--color-body)", marginTop: 0 }}>
                Silakan bergabung ke grup {hasil.gender} agar tidak tertinggal pengumuman.
              </p>
              <a
                href={hasil.tautanGrup}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-solid-sm"
                style={{ display: "inline-block", marginTop: 8 }}
              >
                Gabung grup WhatsApp →
              </a>
              <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)", marginTop: 14, wordBreak: "break-all" }}>
                {hasil.tautanGrup}
              </div>
            </>
          ) : (
            <p style={{ fontSize: 16, lineHeight: 1.65, color: "var(--color-body)", margin: 0 }}>
              Tautan grup {hasil.gender} belum disiapkan panitia. Tim akademik akan menghubungi Anda
              melalui WhatsApp.
            </p>
          )}
        </Card>

        <div style={{ marginTop: 24 }}>
          <Link to="/" className="btn-sm">
            Kembali ke beranda
          </Link>
        </div>
      </div>
    );
  }

  /* --- halaman pengantar + formulir --- */
  return (
    <div className="shell" style={{ paddingBlock: "56px 80px" }}>
      <Eyebrow>Pendaftaran</Eyebrow>
      <h1 style={{ fontSize: 44, lineHeight: 1.1, marginTop: 16, maxWidth: 780 }}>{f.title}</h1>
      {f.headline && (
        <p style={{ fontSize: 18.5, lineHeight: 1.65, color: "var(--color-body)", maxWidth: 660, marginTop: 20 }}>
          {f.headline}
        </p>
      )}

      {jendela && (
        <div
          style={{
            display: "inline-block",
            marginTop: 22,
            padding: "9px 14px",
            border: "1px solid var(--color-line)",
            borderRadius: 999,
            fontFamily: mono,
            fontSize: 13,
            color: f.buka ? "var(--color-forest)" : "#8d4632",
          }}
        >
          {f.buka ? "Pendaftaran dibuka" : f.alasan} · {jendela}
        </div>
      )}

      <div
        className="split"
        style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 34, alignItems: "start", marginTop: 34 }}
      >
        <Card padding={28}>
          {!f.buka ? (
            <EmptyState
              title={f.alasan || "Pendaftaran belum dibuka"}
              hint={jendela ? `Jadwal pendaftaran: ${jendela}` : undefined}
            />
          ) : (
            <form onSubmit={kirim} style={{ display: "grid", gap: 17 }}>
              <Isian label="Nama lengkap" wajib>
                <input style={kotak} value={d.name} onChange={(e) => set({ name: e.target.value })} required />
              </Isian>

              <Isian label="Email" wajib>
                <input
                  type="email"
                  style={kotak}
                  value={d.email}
                  onChange={(e) => set({ email: e.target.value })}
                  required
                />
              </Isian>

              <Isian label="Nomor WhatsApp" wajib hint="Contoh: 0812-3456-7890 atau +62812…">
                <input style={kotak} value={d.phone} onChange={(e) => set({ phone: e.target.value })} required />
              </Isian>

              <Isian label="Ikhwan / Akhwat" wajib hint="Menentukan grup WhatsApp yang Anda terima.">
                <Combobox
                  value={d.gender}
                  onChange={(v) => set({ gender: v })}
                  options={[
                    { value: "", label: "— pilih —" },
                    { value: "ikhwan", label: "Ikhwan" },
                    { value: "akhwat", label: "Akhwat" },
                  ]}
                  searchable={false}
                  ariaLabel="Ikhwan atau akhwat"
                />
              </Isian>

              <Isian label="Negara">
                <Combobox
                  value={d.country}
                  onChange={(v) => set({ country: v, province: "", city: "" })}
                  options={NEGARA.map((n) => ({ value: n, label: n }))}
                  ariaLabel="Negara"
                />
              </Isian>

              {indonesia ? (
                <>
                  <Isian label="Provinsi">
                    <Combobox
                      value={d.province}
                      onChange={(v) => set({ province: v, city: "" })}
                      options={[
                        { value: "", label: "— pilih —" },
                        ...PROVINSI.map((p) => ({ value: p, label: p })),
                      ]}
                      ariaLabel="Provinsi"
                    />
                  </Isian>
                  <Isian label="Kabupaten/Kota" hint={d.province ? undefined : "Pilih provinsi lebih dulu."}>
                    <Combobox
                      value={d.city}
                      onChange={(v) => set({ city: v })}
                      options={[
                        { value: "", label: "— pilih —" },
                        ...kotaDi(d.province).map((k) => ({ value: k, label: k })),
                      ]}
                      disabled={!d.province}
                      emptyText="Pilih provinsi lebih dulu"
                      ariaLabel="Kabupaten/Kota"
                    />
                  </Isian>
                </>
              ) : (
                <Isian label="Kota">
                  <input style={kotak} value={d.city} onChange={(e) => set({ city: e.target.value })} />
                </Isian>
              )}

              <Isian label="Pendidikan terakhir">
                <Combobox
                  value={d.education}
                  onChange={(v) => set({ education: v })}
                  options={[
                    { value: "", label: "— pilih —" },
                    ...Object.entries(EDUCATION_LABEL).map(([value, label]) => ({ value, label })),
                  ]}
                  ariaLabel="Pendidikan terakhir"
                />
              </Isian>

              <Isian label="Kesibukan saat ini" hint="Mis. Pekerja, Mahasiswa, Ibu rumah tangga.">
                <input style={kotak} value={d.segment} onChange={(e) => set({ segment: e.target.value })} />
              </Isian>

              <Isian label="Alasan mengikuti program">
                <textarea
                  style={{ ...kotak, minHeight: 96, resize: "vertical" }}
                  value={d.reason}
                  onChange={(e) => set({ reason: e.target.value })}
                />
              </Isian>

              {/* --- pernyataan istiqomah --- */}
              <div
                style={{
                  border: "1px solid var(--color-forest)",
                  borderRadius: 11,
                  padding: 18,
                  background: "var(--color-mist, #eef2ee)",
                }}
              >
                <div className="eyebrow" style={{ marginBottom: 10 }}>
                  Pernyataan
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: serif,
                    fontSize: 17,
                    lineHeight: 1.65,
                    color: "var(--color-forest)",
                  }}
                >
                  {f.commitmentText}
                </p>
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    marginTop: 14,
                    fontSize: 15.5,
                    lineHeight: 1.55,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={setuju}
                    onChange={(e) => setSetuju(e.target.checked)}
                    style={{ marginTop: 3 }}
                  />
                  <span>Saya membaca dan menyetujui pernyataan di atas.</span>
                </label>
              </div>

              {err && (
                <div
                  role="alert"
                  style={{
                    padding: "12px 14px",
                    background: "#f7e6e0",
                    border: "1px solid #e8cdc3",
                    borderRadius: 8,
                    fontSize: 15,
                    lineHeight: 1.55,
                    color: "#8d4632",
                  }}
                >
                  {err}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  className="btn-solid-sm"
                  disabled={busy || !setuju}
                  style={{ opacity: busy || !setuju ? 0.55 : 1 }}
                >
                  {busy ? "Mengirim…" : "Kirim pendaftaran"}
                </button>
                {!setuju && (
                  <div style={{ fontSize: 13.5, color: "var(--color-faint)", marginTop: 9 }}>
                    Setujui pernyataan istiqomah untuk mengaktifkan tombol kirim.
                  </div>
                )}
              </div>
            </form>
          )}
        </Card>

        <div>
          {f.description && (
            <Card padding={26} tone="mist">
              <div className="eyebrow" style={{ marginBottom: 12 }}>
                Tentang program ini
              </div>
              <div
                style={{
                  fontSize: 16.5,
                  lineHeight: 1.75,
                  color: "var(--color-body)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {f.description}
              </div>
            </Card>
          )}
          <Card padding={26} style={{ marginTop: f.description ? 18 : 0 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              Setelah mendaftar
            </div>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 16, lineHeight: 1.75, color: "var(--color-body)" }}>
              <li>Anda menerima tautan grup WhatsApp sesuai ikhwan/akhwat.</li>
              <li>Tim akademik meninjau pendaftaran Anda.</li>
              <li>Pengumuman dan jadwal orientasi disampaikan lewat grup.</li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Daftar seluruh program yang pendaftarannya sedang terbit. */
export function DaftarIndex() {
  const forms = useResource<Form[]>("/daftar");

  return (
    <div className="shell" style={{ paddingBlock: "56px 80px" }}>
      <Eyebrow>Pendaftaran</Eyebrow>
      <h1 style={{ fontSize: 44, lineHeight: 1.1, marginTop: 16, maxWidth: 780 }}>
        Pilih program yang ingin Anda ikuti.
      </h1>
      <p style={{ fontSize: 17, lineHeight: 1.65, color: "var(--color-body)", maxWidth: 620, marginTop: 20 }}>
        Setiap program memiliki halaman pendaftarannya sendiri, lengkap dengan jadwal dan
        ketentuannya.
      </p>

      <div style={{ marginTop: 32 }}>
        {forms.loading && <div style={{ color: "var(--color-faint)" }}>Memuat…</div>}
        {forms.error && <div role="alert">{forms.error}</div>}
        {forms.data && forms.data.length === 0 && (
          <EmptyState
            title="Belum ada pendaftaran yang dibuka"
            hint="Silakan periksa kembali beberapa waktu lagi."
          />
        )}
        {forms.data && forms.data.length > 0 && (
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {forms.data.map((f) => (
              <Card key={f.id} padding={24}>
                <div className="eyebrow" style={{ marginBottom: 10 }}>
                  {f.programName}
                </div>
                <div style={{ fontFamily: serif, fontSize: 21, lineHeight: 1.3 }}>{f.title}</div>
                {f.headline && (
                  <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "var(--color-muted)", marginTop: 10 }}>
                    {f.headline}
                  </p>
                )}
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 12.5,
                    color: f.buka ? "var(--color-forest)" : "#8d4632",
                    marginTop: 14,
                  }}
                >
                  {f.buka ? "DIBUKA" : f.alasan.toUpperCase()}
                </div>
                <div style={{ marginTop: 16 }}>
                  <Link to={`/daftar/${f.slug}`} className={f.buka ? "btn-solid-sm" : "btn-sm"}>
                    {f.buka ? "Daftar sekarang →" : "Lihat detail"}
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
