import { useEffect, useId, useMemo, useRef, useState } from "react";
import { mono } from "./ui";

/**
 * Pemilih dengan pencarian.
 *
 * Dropdown biasa tidak lagi memadai begitu daftar mencapai puluhan — apalagi
 * ratusan program. Komponen ini mengetik-untuk-menyaring, mendukung papan
 * ketik penuh (panah, Enter, Esc), dan mengikuti pola ARIA combobox agar
 * pembaca layar mengumumkan pilihan yang sedang disorot.
 */

export type Opsi = {
  value: string;
  label: string;
  /** Baris kedua, mis. kode atau status. */
  hint?: string;
};

export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Cari…",
  loading = false,
  disabled = false,
  emptyText = "Tidak ada pilihan",
  ariaLabel,
  /**
   * Daftar pendek tidak perlu kotak pencarian — cukup dipilih. Mengetik huruf
   * tetap melompat ke pilihan yang cocok, seperti `<select>` bawaan.
   */
  searchable = true,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Opsi[];
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  emptyText?: string;
  ariaLabel?: string;
  searchable?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sorot, setSorot] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const terpilih = options.find((o) => o.value === value) ?? null;

  const hasil = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Mode tanpa pencarian selalu menampilkan seluruh pilihan.
    if (!searchable || !q) return options;
    // Cocokkan label maupun hint, supaya kode ("AR01") juga bisa dicari.
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.hint ?? "").toLowerCase().includes(q),
    );
  }, [options, query, searchable]);

  // Type-ahead untuk mode tanpa pencarian: menekan huruf melompat ke pilihan
  // pertama yang diawali huruf itu.
  const ketikRef = useRef({ buffer: "", waktu: 0 });
  function typeAhead(ch: string) {
    const now = Date.now();
    const st = ketikRef.current;
    st.buffer = now - st.waktu > 700 ? ch : st.buffer + ch;
    st.waktu = now;
    const i = options.findIndex((o) => o.label.toLowerCase().startsWith(st.buffer.toLowerCase()));
    if (i >= 0) setSorot(i);
  }

  // Tutup ketika klik di luar.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Jaga agar item yang disorot tetap terlihat saat menavigasi dengan panah.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[sorot] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [sorot, open]);

  function pilih(o: Opsi) {
    onChange(o.value);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;

    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      setOpen(true);
      // Buka pada pilihan yang sedang aktif, bukan selalu dari atas.
      setSorot(Math.max(0, options.findIndex((o) => o.value === value)));
      e.preventDefault();
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSorot((i) => Math.min(i + 1, hasil.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSorot((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSorot(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setSorot(hasil.length - 1);
    } else if (e.key === "Enter" || (!searchable && e.key === " ")) {
      e.preventDefault();
      if (hasil[sorot]) pilih(hasil[sorot]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
    } else if (e.key === "Tab") {
      setOpen(false);
      setQuery("");
    } else if (!searchable && e.key.length === 1 && /\S/.test(e.key)) {
      e.preventDefault();
      typeAhead(e.key);
    }
  }

  const kosongTerpilih = !terpilih;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && hasil[sorot] ? `${id}-opt-${sorot}` : undefined}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          disabled={disabled}
          readOnly={!searchable}
          value={searchable && open ? query : (terpilih?.label ?? "")}
          placeholder={loading ? "Memuat…" : searchable ? placeholder : "— pilih —"}
          onChange={(e) => {
            if (!searchable) return;
            setQuery(e.target.value);
            setSorot(0);
            if (!open) setOpen(true);
          }}
          onFocus={() => !disabled && searchable && setOpen(true)}
          onClick={() => {
            if (disabled) return;
            // Daftar pendek dibuka/ditutup dengan klik, seperti select biasa.
            if (!searchable) {
              setOpen((v) => !v);
              setSorot(Math.max(0, options.findIndex((o) => o.value === value)));
            } else if (!open) {
              setOpen(true);
            }
          }}
          onKeyDown={onKeyDown}
          style={{
            width: "100%",
            padding: "10px 34px 10px 12px",
            border: `1px solid ${open ? "var(--color-forest)" : "var(--color-line-strong)"}`,
            borderRadius: 6,
            background: disabled ? "#f2efe8" : "var(--color-paper)",
            fontFamily: "var(--font-sans)",
            fontSize: 16,
            color: kosongTerpilih && !open ? "var(--color-faint)" : "var(--color-ink)",
            cursor: disabled ? "not-allowed" : searchable ? "text" : "pointer",
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--color-faint)",
            fontSize: 12,
            pointerEvents: "none",
          }}
        >
          {searchable && open ? "⌕" : "▾"}
        </span>
      </div>

      {open && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 40,
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            maxHeight: 260,
            overflowY: "auto",
            margin: 0,
            padding: 4,
            listStyle: "none",
            background: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: 8,
            boxShadow: "0 8px 24px -12px rgba(28,26,23,.28)",
          }}
        >
          {loading ? (
            <li style={{ padding: "12px 14px", fontSize: 14.5, color: "var(--color-muted)" }}>Memuat…</li>
          ) : hasil.length === 0 ? (
            <li style={{ padding: "12px 14px", fontSize: 14.5, color: "var(--color-muted)" }}>
              {searchable && query ? `Tidak ada hasil untuk “${query}”` : emptyText}
            </li>
          ) : (
            hasil.map((o, i) => {
              const aktif = i === sorot;
              const dipilih = o.value === value;
              return (
                <li
                  key={o.value}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={dipilih}
                  onMouseEnter={() => setSorot(i)}
                  onMouseDown={(e) => {
                    // mousedown, bukan click: cegah input kehilangan fokus dulu.
                    e.preventDefault();
                    pilih(o);
                  }}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 6,
                    cursor: "pointer",
                    background: aktif ? "var(--color-mist)" : "transparent",
                    color: dipilih ? "var(--color-forest)" : "var(--color-ink)",
                    fontWeight: dipilih ? 700 : 400,
                  }}
                >
                  <div style={{ fontSize: 15 }}>{o.label}</div>
                  {o.hint && (
                    <div style={{ fontFamily: mono, fontSize: 12, color: "var(--color-faint)", marginTop: 2 }}>
                      {o.hint}
                    </div>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
