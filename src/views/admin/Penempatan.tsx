import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { mutate, useResource } from "../../lib/useApi";
import { Card, EmptyState, PageHeader, mono } from "../../components/ui";
import { Field, Select } from "../../components/form";
import { HARI, ringkasJadwal } from "./Halaqoh";

/**
 * Penempatan peserta ke halaqoh.
 *
 * Layar kerja massal: pilih beberapa peserta sekaligus, lalu pindahkan ke
 * satu rombel. Pemindahan satu per satu sudah mungkin dari rincian halaqoh;
 * yang dibutuhkan di awal caturwulan adalah membagi puluhan orang sekaligus.
 */

type Program = { id: string; name: string };
type Tahapan = { id: string; name: string; programId: string };

type Halaqoh = {
  id: string;
  code: string;
  name: string;
  gender: "ikhwan" | "akhwat" | null;
  capacity: number | null;
  peserta: number;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  instructorName: string | null;
  status: string;
};

type Peserta = {
  enrollmentId: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  halaqohId: string | null;
  halaqohName: string | null;
  halaqohCode: string | null;
};

export default function Penempatan() {
  const programs = useResource<Program[]>("/programs");
  const [programId, setProgramId] = useState("");
  const tahapan = useResource<Tahapan[]>(programId ? `/tahapan?programId=${programId}` : "/tahapan");
  const [tahapanId, setTahapanId] = useState("");
  const [saring, setSaring] = useState<"semua" | "belum">("belum");

  const peserta = useResource<Peserta[]>(
    tahapanId
      ? `/admin/halaqoh/peserta/daftar?tahapanId=${tahapanId}${saring === "belum" ? "&belumDitempatkan=ya" : ""}`
      : null,
  );
  const halaqoh = useResource<Halaqoh[]>(
    tahapanId ? `/admin/halaqoh?tahapanId=${tahapanId}` : null,
  );

  const [pilih, setPilih] = useState<Set<string>>(new Set());
  const [tujuan, setTujuan] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [kabar, setKabar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const baris = peserta.data ?? [];
  const semuaTerpilih = baris.length > 0 && baris.every((p) => pilih.has(p.enrollmentId));

  const rombelTujuan = useMemo(
    () => (halaqoh.data ?? []).find((h) => h.id === tujuan) ?? null,
    [halaqoh.data, tujuan],
  );

  /**
   * Sisa tempat dihitung ulang di sini hanya untuk memberi peringatan lebih
   * awal. Keputusan sebenarnya tetap di server, yang memeriksanya terhadap
   * data terkini — angka di layar bisa saja sudah usang.
   */
  const sisa = rombelTujuan?.capacity === null || !rombelTujuan
    ? null
    : rombelTujuan.capacity - rombelTujuan.peserta;
  const kelebihan = sisa !== null && pilih.size > sisa;

  function alih(id: string) {
    setPilih((v) => {
      const b = new Set(v);
      if (b.has(id)) b.delete(id);
      else b.add(id);
      return b;
    });
  }

  function alihSemua() {
    setPilih(semuaTerpilih ? new Set() : new Set(baris.map((p) => p.enrollmentId)));
  }

  async function pindahkan(ke: string | null) {
    if (pilih.size === 0) return;
    setBusy(true);
    setKabar(null);
    const m = await mutate(() =>
      api.post("/admin/halaqoh/peserta/pindah", {
        enrollmentIds: [...pilih],
        halaqohId: ke,
      }),
    );
    setBusy(false);
    if (m) return setErr(m);
    setErr(null);
    setKabar(
      ke
        ? `${pilih.size} peserta dipindahkan ke ${rombelTujuan?.name ?? "halaqoh"}.`
        : `${pilih.size} peserta dikeluarkan dari rombelnya.`,
    );
    setPilih(new Set());
    peserta.reload();
    halaqoh.reload();
  }

  return (
    <>
      <PageHeader
        eyebrow="Akademik"
        title="Penempatan Peserta"
        lead="Bagi peserta satu caturwulan ke dalam halaqoh. Pilih beberapa sekaligus, lalu pindahkan."
      />

      <Card padding={18} style={{ marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <Field label="Program">
            <Select
              value={programId}
              onChange={(v) => {
                setProgramId(v);
                setTahapanId("");
                setPilih(new Set());
              }}
              options={[
                { value: "", label: "— semua program —" },
                ...(programs.data ?? []).map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </Field>
          <Field label="Caturwulan">
            <Select
              value={tahapanId}
              onChange={(v) => {
                setTahapanId(v);
                setPilih(new Set());
                setTujuan("");
              }}
              options={[
                { value: "", label: "— pilih caturwulan —" },
                ...(tahapan.data ?? []).map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
          </Field>
          <Field label="Tampilkan">
            <Select
              value={saring}
              onChange={(v) => {
                setSaring(v as "semua" | "belum");
                setPilih(new Set());
              }}
              options={[
                { value: "belum", label: "Belum ditempatkan" },
                { value: "semua", label: "Semua peserta" },
              ]}
            />
          </Field>
        </div>
      </Card>

      {!tahapanId && (
        <EmptyState
          title="Pilih caturwulan lebih dulu"
          hint="Penempatan selalu dalam satu caturwulan, karena di situlah halaqoh berada."
        />
      )}

      {err && (
        <div role="alert" className="alert-error" style={{ marginBottom: 14 }}>
          {err}
        </div>
      )}
      {kabar && (
        <div
          role="status"
          style={{
            border: "1px solid #cfe0cf",
            background: "#eef5ee",
            borderRadius: 10,
            padding: "12px 15px",
            marginBottom: 14,
            fontSize: 15,
          }}
        >
          {kabar}
        </div>
      )}

      {tahapanId && (
        <div
          className="split"
          style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, alignItems: "start" }}
        >
          {/* --- daftar peserta --- */}
          <Card padding={0}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 18px",
                borderBottom: "1px solid var(--color-line)",
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 15 }}>
                <input
                  type="checkbox"
                  checked={semuaTerpilih}
                  onChange={alihSemua}
                  disabled={baris.length === 0}
                  aria-label="Pilih semua peserta"
                />
                {pilih.size > 0 ? `${pilih.size} dipilih` : `${baris.length} peserta`}
              </label>
              {pilih.size > 0 && (
                <button type="button" className="btn-sm" onClick={() => setPilih(new Set())}>
                  Batalkan pilihan
                </button>
              )}
            </div>

            {peserta.loading && (
              <div style={{ padding: 18, color: "var(--color-faint)" }}>Memuat peserta…</div>
            )}
            {baris.length === 0 && !peserta.loading && (
              <div style={{ padding: 18 }}>
                <EmptyState
                  title={
                    saring === "belum"
                      ? "Semua peserta sudah punya halaqoh"
                      : "Belum ada peserta di caturwulan ini"
                  }
                />
              </div>
            )}

            <div>
              {baris.map((p) => (
                <label
                  key={p.enrollmentId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 18px",
                    borderBottom: "1px solid var(--color-line-soft)",
                    cursor: "pointer",
                    background: pilih.has(p.enrollmentId) ? "var(--color-mist)" : undefined,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={pilih.has(p.enrollmentId)}
                    onChange={() => alih(p.enrollmentId)}
                  />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontWeight: 600, display: "block" }}>{p.name}</span>
                    <span style={{ fontSize: 13.5, color: "var(--color-muted)" }}>
                      {p.email}
                      {p.city ? ` · ${p.city}` : ""}
                    </span>
                  </span>
                  <span style={{ fontFamily: mono, fontSize: 12.5, flex: "none" }}>
                    {p.halaqohCode ?? <span style={{ color: "var(--color-faint)" }}>belum</span>}
                  </span>
                </label>
              ))}
            </div>
          </Card>

          {/* --- tujuan --- */}
          <Card padding={20}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              Pindahkan ke
            </div>

            {(halaqoh.data ?? []).length === 0 ? (
              <EmptyState
                title="Caturwulan ini belum punya halaqoh"
                hint="Buat halaqoh lebih dulu di halaman Halaqoh & Rombel."
              />
            ) : (
              <>
                <Field label="Halaqoh tujuan">
                  <Select
                    value={tujuan}
                    onChange={setTujuan}
                    options={[
                      { value: "", label: "— pilih halaqoh —" },
                      ...(halaqoh.data ?? []).map((h) => ({
                        value: h.id,
                        label: `${h.name} (${h.peserta}${h.capacity ? `/${h.capacity}` : ""})`,
                      })),
                    ]}
                  />
                </Field>

                {rombelTujuan && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: "12px 14px",
                      border: "1px solid var(--color-line)",
                      borderRadius: 9,
                      fontSize: 14.5,
                      lineHeight: 1.6,
                    }}
                  >
                    <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>
                      {rombelTujuan.code}
                    </div>
                    <div>
                      {rombelTujuan.instructorName ?? "Belum ada ustadz"} ·{" "}
                      {rombelTujuan.gender
                        ? rombelTujuan.gender === "ikhwan"
                          ? "Ikhwan"
                          : "Akhwat"
                        : "Campuran"}
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 12.5 }}>
                      {ringkasJadwal(rombelTujuan)}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      Sisa tempat:{" "}
                      <strong>{sisa === null ? "tanpa batas" : sisa}</strong>
                    </div>
                  </div>
                )}

                {kelebihan && (
                  <div
                    role="alert"
                    style={{
                      marginTop: 12,
                      padding: "11px 14px",
                      border: "1px solid #e8cdc3",
                      background: "#faf0ec",
                      borderRadius: 9,
                      fontSize: 14.5,
                      lineHeight: 1.55,
                      color: "#8d4632",
                    }}
                  >
                    Anda memilih {pilih.size} peserta, sedangkan sisa tempatnya {sisa}.
                    Kurangi pilihan atau naikkan daya tampung halaqoh.
                  </div>
                )}

                <button
                  type="button"
                  className="btn-solid-sm"
                  style={{ marginTop: 16, width: "100%" }}
                  disabled={busy || pilih.size === 0 || !tujuan || kelebihan}
                  onClick={() => pindahkan(tujuan)}
                >
                  {busy ? "Memindahkan…" : `Pindahkan ${pilih.size || ""} peserta`}
                </button>

                <button
                  type="button"
                  className="btn-sm"
                  style={{ marginTop: 10, width: "100%" }}
                  disabled={busy || pilih.size === 0}
                  onClick={() => pindahkan(null)}
                >
                  Keluarkan dari rombel
                </button>
              </>
            )}

            {/* --- ringkasan daya tampung --- */}
            {(halaqoh.data ?? []).length > 0 && (
              <>
                <div className="eyebrow" style={{ margin: "24px 0 10px" }}>
                  Isi setiap halaqoh
                </div>
                <div style={{ display: "grid", gap: 7 }}>
                  {(halaqoh.data ?? []).map((h) => (
                    <div
                      key={h.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        fontSize: 14.5,
                      }}
                    >
                      <span style={{ minWidth: 0 }}>
                        {h.name}
                        <span
                          style={{
                            fontFamily: mono,
                            fontSize: 12,
                            color: "var(--color-faint)",
                            marginLeft: 7,
                          }}
                        >
                          {h.dayOfWeek ? HARI[h.dayOfWeek] : ""}
                        </span>
                      </span>
                      <span style={{ fontFamily: mono, fontSize: 13, flex: "none" }}>
                        {h.peserta}
                        {h.capacity ? `/${h.capacity}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
