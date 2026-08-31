import { useEffect, useId, useRef, type ReactNode } from "react";
import { serif } from "./ui";

/**
 * Panel geser dari kanan untuk menampilkan rincian satu baris.
 *
 * Sebelumnya rincian muncul di ATAS tabel, sehingga memilih satu baris berarti
 * menggulir ke atas untuk membacanya lalu turun lagi untuk memilih berikutnya.
 * Dengan panel geser, tabel tetap di tempatnya dan rincian muncul di sampingnya
 * — tidak ada yang berpindah posisi.
 *
 * Di layar sempit panel menempati seluruh lebar, karena membagi ruang di sana
 * hanya membuat keduanya sama-sama tidak terbaca.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  actions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const judulId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const pemicuSebelumnya = useRef<HTMLElement | null>(null);

  /* Esc menutup, dan fokus dikembalikan ke elemen yang membukanya. */
  useEffect(() => {
    if (!open) return;
    pemicuSebelumnya.current = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    /*
     * Halaman di belakang dikunci agar gulirannya tidak ikut bergerak saat
     * isi panel digulir — itu persis kebingungan yang ingin dihindari.
     */
    const sebelumnya = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    /* Fokus dipindah ke panel supaya pembaca layar mengumumkan isinya. */
    const t = setTimeout(() => panel.current?.focus(), 30);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = sebelumnya;
      clearTimeout(t);
      pemicuSebelumnya.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(31,61,52,.28)",
          zIndex: 90,
        }}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={judulId}
        tabIndex={-1}
        className="drawer-panel"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(560px, 100vw)",
          background: "var(--color-surface)",
          borderLeft: "1px solid var(--color-line)",
          boxShadow: "-18px 0 46px rgba(31,61,52,.16)",
          zIndex: 91,
          display: "flex",
          flexDirection: "column",
          outline: "none",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 14,
            padding: "20px 22px 16px",
            borderBottom: "1px solid var(--color-line)",
            flex: "none",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2 id={judulId} style={{ fontFamily: serif, fontSize: 22, lineHeight: 1.25, margin: 0 }}>
              {title}
            </h2>
            {subtitle && (
              <div style={{ fontSize: 14.5, color: "var(--color-faint)", marginTop: 5 }}>
                {subtitle}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup rincian"
            style={{
              flex: "none",
              width: 34,
              height: 34,
              borderRadius: 8,
              border: "1px solid var(--color-line)",
              background: "var(--color-paper)",
              color: "var(--color-ink)",
              fontSize: 17,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px 26px" }}>{children}</div>

        {actions && (
          <footer
            style={{
              flex: "none",
              display: "flex",
              gap: 9,
              flexWrap: "wrap",
              padding: "14px 22px",
              borderTop: "1px solid var(--color-line)",
              background: "var(--color-paper)",
            }}
          >
            {actions}
          </footer>
        )}
      </div>
    </>
  );
}
