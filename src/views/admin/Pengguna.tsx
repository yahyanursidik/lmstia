import { useEffect, useId, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import { mutate, usePagedResource, useResource } from "../../lib/useApi";
import { useAuth } from "../../lib/auth";
import { Badge, Card, DataTable, EmptyState, PageHeader, mono, serif, type Column } from "../../components/ui";
import { Area, Field, FormPanel, Select, Text } from "../../components/form";
import { Combobox } from "../../components/Combobox";
import {
  ACCOUNT_STATUS_LABEL,
  EDUCATION_LABEL,
  NEGARA,
  PROVINSI,
  ROLE_LABEL,
  kotaDi,
} from "../../data/wilayah";

/**
 * Manajemen Pengguna.
 *
 * Daftar dipenggal di server (paginasi), bukan dimuat seluruhnya lalu disaring
 * di browser — jumlah peserta akan terus bertambah dan pola itu cepat runtuh.
 * Penyaring program/caturwulan dan kata kunci ikut dikirim ke server agar cacah
 * total selalu cocok dengan isi halaman yang tampil.
 */

type Pengguna = {
  id: string;
  name: string;
  email: string;
  role: "student" | "instructor" | "academic_admin" | "super_admin";
  phone: string | null;
  country: string | null;
  province: string | null;
  city: string | null;
  education: string | null;
  accountStatus: "aktif" | "nonaktif" | "ditangguhkan";
  segment: string | null;
  title: string | null;
  bio: string | null;
  isDemo: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type Pendaftaran = {
  id: string;
  status: string;
  engagement: string;
  competency: string | null;
  progress: number;
  className: string | null;
  tahapanName: string;
  programName: string;
};

type Detail = Pengguna & { enrollments: Pendaftaran[] };
type Program = { id: string; name: string };
type Tahapan = { id: string; name: string; programId: string };

const NADA_STATUS: Record<string, { bg: string; fg: string }> = {
  aktif: { bg: "#e4ede4", fg: "#2f5638" },
  nonaktif: { bg: "#ece9e3", fg: "#6b6459" },
  ditangguhkan: { bg: "#f7e6e0", fg: "#8d4632" },
};

const NADA_PERAN: Record<string, { bg: string; fg: string }> = {
  student: { bg: "#ece9e3", fg: "#544e45" },
  instructor: { bg: "#e6ecef", fg: "#38525e" },
  academic_admin: { bg: "#f2e8da", fg: "#7a5326" },
  super_admin: { bg: "#1f3d34", fg: "#f6f2ea" },
};

const opsi = <T extends string>(rec: Record<string, string>, semua?: string) =>
  [
    ...(semua ? [{ value: "" as T, label: semua }] : []),
    ...Object.entries(rec).map(([value, label]) => ({ value: value as T, label })),
  ];

/* --- pencarian dengan saran ---------------------------------------- */

/**
 * Kotak cari yang memunculkan saran nama dari server sambil diketik.
 *
 * Permintaan ditunda 250 ms setelah ketikan terakhir, dan balasan yang datang
 * terlambat diabaikan — tanpa itu, hasil dari kata kunci lama bisa menimpa
 * hasil kata kunci yang lebih baru.
 */
function PencarianSaran({
  value,
  onChange,
  onPilih,
}: {
  value: string;
  onChange: (v: string) => void;
  onPilih: (id: string) => void;
}) {
  const id = useId();
  const [saran, setSaran] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [buka, setBuka] = useState(false);
  const [sorot, setSorot] = useState(-1);
  const wadah = useRef<HTMLDivElement>(null);
  const urutan = useRef(0);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setSaran([]);
      return;
    }
    const seri = ++urutan.current;
    const t = setTimeout(() => {
      api
        .get<typeof saran>(`/admin/users/suggest?q=${encodeURIComponent(q)}`)
        .then((d) => {
          if (seri === urutan.current) {
            setSaran(d);
            setSorot(-1);
          }
        })
        .catch(() => {
          if (seri === urutan.current) setSaran([]);
        });
    }, 250);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const luar = (e: MouseEvent) => {
      if (wadah.current && !wadah.current.contains(e.target as Node)) setBuka(false);
    };
    document.addEventListener("mousedown", luar);
    return () => document.removeEventListener("mousedown", luar);
  }, []);

  const tampil = buka && saran.length > 0;

  return (
    <div ref={wadah} style={{ position: "relative" }}>
      <input
        type="search"
        role="combobox"
        aria-expanded={tampil}
        aria-controls={id}
        aria-autocomplete="list"
        aria-activedescendant={sorot >= 0 ? `${id}-${sorot}` : undefined}
        value={value}
        placeholder="Cari nama, email, nomor WA, atau kota…"
        onChange={(e) => {
          onChange(e.target.value);
          setBuka(true);
        }}
        onFocus={() => setBuka(true)}
        onKeyDown={(e) => {
          if (!tampil) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSorot((s) => (s + 1) % saran.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSorot((s) => (s <= 0 ? saran.length - 1 : s - 1));
          } else if (e.key === "Enter" && sorot >= 0) {
            e.preventDefault();
            onPilih(saran[sorot].id);
            setBuka(false);
          } else if (e.key === "Escape") {
            setBuka(false);
          }
        }}
        style={{
          width: "100%",
          padding: "11px 13px",
          border: "1px solid var(--color-line)",
          borderRadius: 9,
          background: "var(--color-surface)",
          fontSize: 15.5,
          fontFamily: "inherit",
          color: "var(--color-ink)",
        }}
      />
      {tampil && (
        <ul
          id={id}
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 40,
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            margin: 0,
            padding: 4,
            listStyle: "none",
            background: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: 9,
            boxShadow: "0 10px 28px rgba(31,61,52,.13)",
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {saran.map((s, i) => (
            <li
              key={s.id}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === sorot}
              onMouseEnter={() => setSorot(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                onPilih(s.id);
                setBuka(false);
              }}
              style={{
                padding: "9px 11px",
                borderRadius: 7,
                cursor: "pointer",
                background: i === sorot ? "var(--color-paper)" : "transparent",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</div>
              <div style={{ fontSize: 13, color: "var(--color-faint)", marginTop: 2 }}>
                {s.email} · {ROLE_LABEL[s.role] ?? s.role}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* --- halaman -------------------------------------------------------- */

export default function Pengguna() {
  const { user: aktor } = useAuth();

  const [q, setQ] = useState("");
  const [peran, setPeran] = useState("");
  const [status, setStatus] = useState("");
  const [programId, setProgramId] = useState("");
  const [tahapanId, setTahapanId] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const [pilih, setPilih] = useState<string | null>(null);
  const [ubah, setUbah] = useState<Partial<Pengguna> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const programs = useResource<Program[]>("/admin/programs");
  const tahapan = useResource<Tahapan[]>("/admin/tahapan");

  /* Kata kunci ditunda agar tiap ketikan tidak memicu satu permintaan daftar. */
  const [qTunda, setQTunda] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQTunda(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("perPage", String(perPage));
    if (qTunda.trim()) p.set("q", qTunda.trim());
    if (peran) p.set("role", peran);
    if (status) p.set("accountStatus", status);
    if (tahapanId) p.set("tahapanId", tahapanId);
    else if (programId) p.set("programId", programId);
    return p.toString();
  }, [page, perPage, qTunda, peran, status, programId, tahapanId]);

  const daftar = usePagedResource<Pengguna[]>(`/admin/users?${query}`);
  const meta = daftar.meta;

  /* Setiap perubahan penyaring mengembalikan pembaca ke halaman pertama. */
  useEffect(() => setPage(1), [qTunda, peran, status, programId, tahapanId, perPage]);

  const detail = useResource<Detail>(pilih ? `/admin/users/${pilih}` : null);

  const tahapanProgram = useMemo(
    () => (tahapan.data ?? []).filter((t) => !programId || t.programId === programId),
    [tahapan.data, programId],
  );

  async function simpan() {
    if (!ubah || !pilih) return;
    setBusy(true);
    const body = {
      name: ubah.name,
      email: ubah.email,
      role: ubah.role,
      accountStatus: ubah.accountStatus,
      education: ubah.education || null,
      phone: ubah.phone || null,
      country: ubah.country || null,
      province: ubah.province || null,
      city: ubah.city || null,
      segment: ubah.segment || null,
      title: ubah.title || null,
      bio: ubah.bio || null,
    };
    const m = await mutate(() => api.patch(`/admin/users/${pilih}`, body));
    setBusy(false);
    if (m) return setErr(m);
    setErr(null);
    setUbah(null);
    detail.reload();
    daftar.reload();
  }

  async function hapus(id: string) {
    const m = await mutate(() => api.del(`/admin/users/${id}`));
    if (m) return setErr(m);
    setErr(null);
    setPilih(null);
    daftar.reload();
  }

  const kolom: Column<Pengguna>[] = [
    {
      key: "nama",
      head: "PENGGUNA",
      width: "1.6fr",
      render: (u) => (
        <button
          type="button"
          onClick={() => {
            setPilih(u.id);
            setUbah(null);
            setErr(null);
          }}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            textAlign: "left",
            cursor: "pointer",
            font: "inherit",
            color: "inherit",
          }}
        >
          <div style={{ fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3 }}>
            {u.name}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-faint)", marginTop: 2 }}>{u.email}</div>
        </button>
      ),
    },
    {
      key: "peran",
      head: "PERAN",
      width: "1fr",
      render: (u) => (
        <Badge bg={NADA_PERAN[u.role].bg} fg={NADA_PERAN[u.role].fg}>
          {ROLE_LABEL[u.role]}
        </Badge>
      ),
    },
    {
      key: "wa",
      head: "NOMOR WA",
      width: "1fr",
      secondary: true,
      render: (u) => (
        <span style={{ fontFamily: mono, fontSize: 14 }}>{u.phone ?? "—"}</span>
      ),
    },
    {
      key: "domisili",
      head: "DOMISILI",
      width: "1.3fr",
      secondary: true,
      render: (u) => (
        <span style={{ fontSize: 14.5, color: "var(--color-muted)" }}>
          {u.city ?? u.province ?? u.country ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      head: "STATUS AKUN",
      width: "1fr",
      render: (u) => (
        <Badge bg={NADA_STATUS[u.accountStatus].bg} fg={NADA_STATUS[u.accountStatus].fg}>
          {ACCOUNT_STATUS_LABEL[u.accountStatus]}
        </Badge>
      ),
    },
  ];

  const d = detail.data;
  const negaraIndonesia = (ubah?.country ?? "Indonesia") === "Indonesia";

  /*
   * Penjaga di klien ini hanya demi kejelasan pesan; yang menegakkan aturan
   * tetap server, yang menolak pengajar dengan 403 pada setiap rute pengguna.
   */
  if (aktor && aktor.role !== "academic_admin" && aktor.role !== "super_admin") {
    return (
      <>
        <PageHeader eyebrow="Administrasi" title="Manajemen Pengguna" />
        <EmptyState
          title="Halaman ini khusus admin akademik"
          hint="Data pribadi peserta — nomor WhatsApp, domisili, pendidikan — hanya dapat dilihat oleh admin akademik dan super admin."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Administrasi"
        title="Manajemen Pengguna"
        lead="Profil, kontak, domisili, peran, dan status akun seluruh pengguna portal."
      />

      {/* --- penyaring --- */}
      <Card padding={18} style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 14,
          }}
        >
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
              Cari
            </label>
            <PencarianSaran
              value={q}
              onChange={setQ}
              onPilih={(id) => {
                setPilih(id);
                setUbah(null);
              }}
            />
          </div>

          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
              Peran
            </label>
            <Combobox
              value={peran}
              onChange={setPeran}
              options={opsi(ROLE_LABEL, "Semua peran")}
              searchable={false}
              ariaLabel="Peran"
            />
          </div>

          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
              Status akun
            </label>
            <Combobox
              value={status}
              onChange={setStatus}
              options={opsi(ACCOUNT_STATUS_LABEL, "Semua status")}
              searchable={false}
              ariaLabel="Status akun"
            />
          </div>

          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
              Program
            </label>
            <Combobox
              value={programId}
              onChange={(v) => {
                setProgramId(v);
                setTahapanId("");
              }}
              options={[
                { value: "", label: "Semua program" },
                ...(programs.data ?? []).map((p) => ({ value: p.id, label: p.name })),
              ]}
              loading={programs.loading}
              ariaLabel="Program"
            />
          </div>

          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>
              Caturwulan
            </label>
            <Combobox
              value={tahapanId}
              onChange={setTahapanId}
              options={[
                { value: "", label: programId ? "Semua caturwulan" : "Semua caturwulan" },
                ...tahapanProgram.map((t) => ({ value: t.id, label: t.name })),
              ]}
              loading={tahapan.loading}
              emptyText="Program ini belum punya caturwulan"
              ariaLabel="Caturwulan"
            />
          </div>
        </div>
      </Card>

      {err && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: "12px 14px",
            background: "#f7e6e0",
            border: "1px solid #e8cdc3",
            borderRadius: 8,
            fontSize: 15,
            color: "#8d4632",
          }}
        >
          {err}
        </div>
      )}

      {/* --- detail & ubah --- */}
      {pilih && (
        <Card padding={22} style={{ marginBottom: 20 }}>
          {detail.loading && <div style={{ color: "var(--color-faint)" }}>Memuat profil…</div>}
          {detail.error && <div role="alert">{detail.error}</div>}

          {d && !ubah && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                  marginBottom: 18,
                }}
              >
                <div>
                  <div style={{ fontFamily: serif, fontSize: 24 }}>{d.name}</div>
                  <div style={{ fontSize: 14.5, color: "var(--color-faint)", marginTop: 4 }}>
                    {d.email}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <button type="button" className="btn-solid-sm" onClick={() => setUbah({ ...d })}>
                    Ubah
                  </button>
                  <button type="button" className="btn-sm" onClick={() => setPilih(null)}>
                    Tutup
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16,
                  marginBottom: 20,
                }}
              >
                <Baris label="Peran" nilai={ROLE_LABEL[d.role]} />
                <Baris label="Status akun" nilai={ACCOUNT_STATUS_LABEL[d.accountStatus]} />
                <Baris label="Nomor WhatsApp" nilai={d.phone} mono />
                <Baris label="Negara" nilai={d.country} />
                <Baris label="Provinsi" nilai={d.province} />
                <Baris label="Kabupaten/Kota" nilai={d.city} />
                <Baris
                  label="Pendidikan terakhir"
                  nilai={d.education ? EDUCATION_LABEL[d.education] : null}
                />
                <Baris label="Segmen" nilai={d.segment} />
                <Baris label="Jabatan" nilai={d.title} />
                <Baris
                  label="Terakhir masuk"
                  nilai={d.lastLoginAt ? new Date(d.lastLoginAt).toLocaleString("id-ID") : null}
                />
              </div>

              <div className="eyebrow" style={{ marginBottom: 10 }}>
                Pendaftaran
              </div>
              {d.enrollments.length === 0 ? (
                <EmptyState title="Belum terdaftar pada caturwulan mana pun" />
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {d.enrollments.map((e) => (
                    <div
                      key={e.id}
                      style={{
                        border: "1px solid var(--color-line)",
                        borderRadius: 9,
                        padding: "12px 14px",
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{e.tahapanName}</div>
                      <div style={{ fontSize: 13.5, color: "var(--color-faint)", marginTop: 3 }}>
                        {e.programName}
                        {e.className ? ` · ${e.className}` : ""} · {e.status} · progres {e.progress}%
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {aktor?.id !== d.id && (
                <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--color-line)" }}>
                  <div style={{ fontSize: 14, color: "var(--color-faint)", marginBottom: 10, lineHeight: 1.55 }}>
                    Menghapus pengguna ikut menghapus pendaftaran, progres materi, dan nilainya.
                    Tindakan ini tidak dapat dibatalkan.
                  </div>
                  <TombolHapus onConfirm={() => hapus(d.id)} />
                </div>
              )}
            </>
          )}

          {d && ubah && (
            <FormPanel
              title={`Ubah — ${d.name}`}
              error={err}
              busy={busy}
              onSubmit={simpan}
              onCancel={() => {
                setUbah(null);
                setErr(null);
              }}
            >
              <Field label="Nama lengkap">
                <Text value={ubah.name ?? ""} onChange={(v) => setUbah({ ...ubah, name: v })} />
              </Field>
              <Field label="Email">
                <Text
                  type="email"
                  value={ubah.email ?? ""}
                  onChange={(v) => setUbah({ ...ubah, email: v })}
                />
              </Field>

              <Field label="Peran">
                <Select
                  value={(ubah.role ?? "student") as string}
                  onChange={(v) => setUbah({ ...ubah, role: v as Pengguna["role"] })}
                  options={opsi(ROLE_LABEL)}
                />
              </Field>
              <Field label="Status akun">
                <Select
                  value={(ubah.accountStatus ?? "aktif") as string}
                  onChange={(v) => setUbah({ ...ubah, accountStatus: v as Pengguna["accountStatus"] })}
                  options={opsi(ACCOUNT_STATUS_LABEL)}
                />
              </Field>

              <Field label="Nomor WhatsApp" hint="Boleh dengan +62 atau 0 di depan.">
                <Text
                  value={ubah.phone ?? ""}
                  onChange={(v) => setUbah({ ...ubah, phone: v })}
                  placeholder="+62 812-3456-7890"
                />
              </Field>
              <Field label="Pendidikan terakhir">
                <Select
                  value={ubah.education ?? ""}
                  onChange={(v) => setUbah({ ...ubah, education: v })}
                  options={opsi(EDUCATION_LABEL, "— belum diisi —")}
                />
              </Field>

              <Field label="Negara">
                <Combobox
                  value={ubah.country ?? ""}
                  onChange={(v) =>
                    setUbah({
                      ...ubah,
                      country: v,
                      /* Provinsi dan kota Indonesia tidak berlaku untuk negara lain. */
                      ...(v === "Indonesia" ? {} : { province: null }),
                      city: null,
                    })
                  }
                  options={[
                    { value: "", label: "— belum diisi —" },
                    ...NEGARA.map((n) => ({ value: n, label: n })),
                  ]}
                  ariaLabel="Negara"
                />
              </Field>

              {negaraIndonesia ? (
                <>
                  <Field label="Provinsi">
                    <Combobox
                      value={ubah.province ?? ""}
                      onChange={(v) => setUbah({ ...ubah, province: v, city: null })}
                      options={[
                        { value: "", label: "— belum diisi —" },
                        ...PROVINSI.map((p) => ({ value: p, label: p })),
                      ]}
                      ariaLabel="Provinsi"
                    />
                  </Field>
                  <Field
                    label="Kabupaten/Kota"
                    hint={ubah.province ? undefined : "Pilih provinsi lebih dulu."}
                  >
                    <Combobox
                      value={ubah.city ?? ""}
                      onChange={(v) => setUbah({ ...ubah, city: v })}
                      options={[
                        { value: "", label: "— belum diisi —" },
                        ...kotaDi(ubah.province).map((k) => ({ value: k, label: k })),
                      ]}
                      disabled={!ubah.province}
                      emptyText="Pilih provinsi lebih dulu"
                      ariaLabel="Kabupaten/Kota"
                    />
                  </Field>
                </>
              ) : (
                <Field label="Kota" span hint="Untuk negara selain Indonesia, tulis kota secara bebas.">
                  <Text value={ubah.city ?? ""} onChange={(v) => setUbah({ ...ubah, city: v })} />
                </Field>
              )}

              <Field label="Segmen" hint="Mis. Pekerja, Mahasiswa, Ibu rumah tangga.">
                <Text value={ubah.segment ?? ""} onChange={(v) => setUbah({ ...ubah, segment: v })} />
              </Field>

              <Field label="Jabatan" hint="Tampil publik di halaman Pengajar.">
                <Text
                  value={ubah.title ?? ""}
                  onChange={(v) => setUbah({ ...ubah, title: v })}
                  placeholder="Mis. Pengampu Bahasa Arab 01"
                />
              </Field>

              <Field label="Profil singkat" span hint="Tampil publik — bukan tempat catatan internal.">
                <Area value={ubah.bio ?? ""} onChange={(v) => setUbah({ ...ubah, bio: v })} />
              </Field>
            </FormPanel>
          )}
        </Card>
      )}

      {/* --- daftar --- */}
      <Card padding={20}>
        {daftar.loading && <div style={{ color: "var(--color-faint)" }}>Memuat pengguna…</div>}
        {daftar.error && <div role="alert">{daftar.error}</div>}
        {daftar.data && (
          <>
            <DataTable
              columns={kolom}
              rows={daftar.data}
              empty="Tidak ada pengguna yang cocok dengan penyaring ini"
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
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
                  : `Menampilkan ${(page - 1) * perPage + 1}–${Math.min(page * perPage, meta.total)} dari ${meta.total} pengguna`}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <label style={{ fontSize: 14, color: "var(--color-faint)" }}>
                  Baris
                  <select
                    value={perPage}
                    onChange={(e) => setPerPage(Number(e.target.value))}
                    style={{
                      marginLeft: 7,
                      padding: "5px 8px",
                      borderRadius: 7,
                      border: "1px solid var(--color-line)",
                      background: "var(--color-surface)",
                      fontFamily: "inherit",
                      fontSize: 14,
                      color: "var(--color-ink)",
                    }}
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>

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

function Baris({ label, nilai, mono: pakaiMono }: { label: string; nilai?: string | null; mono?: boolean }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontSize: 15.5, fontFamily: pakaiMono ? mono : undefined }}>
        {nilai || <span style={{ color: "var(--color-faint)" }}>—</span>}
      </div>
    </div>
  );
}

/** Hapus dua langkah — sekali klik tidak boleh cukup untuk tindakan permanen. */
function TombolHapus({ onConfirm }: { onConfirm: () => void }) {
  const [siap, setSiap] = useState(false);
  if (!siap) {
    return (
      <button type="button" className="btn-sm" onClick={() => setSiap(true)}>
        Hapus pengguna
      </button>
    );
  }
  return (
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
  );
}
