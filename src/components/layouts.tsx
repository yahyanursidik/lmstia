import { NavLink, Link, Outlet, useLocation } from "react-router";
import { useState } from "react";
import { useAuth, isAdminRole } from "../lib/auth";
import { mono, serif } from "./ui";

/* --- brand ---------------------------------------------------- */

function Wordmark({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
      <div className="topbar-mark" aria-hidden="true">
        ت
      </div>
      <div className="topbar-name">Tarbiyah Sunnah Islamic Academy</div>
    </Link>
  );
}

/* --- public --------------------------------------------------- */

const PUBLIC_NAV = [
  { to: "/program", label: "Program" },
  { to: "/caturwulan", label: "Caturwulan" },
  { to: "/cara-belajar", label: "Cara Belajar" },
  { to: "/pengajar", label: "Pengajar" },
  { to: "/faq", label: "FAQ" },
];

export function PublicLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-paper)" }}>
      <div className="topbar">
        <Wordmark />
        <nav className="public-nav" aria-label="Navigasi utama">
          {PUBLIC_NAV.map((n) => (
            <NavLink key={n.to} to={n.to}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {user ? (
            <Link
              to={isAdminRole(user.role) || user.role === "instructor" ? "/admin/dashboard" : "/belajar/dashboard"}
              className="btn-solid-sm"
            >
              Masuk portal
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-sm nav-login">
                Masuk
              </Link>
              <Link to="/daftar" className="btn-solid-sm">
                Daftar
              </Link>
            </>
          )}
          <button
            type="button"
            className="nav-toggle"
            aria-label="Buka navigasi"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            ☰
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-menu" aria-label="Navigasi">
          {PUBLIC_NAV.map((n) => (
            <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      )}

      <Outlet />

      <footer style={{ borderTop: "1px solid var(--color-line)", background: "var(--color-surface)" }}>
        <div
          className="shell"
          style={{ paddingBlock: 40, display: "grid", gap: 26, gridTemplateColumns: "1.4fr 1fr 1fr" }}
        >
          <div>
            <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 17, color: "var(--color-forest)" }}>
              Belajar bertahap. Selesaikan satu tahap. Lanjutkan ketika siap.
            </div>
            <div style={{ fontSize: 15, color: "var(--color-muted)", marginTop: 12, maxWidth: 380, lineHeight: 1.6 }}>
              Pendaftaran dilakukan per caturwulan. Setiap caturwulan adalah unit belajar yang utuh.
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              Program
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 15.5 }}>
              {PUBLIC_NAV.map((n) => (
                <Link key={n.to} to={n.to} style={{ color: "var(--color-body)" }}>
                  {n.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 12 }}>
              Mulai
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 15.5 }}>
              <Link to="/daftar" style={{ color: "var(--color-body)" }}>
                Daftar Caturwulan 1
              </Link>
              <Link to="/login" style={{ color: "var(--color-body)" }}>
                Masuk ke LMS
              </Link>
            </div>
          </div>
        </div>
        <div className="shell" style={{ paddingBottom: 32 }}>
          <div
            style={{
              borderTop: "1px solid var(--color-line-soft)",
              paddingTop: 20,
              fontFamily: mono,
              fontSize: 12,
              letterSpacing: ".1em",
              color: "var(--color-faint)",
            }}
          >
            TARBIYAH SUNNAH ISLAMIC ACADEMY
          </div>
        </div>
      </footer>
    </div>
  );
}

/* --- student -------------------------------------------------- */

/** Desktop nav per 03-INFORMATION-ARCHITECTURE.md §Navigasi Peserta. */
const STUDENT_NAV = [
  { to: "/belajar/dashboard", label: "Belajar" },
  { to: "/belajar/caturwulan", label: "Caturwulan" },
  { to: "/belajar/jadwal", label: "Jadwal" },
  { to: "/belajar/murojaah", label: "Murojaah" },
  { to: "/belajar/nilai", label: "Nilai" },
  { to: "/belajar/progress", label: "Progress" },
  { to: "/belajar/catatan", label: "Catatan" },
  { to: "/belajar/profil", label: "Profil" },
];

