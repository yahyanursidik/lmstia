import { useMemo, useState } from "react";
import { Link } from "react-router";
import { api } from "../../lib/api";
import { mutate, usePagedResource, useResource } from "../../lib/useApi";
import {
  Badge,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  mono,
  serif,
  type Column,
} from "../../components/ui";
import { Area, Field, FormPanel, Select, Text } from "../../components/form";
import { Combobox } from "../../components/Combobox";
import { Drawer } from "../../components/Drawer";
import { EDUCATION_LABEL } from "../../data/wilayah";

/**
 * Pengelolaan pendaftaran.
 *
 * Dua hal yang berbeda dikelola di satu tempat: formulir per program (tautan,
 * jadwal, pernyataan istiqomah, grup WhatsApp) dan kiriman pendaftar yang
 * masuk lewat formulir itu.
 */

type FormRow = {
  id: string;
  programId: string;
  programName: string;
  slug: string;
  title: string;
  headline: string | null;
  description: string | null;
  commitmentText: string;
  waIkhwanUrl: string | null;
  waAkhwatUrl: string | null;
  opensAt: string | null;
  closesAt: string | null;
  status: "draf" | "terbit" | "ditutup";
  pendaftar: number;
};

type Pendaftar = {
  id: string;
  formId: string;
  formTitle: string;
  programName: string;
  name: string;
  email: string;
  phone: string;
  gender: "ikhwan" | "akhwat";
  country: string | null;
  province: string | null;
  city: string | null;
  education: string | null;
  segment: string | null;
  reason: string | null;
  status: "menunggu" | "disetujui" | "ditolak";
  note: string | null;
  submittedAt: string;
};

type Program = { id: string; name: string };

const NADA_FORM: Record<string, { bg: string; fg: string }> = {
  draf: { bg: "#ece9e3", fg: "#6b6459" },
  terbit: { bg: "#e4ede4", fg: "#2f5638" },
  ditutup: { bg: "#f7e6e0", fg: "#8d4632" },
};

const NADA_DAFTAR: Record<string, { bg: string; fg: string }> = {
  menunggu: { bg: "#f6eddb", fg: "#8a6a25" },
  disetujui: { bg: "#e4ede4", fg: "#2f5638" },
  ditolak: { bg: "#f7e6e0", fg: "#8d4632" },
};

const STATUS_FORM = { draf: "Draf", terbit: "Terbit", ditutup: "Ditutup" };
/** Balasan persetujuan: apa yang benar-benar terjadi di balik tombol. */
type HasilTinjau = {
  userId: string;
  akunBaru: boolean;
  enrolBaru: boolean;
  sandiSementara: string | null;
  tanpaCaturwulan: boolean;
};

const STATUS_DAFTAR = { menunggu: "Menunggu", disetujui: "Disetujui", ditolak: "Ditolak" };
const GENDER = { ikhwan: "Ikhwan", akhwat: "Akhwat" };

