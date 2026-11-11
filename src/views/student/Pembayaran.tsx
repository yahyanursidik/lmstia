import { useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { useResource } from "../../lib/useApi";
import { Badge, Card, EmptyState, PageHeader, mono } from "../../components/ui";

/**
 * Tagihan peserta dan pengiriman bukti transfer.
 *
 * Nomor rekening hanya muncul di sini, bukan di halaman publik: ia diberikan
 * kepada orang yang memang sudah terdaftar. Berkasnya diubah menjadi base64
 * di peramban lalu dikirim sebagai JSON — ukurannya dibatasi 2 MB, dan pada
 * ukuran itu multipart tidak memberi keuntungan apa pun sementara Netlify
 * Functions menyerahkan badan permintaan sebagai satu string.
 */

type Tagihan = {
  id: string;
  programName: string;
  formTitle: string;
  feeAmount: number | null;
  paymentStatus: "belum_bayar" | "menunggu_verifikasi" | "lunas" | "dibebaskan" | "ditolak";
  paymentNote: string | null;
  paidAt: string | null;
  paymentVerifiedAt: string | null;
  submittedAt: string;
  dueDays: number;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  bankNote: string | null;
  sudahAdaBukti: boolean;
};

const STATUS: Record<Tagihan["paymentStatus"], { label: string; bg: string; fg: string }> = {
  belum_bayar: { label: "Belum dibayar", bg: "#f7eddc", fg: "#8a6520" },
  menunggu_verifikasi: { label: "Menunggu verifikasi", bg: "#e7eaf0", fg: "#44506b" },
  lunas: { label: "Lunas", bg: "#e4ede4", fg: "#2f5638" },
  dibebaskan: { label: "Dibebaskan", bg: "#e4ede4", fg: "#2f5638" },
  ditolak: { label: "Bukti ditolak", bg: "#faf0ec", fg: "#8d4632" },
};

const JENIS = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAKS_BYTE = 2 * 1024 * 1024;

const rupiah = (n: number) => "Rp" + n.toLocaleString("id-ID");

const tanggal = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : null;

/** Tenggat = tanggal mendaftar + masa tenggang formulir. */
function tenggat(t: Tagihan) {
  const d = new Date(t.submittedAt);
  d.setDate(d.getDate() + t.dueDays);
  return d;
}

export default function Pembayaran() {
  const daftar = useResource<Tagihan[]>("/me/pembayaran");

  return (
    <div className="shell" style={{ paddingBlock: "34px 70px" }}>
      <PageHeader
        eyebrow="Pembayaran"
        title="Tagihan Saya"
        lead="Rincian biaya program yang Anda ikuti, beserta tempat mengirimkan bukti transfer."
      />

      {daftar.loading && <div style={{ color: "var(--color-faint)" }}>Memuat tagihan…</div>}
      {daftar.error && <div role="alert">{daftar.error}</div>}

      {daftar.data && daftar.data.length === 0 && (
        <EmptyState
          title="Belum ada tagihan"
          hint="Program yang Anda ikuti tidak memungut biaya, atau Anda belum mendaftar pada program berbayar."
        />
      )}

      <div style={{ display: "grid", gap: 18 }}>
        {(daftar.data ?? []).map((t) => (
          <KartuTagihan key={t.id} t={t} onBerubah={() => daftar.reload()} />
        ))}
      </div>
    </div>
  );
}

function KartuTagihan({ t, onBerubah }: { t: Tagihan; onBerubah: () => void }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [kabar, setKabar] = useState<string | null>(null);
  const berkasRef = useRef<HTMLInputElement>(null);

  const s = STATUS[t.paymentStatus];
  const selesai = t.paymentStatus === "lunas" || t.paymentStatus === "dibebaskan";
  const bolehKirim = !selesai && t.feeAmount !== null;

  async function kirim(file: File) {
    setErr(null);
    setKabar(null);

    if (!JENIS.includes(file.type)) {
      return setErr("Bukti transfer harus berupa JPG, PNG, WebP, atau PDF.");
    }
    if (file.size > MAKS_BYTE) {
      return setErr(
        `Ukuran berkas ${(file.size / 1024 / 1024).toFixed(1)} MB melebihi batas 2 MB. Perkecil dulu gambarnya.`,
      );
    }

    setBusy(true);
    try {
      /* FileReader menghasilkan data URL; awalannya dibuang karena server
         hanya menerima isi base64-nya. */
      const base64 = await new Promise<string>((selesai, gagal) => {
        const r = new FileReader();
        r.onload = () => selesai(String(r.result).replace(/^data:[^;]+;base64,/, ""));
        r.onerror = () => gagal(new Error("Berkas gagal dibaca."));
        r.readAsDataURL(file);
      });

      await api.post(`/me/pembayaran/${t.id}/bukti`, {
        fileName: file.name,
        contentType: file.type,
        base64,
      });
      setKabar("Bukti transfer terkirim. Tim akademik akan memverifikasinya.");
      onBerubah();
    } catch (e) {
      if (e instanceof ApiError) {
        const rinci = e.details as { path: string; message: string }[] | undefined;
        setErr(Array.isArray(rinci) && rinci.length ? rinci.map((x) => x.message).join(" · ") : e.message);
      } else {
        setErr(e instanceof Error ? e.message : "Terjadi kesalahan yang tidak diketahui.");
      }
    } finally {
      setBusy(false);
      if (berkasRef.current) berkasRef.current.value = "";
    }
  }

  return (
    <Card padding={24}>
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
          <div style={{ fontSize: 19, fontWeight: 700 }}>{t.programName}</div>
          <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 3 }}>
            {t.formTitle}
          </div>
        </div>
        <Badge bg={s.bg} fg={s.fg}>
          {s.label}
        </Badge>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 16,
          marginTop: 20,
          paddingTop: 18,
          borderTop: "1px solid var(--color-line-soft)",
        }}
      >
        <Info
          label="Biaya"
          nilai={t.feeAmount === null ? "Tanpa biaya" : rupiah(t.feeAmount)}
          besar
        />
        <Info label="Mendaftar" nilai={tanggal(t.submittedAt)} />
        {!selesai && t.feeAmount !== null && (
          <Info
            label="Tenggat"
            nilai={tenggat(t).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
        )}
        {t.paymentVerifiedAt && <Info label="Diverifikasi" nilai={tanggal(t.paymentVerifiedAt)} />}
      </div>

      {t.paymentNote && (
        <div
          style={{
            marginTop: 16,
            padding: "11px 14px",
            border: "1px solid var(--color-line)",
            borderRadius: 9,
            fontSize: 14.5,
            lineHeight: 1.6,
          }}
        >
          <span className="eyebrow">Catatan admin</span>
          <div style={{ marginTop: 5 }}>{t.paymentNote}</div>
        </div>
      )}

      {/* --- rekening tujuan --- */}
      {bolehKirim && t.bankAccountNumber && (
        <div
          style={{
            marginTop: 20,
            padding: "16px 18px",
            background: "var(--color-mist)",
            borderRadius: 10,
          }}
        >
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Rekening tujuan
          </div>
          <div style={{ fontSize: 15.5, lineHeight: 1.7 }}>
            <div>{t.bankName}</div>
            <div
              style={{
                fontFamily: mono,
                fontSize: 21,
                letterSpacing: ".06em",
                userSelect: "all",
                marginBlock: 4,
              }}
            >
              {t.bankAccountNumber}
            </div>
            <div>a.n. {t.bankAccountHolder}</div>
          </div>
          {t.bankNote && (
            <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 10, lineHeight: 1.6 }}>
              {t.bankNote}
            </div>
          )}
        </div>
      )}

      {/* --- unggah bukti --- */}
      {bolehKirim && (
        <div style={{ marginTop: 18 }}>
          <div className="eyebrow" style={{ marginBottom: 9 }}>
            {t.sudahAdaBukti ? "Ganti bukti transfer" : "Kirim bukti transfer"}
          </div>
          <p style={{ fontSize: 14.5, color: "var(--color-muted)", margin: "0 0 11px", lineHeight: 1.6 }}>
            JPG, PNG, WebP, atau PDF. Maksimal 2 MB.
            {t.sudahAdaBukti && " Mengirim berkas baru akan menggantikan yang sebelumnya."}
          </p>
          <input
            ref={berkasRef}
            type="file"
            accept={JENIS.join(",")}
            disabled={busy}
            aria-label="Pilih berkas bukti transfer"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) kirim(f);
            }}
            style={{ fontSize: 15 }}
          />
          {busy && (
            <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 9 }}>
              Mengirim berkas…
            </div>
          )}
        </div>
      )}

      {selesai && (
        <div style={{ marginTop: 18, fontSize: 15, color: "var(--color-forest)" }}>
          {t.paymentStatus === "lunas"
            ? "Pembayaran Anda sudah diterima. Baarakallahu fiik."
            : "Anda dibebaskan dari biaya program ini."}
        </div>
      )}

      {err && (
        <div role="alert" className="alert-error" style={{ marginTop: 14 }}>
          {err}
        </div>
      )}
      {kabar && (
        <div
          role="status"
          style={{
            marginTop: 14,
            padding: "11px 14px",
            border: "1px solid #cfe0cf",
            background: "#eef5ee",
            borderRadius: 9,
            fontSize: 15,
          }}
        >
          {kabar}
        </div>
      )}
    </Card>
  );
}

function Info({ label, nilai, besar }: { label: string; nilai: string | null; besar?: boolean }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontSize: besar ? 19 : 15.5, fontWeight: besar ? 700 : 400 }}>
        {nilai || <span style={{ color: "var(--color-faint)" }}>—</span>}
      </div>
    </div>
  );
}
