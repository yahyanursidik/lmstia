import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ApiError } from "../../lib/api";
import { homeFor, useAuth } from "../../lib/auth";

const mono = "var(--font-mono)";
const serif = "var(--font-serif)";

/** Password shared by every demo account; seeded by `npm run db:accounts`. */
const DEMO_PASSWORD = "TiaDemo#2026";

const DEMO_ACCOUNTS = [
  { email: "peserta@tia.id", label: "Peserta", who: "Abdurrahman", desc: "Dasbor belajar, unit pekanan, murojaah." },
  { email: "pengajar@tia.id", label: "Pengajar", who: "Ustadz Abu Hudzaifah", desc: "Kelas yang diampu, kehadiran, penilaian." },
  { email: "admin@tia.id", label: "Admin Akademik", who: "Tim Akademik", desc: "Kurikulum, peserta, pendaftaran, laporan." },
  { email: "super@tia.id", label: "Super Admin", who: "Akses penuh", desc: "Seluruh sumber daya tanpa batasan." },
];

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14.5,
  fontWeight: 600,
  color: "var(--color-muted)",
  marginBottom: 7,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 13px",
  border: "1px solid var(--color-line-strong)",
  borderRadius: 6,
  background: "var(--color-paper)",
  fontFamily: "var(--font-sans)",
  fontSize: 17.5,
  color: "var(--color-ink)",
};

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await signIn(email, password);
      // Return the user to the page they were blocked from, when it suits their role.
      navigate(from && from !== "/login" ? from : homeFor(user.role), { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Terjadi kesalahan. Coba beberapa saat lagi.",
      );
    } finally {
      setBusy(false);
    }
  }

  function fill(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <div className="shell" style={{ paddingBlock: "56px 90px" }}>
      <div
        className="split"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "start" }}
      >
        {/* --- form --- */}
        <div style={{ maxWidth: 460 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            Portal TIA
          </div>
          <h1 style={{ fontSize: 40, lineHeight: 1.12 }}>Masuk ke portal</h1>
          <p style={{ margin: "18px 0 0", fontSize: 18, lineHeight: 1.65, color: "var(--color-body)" }}>
            Gunakan email dan kata sandi yang terdaftar. Anda akan diarahkan sesuai peran — peserta ke dasbor belajar,
            pengajar dan admin ke dasbor akademik.
          </p>

          <form onSubmit={submit} style={{ marginTop: 32, display: "grid", gap: 18 }}>
            <div>
              <label htmlFor="email" style={labelStyle}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="nama@tia.id"
              />
            </div>

            <div>
              <label htmlFor="password" style={labelStyle}>
                Kata sandi
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 78 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    padding: "6px 10px",
                    border: 0,
                    background: "transparent",
                    color: "var(--color-forest)",
                    fontSize: 14.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                style={{
                  padding: "13px 15px",
                  background: "#f7e6e0",
                  border: "1px solid #e8cdc3",
                  borderRadius: 8,
                  fontSize: 15.5,
                  lineHeight: 1.55,
                  color: "#8d4632",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy}
              style={{ justifyContent: "center", opacity: busy ? 0.65 : 1, cursor: busy ? "wait" : "pointer" }}
            >
              {busy ? "Memproses…" : "Masuk"}
            </button>
          </form>

          <div style={{ marginTop: 24, fontSize: 15.5, color: "var(--color-muted)" }}>
            Belum mendaftar?{" "}
            <Link to="/daftar" style={{ color: "var(--color-forest)", fontWeight: 600 }}>
              Daftar Caturwulan 1
            </Link>
          </div>
        </div>

        {/* --- demo accounts --- */}
        <div>
          <div
            style={{
              border: "1px solid var(--color-line)",
              borderRadius: 12,
              overflow: "hidden",
              background: "var(--color-surface)",
            }}
          >
            <div
              style={{
                padding: "16px 22px",
                background: "var(--color-sand)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: ".11em", color: "var(--color-soft)" }}>
                AKUN DEMO
              </div>
              <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-muted)" }}>{DEMO_PASSWORD}</div>
            </div>

            {DEMO_ACCOUNTS.map((a, i) => (
              <div
                key={a.email}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 22px",
                  borderTop: i === 0 ? undefined : "1px solid var(--color-line-soft)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 17.5, fontWeight: 700 }}>{a.label}</span>
                    <span style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>{a.email}</span>
                  </div>
                  <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 4, lineHeight: 1.5 }}>
                    {a.who} — {a.desc}
                  </div>
                </div>
                <button type="button" className="btn-sm" style={{ flex: "none" }} onClick={() => fill(a.email)}>
                  Isikan
                </button>
              </div>
            ))}

            <div
              style={{
                padding: "16px 22px",
                borderTop: "1px solid var(--color-line-soft)",
                background: "var(--color-paper)",
                fontSize: 14.5,
                lineHeight: 1.6,
                color: "#5c564d",
              }}
            >
              Akun demo hanya untuk pengembangan — ditandai <code style={{ fontFamily: mono, fontSize: 13 }}>is_demo</code>{" "}
              di basis data dan harus dihapus sebelum produksi. Jalankan{" "}
              <code style={{ fontFamily: mono, fontSize: 13 }}>npm run db:accounts</code> untuk membuatnya.
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              padding: "16px 20px",
              background: "var(--color-mist)",
              borderRadius: 10,
              fontSize: 15,
              lineHeight: 1.6,
              color: "#2f4a3f",
            }}
          >
            <strong style={{ fontFamily: serif, fontSize: 17.5 }}>Butuh API berjalan.</strong>
            <br />
            Login diverifikasi di server, jadi jalankan <code style={{ fontFamily: mono, fontSize: 13 }}>npm run api</code>{" "}
            di terminal terpisah sebelum masuk.
          </div>
        </div>
      </div>
    </div>
  );
}
