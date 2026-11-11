import { useState } from "react";
import { api } from "../../lib/api";
import { mutate, useResource } from "../../lib/useApi";
import { Badge, mono } from "../../components/ui";
import { Area, Select } from "../../components/form";

/**
 * Dua panel di dalam rincian pendaftar: pembayaran dan penempatan halaqoh.
 *
 * Dipisahkan dari `Pendaftaran.tsx` karena keduanya mengambil datanya
 * sendiri. Menaruhnya sebaris akan memaksa halaman induk memuat bukti
 * transfer dan daftar halaqoh untuk setiap baris tabel, padahal keduanya
 * hanya berguna saat satu pendaftar sedang dibuka.
 */

export type StatusBayar =
  | "belum_bayar"
  | "menunggu_verifikasi"
  | "lunas"
  | "dibebaskan"
  | "ditolak";

export type PendaftarRingkas = {
  id: string;
  name: string;
  userId: string | null;
  paymentStatus: StatusBayar;
  feeAmount: number | null;
  paymentNote: string | null;
};

type Bukti = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  tautan: string | null;
};

type HalaqohRingkas = {
  id: string;
  name: string;
  peserta: number;
  capacity: number | null;
};

type Enrolmen = {
  id: string;
  tahapanId: string;
  tahapanName: string;
  halaqohId: string | null;
};

export const BAYAR_LABEL: Record<StatusBayar, string> = {
  belum_bayar: "Belum dibayar",
  menunggu_verifikasi: "Menunggu verifikasi",
  lunas: "Lunas",
  dibebaskan: "Dibebaskan",
  ditolak: "Bukti ditolak",
};

export const BAYAR_NADA: Record<StatusBayar, { bg: string; fg: string }> = {
  belum_bayar: { bg: "#f7eddc", fg: "#8a6520" },
  menunggu_verifikasi: { bg: "#e7eaf0", fg: "#44506b" },
  lunas: { bg: "#e4ede4", fg: "#2f5638" },
  dibebaskan: { bg: "#e4ede4", fg: "#2f5638" },
  ditolak: { bg: "#faf0ec", fg: "#8d4632" },
};

const rupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");

const kotak: React.CSSProperties = {
  border: "1px solid var(--color-line)",
  borderRadius: 10,
  padding: "16px 18px",
  marginBottom: 18,
};

/**
 * Pembayaran satu pendaftar: melihat bukti dan memutuskan.
 *
 * Buktinya baru diambil saat tombolnya ditekan. Berkasnya ikut dalam
 * balasan, jadi menariknya lebih awal berarti memindahkan gambar yang belum
 * tentu dilihat.
 */