const opsi = (rec: Record<string, string>, semua?: string) => [
  ...(semua ? [{ value: "", label: semua }] : []),
  ...Object.entries(rec).map(([value, label]) => ({ value, label })),
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

/** `datetime-local` bekerja dengan waktu lokal tanpa zona; ISO perlu dipangkas. */
const keInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const dariInput = (v: string) => (v ? new Date(v).toISOString() : null);

const tanggal = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function Pendaftaran() {
  const [tab, setTab] = useState<"formulir" | "pendaftar">("formulir");

  return (
    <>
      <PageHeader
        eyebrow="Administrasi"
        title="Pendaftaran"
        lead="Formulir pendaftaran per program beserta kiriman yang masuk."
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(
          [
            ["formulir", "Formulir Program"],
            ["pendaftar", "Pendaftar"],
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

      {tab === "formulir" ? <TabFormulir /> : <TabPendaftar />}
    </>
  );
}

/* --- Formulir ------------------------------------------------------- */

type Draf = Partial<FormRow> & { id?: string };

function TabFormulir() {
  const forms = useResource<FormRow[]>("/admin/registrations/forms");
  const programs = useResource<Program[]>("/admin/programs");
  const [draf, setDraf] = useState<Draf | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const baru = (): Draf => ({
    programId: "",
    slug: "",
    title: "",
    headline: "",
    description: "",
    commitmentText:
      "Saya berniat bersungguh-sungguh dan istiqomah mengikuti program ini sampai selesai, in syaa Allah.",
    waIkhwanUrl: "",
    waAkhwatUrl: "",
    opensAt: null,
    closesAt: null,
    status: "draf",
  });

  async function simpan() {
    if (!draf) return;
    setBusy(true);
    const body = {
      programId: draf.programId,
      slug: draf.slug,
      title: draf.title,
      headline: draf.headline || null,
      description: draf.description || null,
      commitmentText: draf.commitmentText,
      waIkhwanUrl: draf.waIkhwanUrl || null,
      waAkhwatUrl: draf.waAkhwatUrl || null,
      opensAt: draf.opensAt ?? null,
      closesAt: draf.closesAt ?? null,
      status: draf.status,
    };
    const m = await mutate(() =>
      draf.id
        ? api.patch(`/admin/registrations/forms/${draf.id}`, body)
        : api.post("/admin/registrations/forms", body),
    );
    setBusy(false);
    if (m) return setErr(m);
    setErr(null);
    setDraf(null);
    forms.reload();
  }

  async function hapus(id: string) {
    const m = await mutate(() => api.del(`/admin/registrations/forms/${id}`));
    if (m) return setErr(m);
    setErr(null);
    forms.reload();
  }

  const tautanPublik = (slug: string) =>
    `${window.location.origin}/daftar/${slug}`;

  return (
    <>
      {!draf && (
        <div style={{ marginBottom: 18 }}>
          <button type="button" className="btn-solid-sm" onClick={() => setDraf(baru())}>
            + Buat formulir pendaftaran
          </button>
        </div>
      )}

      {err && !draf && (
        <div role="alert" style={galat}>
          {err}
        </div>
      )}

      {draf && (
        <FormPanel
          title={draf.id ? `Ubah — ${draf.title}` : "Formulir pendaftaran baru"}
          error={err}
          busy={busy}
          onSubmit={simpan}
          onCancel={() => {
            setDraf(null);
            setErr(null);
          }}
        >
          <Field label="Program">
            <Combobox
              value={draf.programId ?? ""}
              onChange={(v) => {
                const p = (programs.data ?? []).find((x) => x.id === v);
                setDraf({
                  ...draf,
                  programId: v,
                  /* Judul dan tautan diisikan dari nama program, tetap bisa diubah. */
                  title: draf.title || (p ? `Pendaftaran ${p.name}` : ""),
                  slug: draf.slug || (p ? slugify(p.name) : ""),
                });
              }}
              options={(programs.data ?? []).map((p) => ({ value: p.id, label: p.name }))}
              loading={programs.loading}
              ariaLabel="Program"
            />
          </Field>

          <Field label="Status">
            <Select
              value={draf.status ?? "draf"}
              onChange={(v) => setDraf({ ...draf, status: v as FormRow["status"] })}
              options={opsi(STATUS_FORM)}
            />
          </Field>

          <Field label="Judul halaman" span>
            <Text value={draf.title ?? ""} onChange={(v) => setDraf({ ...draf, title: v })} />
          </Field>

          <Field
            label="Tautan unik"
            span
            hint={draf.slug ? tautanPublik(draf.slug) : "Huruf kecil, angka, dan tanda hubung."}
          >
            <Text value={draf.slug ?? ""} onChange={(v) => setDraf({ ...draf, slug: slugify(v) })} />
          </Field>

          <Field label="Kalimat pembuka" span>
            <Text value={draf.headline ?? ""} onChange={(v) => setDraf({ ...draf, headline: v })} />
          </Field>

          <Field label="Tentang program" span hint="Tampil di samping formulir.">
            <Area
              value={draf.description ?? ""}
              onChange={(v) => setDraf({ ...draf, description: v })}
            />
          </Field>

          <Field label="Pendaftaran dibuka">
            <input
              type="datetime-local"
              value={keInput(draf.opensAt ?? null)}
              onChange={(e) => setDraf({ ...draf, opensAt: dariInput(e.target.value) })}
              style={inputWaktu}
            />
          </Field>
          <Field label="Pendaftaran ditutup">
            <input
              type="datetime-local"
              value={keInput(draf.closesAt ?? null)}
              onChange={(e) => setDraf({ ...draf, closesAt: dariInput(e.target.value) })}
              style={inputWaktu}
            />
          </Field>

          <Field
            label="Pernyataan istiqomah"
            span
            hint="Harus disetujui pendaftar sebelum kiriman diterima."
          >
            <Area
              value={draf.commitmentText ?? ""}
              onChange={(v) => setDraf({ ...draf, commitmentText: v })}
            />
          </Field>

          <Field label="Grup WhatsApp Ikhwan" hint="https://chat.whatsapp.com/…">
            <Text
              value={draf.waIkhwanUrl ?? ""}
              onChange={(v) => setDraf({ ...draf, waIkhwanUrl: v })}
              placeholder="https://chat.whatsapp.com/…"
            />
          </Field>
          <Field label="Grup WhatsApp Akhwat" hint="https://chat.whatsapp.com/…">
            <Text
              value={draf.waAkhwatUrl ?? ""}
              onChange={(v) => setDraf({ ...draf, waAkhwatUrl: v })}
              placeholder="https://chat.whatsapp.com/…"
            />
          </Field>
        </FormPanel>
      )}

      <Card padding={20}>
        {forms.loading && <div style={{ color: "var(--color-faint)" }}>Memuat formulir…</div>}
        {forms.error && <div role="alert">{forms.error}</div>}
        {forms.data && forms.data.length === 0 && (
          <EmptyState
            title="Belum ada formulir pendaftaran"
            hint="Buat satu formulir untuk tiap program yang dibuka."
          />
        )}
        {forms.data && forms.data.length > 0 && (
          <div style={{ display: "grid", gap: 14 }}>
            {forms.data.map((f) => (
              <div
                key={f.id}
                style={{ border: "1px solid var(--color-line)", borderRadius: 11, padding: 18 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 14,
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="eyebrow" style={{ marginBottom: 6 }}>
                      {f.programName}
                    </div>
                    <div style={{ fontFamily: serif, fontSize: 20 }}>{f.title}</div>
                    <div
                      style={{
                        fontFamily: mono,
                        fontSize: 12.5,
                        color: "var(--color-faint)",
                        marginTop: 7,
                        wordBreak: "break-all",
                      }}
                    >
                      {tautanPublik(f.slug)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Badge bg={NADA_FORM[f.status].bg} fg={NADA_FORM[f.status].fg}>
                      {STATUS_FORM[f.status]}
                    </Badge>
                    <button
                      type="button"
                      className="btn-sm"
                      onClick={() => navigator.clipboard?.writeText(tautanPublik(f.slug))}
                    >
                      Salin tautan
                    </button>
                    <button type="button" className="btn-sm" onClick={() => setDraf({ ...f })}>
                      Ubah
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: 14,
                    marginTop: 16,
                    paddingTop: 14,
                    borderTop: "1px solid var(--color-line-soft, var(--color-line))",
                  }}
                >
                  <Info label="Dibuka" nilai={tanggal(f.opensAt)} />
                  <Info label="Ditutup" nilai={tanggal(f.closesAt)} />
                  <Info label="Pendaftar" nilai={String(f.pendaftar)} mono />
                  <Info label="Grup ikhwan" nilai={f.waIkhwanUrl ? "Terisi" : "Belum diisi"} />
                  <Info label="Grup akhwat" nilai={f.waAkhwatUrl ? "Terisi" : "Belum diisi"} />
                </div>

                <div style={{ marginTop: 14 }}>
                  <HapusDuaLangkah
                    label="Hapus formulir"
                    peringatan={
                      f.pendaftar > 0
                        ? `Formulir ini punya ${f.pendaftar} pendaftar. Menghapusnya ikut menghapus seluruh kiriman tersebut.`
                        : "Formulir akan dihapus permanen."
                    }
                    onConfirm={() => hapus(f.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

/* --- Pendaftar ------------------------------------------------------ */

function TabPendaftar() {
  const forms = useResource<FormRow[]>("/admin/registrations/forms");
  const [formId, setFormId] = useState("");
  const [status, setStatus] = useState("");
  const [gender, setGender] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [buka, setBuka] = useState<string | null>(null);
  const [catatan, setCatatan] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("perPage", "20");
    if (formId) p.set("formId", formId);
    if (status) p.set("status", status);
    if (gender) p.set("gender", gender);
    if (q.trim()) p.set("q", q.trim());
    return p.toString();
  }, [page, formId, status, gender, q]);

  const daftar = usePagedResource<Pendaftar[]>(`/admin/registrations?${query}`);
  const [hasil, setHasil] = useState<HasilTinjau | null>(null);
  const meta = daftar.meta;

  async function tinjau(id: string, s: "disetujui" | "ditolak") {
    setHasil(null);
    let balasan: HasilTinjau | null = null;
    const m = await mutate(async () => {
      balasan = await api.patch<HasilTinjau>(`/admin/registrations/${id}`, {
        status: s,
        note: catatan || null,
      });
    });
    if (m) return setErr(m);
    setErr(null);
    setCatatan("");
    /*
     * Panelnya sengaja dibiarkan terbuka. Menutupnya seketika membuat
     * persetujuan terasa tidak berakibat apa pun — padahal di baliknya akun
     * dibuat dan pendaftar didaftarkan ke caturwulan. Ringkasannya perlu
     * terbaca, terlebih kata sandi sementara yang hanya muncul sekali.
     */
    if (s === "disetujui" && balasan) setHasil(balasan);
    daftar.reload();
  }

  const terpilih = daftar.data?.find((r) => r.id === buka) ?? null;

  const kolom: Column<Pendaftar>[] = [
    {
      key: "nama",
      head: "PENDAFTAR",
      width: "1.6fr",
      render: (r) => (
        <button
          type="button"
          onClick={() => {
            setBuka(r.id);
            setCatatan(r.note ?? "");
            setHasil(null);
          }}
          style={tombolPolos}
        >
          <div style={{ fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3 }}>
            {r.name}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-faint)", marginTop: 2 }}>{r.email}</div>
        </button>
      ),
    },
    {
      key: "gender",
      head: "IKHWAN/AKHWAT",
      width: "1fr",
      render: (r) => <span style={{ fontSize: 14.5 }}>{GENDER[r.gender]}</span>,
    },
    {
      key: "program",
      head: "PROGRAM",
      width: "1.3fr",
      secondary: true,
      render: (r) => (
        <span style={{ fontSize: 14.5, color: "var(--color-muted)" }}>{r.programName}</span>
      ),
    },
    {
      key: "kirim",
      head: "DIKIRIM",
      width: "1fr",
      secondary: true,
      render: (r) => <span style={{ fontFamily: mono, fontSize: 13.5 }}>{tanggal(r.submittedAt)}</span>,
    },
    {
      key: "status",
      head: "STATUS",
      width: "1fr",
      render: (r) => (
        <Badge bg={NADA_DAFTAR[r.status].bg} fg={NADA_DAFTAR[r.status].fg}>
          {STATUS_DAFTAR[r.status]}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <Card padding={18} style={{ marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
              Cari
            </label>
            <input
              type="search"
              value={q}
              placeholder="Cari nama, email, nomor WA, atau kota…"
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              style={inputWaktu}
            />
          </div>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
              Formulir
            </label>
            <Combobox
              value={formId}
              onChange={(v) => {
                setFormId(v);
                setPage(1);
              }}
              options={[
                { value: "", label: "Semua formulir" },
                ...(forms.data ?? []).map((f) => ({ value: f.id, label: f.title, hint: f.programName })),
              ]}
              ariaLabel="Formulir"
            />
          </div>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
              Status
            </label>
            <Combobox
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              options={opsi(STATUS_DAFTAR, "Semua status")}
              searchable={false}
              ariaLabel="Status"
            />
          </div>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
              Ikhwan/Akhwat
            </label>
            <Combobox
              value={gender}
              onChange={(v) => {
                setGender(v);
                setPage(1);
              }}
              options={opsi(GENDER, "Semua")}
              searchable={false}
              ariaLabel="Ikhwan atau akhwat"
            />
          </div>
        </div>
      </Card>

      {err && (
        <div role="alert" style={galat}>
          {err}
        </div>
      )}

      {/* Rincian sebagai panel geser: tabel tetap di tempatnya. */}
      <Drawer
        open={!!terpilih}
        onClose={() => {
          setBuka(null);
          setCatatan("");
          setHasil(null);
        }}
        title={terpilih?.name ?? ""}
        subtitle={terpilih ? `${terpilih.email} · ${terpilih.phone}` : undefined}
        actions={
          terpilih ? (
            <>
              <button type="button" className="btn-solid-sm" onClick={() => tinjau(terpilih.id, "disetujui")}>
                Setujui
              </button>
              <button
                type="button"
                className="btn-sm"
                style={{ color: "#8d4632", borderColor: "#e8cdc3" }}
                onClick={() => tinjau(terpilih.id, "ditolak")}
              >
                Tolak
              </button>
            </>
          ) : undefined
        }
      >
        {terpilih && (
        <>
          {hasil && (
            <div
              role="status"
              style={{
                border: "1px solid #cfe0cf",
                background: "#eef5ee",
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 18,
                fontSize: 15,
                lineHeight: 1.6,
              }}
            >
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                Pendaftaran disetujui
              </div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>{hasil.akunBaru ? "Akun peserta dibuat." : "Sudah punya akun — pendaftaran ini disambungkan ke akun tersebut."}</li>
                <li>
                  {hasil.tanpaCaturwulan
                    ? "Belum ada caturwulan berjalan pada program ini, jadi enrolmen belum dibuat."
                    : hasil.enrolBaru
                      ? "Didaftarkan ke caturwulan yang sedang berjalan."
                      : "Sudah terdaftar pada caturwulan berjalan."}
                </li>
              </ul>
              {hasil.sandiSementara && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ marginBottom: 6 }}>
                    Kata sandi sementara — <strong>hanya ditampilkan sekali</strong>. Kirimkan ke
                    pendaftar, lalu minta ia menggantinya.
                  </div>
                  <code
                    style={{
                      display: "inline-block",
                      fontFamily: mono,
                      fontSize: 16,
                      letterSpacing: ".06em",
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-line)",
                      borderRadius: 7,
                      padding: "8px 12px",
                      userSelect: "all",
                    }}
                  >
                    {hasil.sandiSementara}
                  </code>
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <Link to="/admin/pengguna" className="btn-sm">
                  Lihat di Manajemen Pengguna →
                </Link>
              </div>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 15,
              marginBottom: 18,
            }}
          >
            <Info label="Program" nilai={terpilih.programName} />
            <Info label="Formulir" nilai={terpilih.formTitle} />
            <Info label="Ikhwan/Akhwat" nilai={GENDER[terpilih.gender]} />
            <Info label="Domisili" nilai={[terpilih.city, terpilih.province, terpilih.country].filter(Boolean).join(", ") || "—"} />
            <Info
              label="Pendidikan"
              nilai={terpilih.education ? EDUCATION_LABEL[terpilih.education] : "—"}
            />
            <Info label="Kesibukan" nilai={terpilih.segment ?? "—"} />
            <Info label="Dikirim" nilai={tanggal(terpilih.submittedAt)} mono />
          </div>

          {terpilih.reason && (
            <div style={{ marginBottom: 18 }}>
              <div className="eyebrow" style={{ marginBottom: 7 }}>
                Alasan mengikuti
              </div>
              <div style={{ fontSize: 16, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {terpilih.reason}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 7 }}>
              Catatan peninjauan
            </div>
            <Area value={catatan} onChange={setCatatan} />
          </div>

        </>
        )}
      </Drawer>

      <Card padding={20}>
        {daftar.loading && <div style={{ color: "var(--color-faint)" }}>Memuat pendaftar…</div>}
        {daftar.error && <div role="alert">{daftar.error}</div>}
        {daftar.data && (
          <>
            <DataTable columns={kolom} rows={daftar.data} empty="Belum ada pendaftar yang cocok" />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
                marginTop: 18,
                paddingTop: 16,
                borderTop: "1px solid var(--color-line)",
              }}
            >
              <div style={{ fontSize: 14.5, color: "var(--color-faint)" }}>
                {meta.total === 0
                  ? "Tidak ada data"
                  : `Menampilkan ${(page - 1) * meta.perPage + 1}–${Math.min(page * meta.perPage, meta.total)} dari ${meta.total} pendaftar`}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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
          </>
        )}
      </Card>
    </>
  );
}

/* --- potongan bersama ----------------------------------------------- */

const galat: React.CSSProperties = {
  marginBottom: 16,
  padding: "12px 14px",
  background: "#f7e6e0",
  border: "1px solid #e8cdc3",
  borderRadius: 8,
  fontSize: 15,
  color: "#8d4632",
};

const inputWaktu: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  border: "1px solid var(--color-line)",
  borderRadius: 9,
  background: "var(--color-surface)",
  fontSize: 15.5,
  fontFamily: "inherit",
  color: "var(--color-ink)",
};

const tombolPolos: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 0,
  textAlign: "left",
  cursor: "pointer",
  font: "inherit",
  color: "inherit",
};

function Info({ label, nilai, mono: pakaiMono }: { label: string; nilai: string; mono?: boolean }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontFamily: pakaiMono ? mono : undefined, wordBreak: "break-word" }}>
        {nilai}
      </div>
    </div>
  );
}

function HapusDuaLangkah({
  label,
  peringatan,
  onConfirm,
}: {
  label: string;
  peringatan: string;
  onConfirm: () => void;
}) {
  const [siap, setSiap] = useState(false);
  if (!siap) {
    return (
      <button type="button" className="btn-sm" onClick={() => setSiap(true)}>
        {label}
      </button>
    );
  }
  return (
    <div>
      <div style={{ fontSize: 14, color: "#8d4632", marginBottom: 9, lineHeight: 1.55 }}>
        {peringatan}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn-solid-sm"
          style={{ background: "#8d4632", borderColor: "#8d4632" }}
          onClick={onConfirm}
        >
          Ya, hapus permanen
        </button>
        <button type="button" className="btn-sm" onClick={() => setSiap(false)}>
          Batal
        </button>
      </div>
    </div>
  );
}