/** Mobile bottom bar keeps only the four the spec names. */
const STUDENT_TABS = [
  { to: "/belajar/dashboard", label: "Belajar", icon: "◉" },
  { to: "/belajar/jadwal", label: "Jadwal", icon: "▤" },
  { to: "/belajar/murojaah", label: "Murojaah", icon: "↺" },
  { to: "/belajar/profil", label: "Profil", icon: "☺" },
];

export function StudentLayout() {
  const { user } = useAuth();
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-paper)", paddingBottom: 72 }}>
      <div className="topbar">
        <Wordmark to="/belajar/dashboard" />
        <nav className="portal-nav" aria-label="Navigasi peserta">
          {STUDENT_NAV.map((n) => (
            <NavLink key={n.to} to={n.to}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div
          aria-hidden="true"
          style={{
            width: 30,
            height: 30,
            flex: "none",
            borderRadius: "50%",
            background: "var(--color-mist)",
            color: "var(--color-forest)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          {user?.avatarInitials}
        </div>
      </div>

      <Outlet />

      <nav className="bottom-nav" aria-label="Navigasi cepat">
        {STUDENT_TABS.map((t) => (
          <NavLink key={t.to} to={t.to}>
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/* --- admin ---------------------------------------------------- */

const ADMIN_GROUPS: { label: string; items: { to: string; label: string }[] }[] = [
  {
    label: "Ringkasan",
    items: [
      { to: "/admin/dashboard", label: "Dasbor" },
      { to: "/admin/laporan", label: "Laporan" },
    ],
  },
  {
    // Satu pintu untuk seluruh hierarki konten. Tahapan, mata pelajaran,
    // pertemuan, dan materi ditelusuri di dalam halaman ini — bukan lewat
    // menu terpisah per tingkat.
    label: "Akademik",
    items: [{ to: "/admin/program", label: "Program Belajar" }],
  },
  {
    label: "Penilaian",
    items: [
      { to: "/admin/worksheet", label: "Worksheet" },
      { to: "/admin/kuis", label: "Kuis & Ujian" },
      { to: "/admin/penilaian", label: "Penilaian Esai" },
      { to: "/admin/kehadiran", label: "Kehadiran" },
      { to: "/admin/nilai", label: "Nilai" },
    ],
  },
  {
    label: "Orang",
    items: [
      { to: "/admin/peserta", label: "Peserta" },
      { to: "/admin/pendaftaran", label: "Pendaftaran" },
      { to: "/admin/pengajar", label: "Pengajar" },
      { to: "/admin/pengumuman", label: "Pengumuman" },
    ],
  },
];

export function AdminLayout() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-paper)" }}>
      <div className="topbar">
        <Wordmark to="/admin/dashboard" />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 14.5, color: "var(--color-muted)" }} className="col-hide">
            {user?.name}
          </div>
          <button type="button" className="btn-sm" onClick={signOut}>
            Keluar
          </button>
          <button
            type="button"
            className="nav-toggle"
            aria-label="Buka menu admin"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            ☰
          </button>
        </div>
      </div>

      <div className="admin-layout" style={{ display: "grid", gridTemplateColumns: "232px 1fr" }}>
        <aside className={open ? "admin-rail admin-rail-open" : "admin-rail"}>
          {ADMIN_GROUPS.map((g) => (
            <div key={g.label} style={{ marginBottom: 18 }}>
              <div
                style={{
                  fontFamily: mono,
                  fontSize: 11,
                  letterSpacing: ".13em",
                  color: "var(--color-faint)",
                  padding: "0 12px 8px",
                }}
              >
                {g.label.toUpperCase()}
              </div>
              {g.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  className="rail-link"
                  onClick={() => setOpen(false)}
                  aria-current={pathname === it.to ? "page" : undefined}
                >
                  {it.label}
                </NavLink>
              ))}
            </div>
          ))}
          <div
            style={{
              marginTop: "auto",
              padding: "14px 12px",
              borderTop: "1px solid var(--color-line-soft)",
              fontSize: 14,
              lineHeight: 1.5,
              color: "#807a70",
            }}
          >
            Cawu 1 · Pekan 8 dari 12
            <br />
            <span style={{ color: "var(--color-forest)", fontWeight: 700 }}>
              Pekan Murojaah: pekan 11
            </span>
          </div>
        </aside>

        <div className="admin-content" style={{ padding: "32px 32px 70px", minWidth: 0 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