export function PanelPembayaran({
  pendaftar,
  onBerubah,
}: {
  pendaftar: PendaftarRingkas;
  onBerubah: () => void;
}) {
  const [lihat, setLihat] = useState(false);
  const bukti = useResource<Bukti>(lihat ? `/admin/registrations/${pendaftar.id}/bukti` : null);
  const [catatan, setCatatan] = useState(pendaftar.paymentNote ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nada = BAYAR_NADA[pendaftar.paymentStatus];

  async function putuskan(status: StatusBayar) {
    setBusy(true);
    const m = await mutate(() =>
      api.patch(`/admin/registrations/${pendaftar.id}/pembayaran`, {
        paymentStatus: status,
        paymentNote: catatan || null,
      }),
    );
    setBusy(false);
    if (m) return setErr(m);
    setErr(null);
    onBerubah();
  }

  return (
    <div style={kotak}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <span className="eyebrow">Pembayaran</span>
        <Badge bg={nada.bg} fg={nada.fg}>
          {BAYAR_LABEL[pendaftar.paymentStatus]}
        </Badge>
      </div>

      <div style={{ fontSize: 15.5, marginBottom: 12 }}>
        {pendaftar.feeAmount === null ? (
          <span style={{ color: "var(--color-muted)" }}>Program ini tanpa biaya.</span>
        ) : (
          <>
            Biaya <strong>{rupiah(pendaftar.feeAmount)}</strong>
          </>
        )}
      </div>

      {pendaftar.feeAmount !== null && (
        <>
          {!lihat ? (
            <button type="button" className="btn-sm" onClick={() => setLihat(true)}>
              Lihat bukti transfer
            </button>
          ) : (
            <div style={{ marginBottom: 14 }}>
              {bukti.loading && <span style={{ color: "var(--color-faint)" }}>Memuat bukti…</span>}
              {bukti.error && (
                <span style={{ color: "var(--color-muted)" }}>
                  Pendaftar belum mengirim bukti transfer.
                </span>
              )}
              {bukti.data?.tautan && (
                <>
                  <div
                    style={{
                      fontFamily: mono,
                      fontSize: 12.5,
                      color: "var(--color-faint)",
                      marginBottom: 8,
                    }}
                  >
                    {bukti.data.fileName} · {Math.round(bukti.data.sizeBytes / 1024)} KB ·{" "}
                    {new Date(bukti.data.uploadedAt).toLocaleString("id-ID")}
                  </div>
                  {bukti.data.contentType === "application/pdf" ? (
                    <a
                      href={bukti.data.tautan}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-sm"
                    >
                      Buka PDF →
                    </a>
                  ) : (
                    <a href={bukti.data.tautan} target="_blank" rel="noopener noreferrer">
                      <img
                        src={bukti.data.tautan}
                        alt={"Bukti transfer " + pendaftar.name}
                        style={{
                          maxWidth: "100%",
                          maxHeight: 320,
                          borderRadius: 8,
                          border: "1px solid var(--color-line)",
                        }}
                      />
                    </a>
                  )}
                </>
              )}
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 7 }}>
              Catatan pembayaran
            </div>
            <Area value={catatan} onChange={setCatatan} rows={2} />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-solid-sm"
              disabled={busy}
              onClick={() => putuskan("lunas")}
            >
              Tandai lunas
            </button>
            <button
              type="button"
              className="btn-sm"
              disabled={busy}
              onClick={() => putuskan("ditolak")}
              style={{ color: "#8d4632", borderColor: "#e8cdc3" }}
            >
              Tolak bukti
            </button>
            <button
              type="button"
              className="btn-sm"
              disabled={busy}
              onClick={() => putuskan("dibebaskan")}
            >
              Bebaskan biaya
            </button>
          </div>

          {err && (
            <div role="alert" className="alert-error" style={{ marginTop: 12 }}>
              {err}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Penempatan pendaftar ke halaqoh, langsung dari pengelolaan pendaftaran.
 *
 * Caturwulannya diturunkan dari keikutsertaan peserta itu sendiri, bukan
 * dipilih ulang oleh admin — sehingga tidak mungkin memindahkannya ke rombel
 * milik caturwulan lain.
 */
export function PanelPenempatan({ pendaftar }: { pendaftar: PendaftarRingkas }) {
  const profil = useResource<{ enrollments: Enrolmen[] }>(
    pendaftar.userId ? `/admin/users/${pendaftar.userId}` : null,
  );
  const ikut = profil.data?.enrollments?.[0] ?? null;
  const halaqoh = useResource<HalaqohRingkas[]>(
    ikut ? `/admin/halaqoh?tahapanId=${ikut.tahapanId}` : null,
  );

  const [tujuan, setTujuan] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [kabar, setKabar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sekarang = (halaqoh.data ?? []).find((h) => h.id === ikut?.halaqohId) ?? null;

  async function pindahkan() {
    if (!ikut) return;
    setBusy(true);
    setKabar(null);
    const m = await mutate(() =>
      api.post("/admin/halaqoh/peserta/pindah", {
        enrollmentIds: [ikut.id],
        halaqohId: tujuan || null,
      }),
    );
    setBusy(false);
    if (m) return setErr(m);
    setErr(null);
    setKabar(tujuan ? "Peserta dipindahkan." : "Peserta dikeluarkan dari rombel.");
    profil.reload();
    halaqoh.reload();
  }

  if (!pendaftar.userId) {
    return (
      <div style={{ ...kotak, fontSize: 14.5, color: "var(--color-muted)" }}>
        <span className="eyebrow">Halaqoh</span>
        <div style={{ marginTop: 6 }}>
          Setujui pendaftaran ini lebih dulu — penempatan baru mungkin setelah peserta punya akun
          dan terdaftar pada caturwulan.
        </div>
      </div>
    );
  }

  return (
    <div style={kotak}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        Halaqoh
      </div>

      {!ikut ? (
        <div style={{ fontSize: 14.5, color: "var(--color-muted)" }}>
          Peserta belum terdaftar pada caturwulan mana pun.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 15.5, marginBottom: 12 }}>
            {ikut.tahapanName} ·{" "}
            {sekarang ? (
              <strong>{sekarang.name}</strong>
            ) : (
              <span style={{ color: "var(--color-faint)" }}>belum ditempatkan</span>
            )}
          </div>

          {(halaqoh.data ?? []).length === 0 ? (
            <div style={{ fontSize: 14.5, color: "var(--color-muted)" }}>
              Caturwulan ini belum punya halaqoh.
            </div>
          ) : (
            <div style={{ display: "flex", gap: 9, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 190 }}>
                <Select
                  value={tujuan}
                  onChange={setTujuan}
                  options={[
                    { value: "", label: "— keluarkan dari rombel —" },
                    ...(halaqoh.data ?? []).map((h) => ({
                      value: h.id,
                      label: `${h.name} (${h.peserta}${h.capacity ? "/" + h.capacity : ""})`,
                    })),
                  ]}
                />
              </div>
              <button
                type="button"
                className="btn-solid-sm"
                disabled={busy}
                onClick={pindahkan}
                style={{ flex: "none" }}
              >
                Pindahkan
              </button>
            </div>
          )}

          {err && (
            <div role="alert" className="alert-error" style={{ marginTop: 12 }}>
              {err}
            </div>
          )}
          {kabar && (
            <div style={{ marginTop: 10, fontSize: 14.5, color: "var(--color-forest)" }}>
              {kabar}
            </div>
          )}
        </>
      )}
    </div>
  );
}
