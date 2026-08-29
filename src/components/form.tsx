import type { ReactNode } from "react";
import { mono, serif } from "./ui";

/** Kontrol formulir bersama untuk halaman CRUD admin. */

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--color-line-strong)",
  borderRadius: 6,
  background: "var(--color-paper)",
  fontFamily: "var(--font-sans)",
  fontSize: 16,
  color: "var(--color-ink)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--color-muted)",
  marginBottom: 6,
};

export function Field({
  label,
  hint,
  children,
  span,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  span?: boolean;
}) {
  return (
    <div style={span ? { gridColumn: "1 / -1" } : undefined}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && (
        <div style={{ fontSize: 13, color: "var(--color-faint)", marginTop: 5, lineHeight: 1.5 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export function Text({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle}
    />
  );
}

export function Num({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <input
      type="number"
      min={min}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
      style={inputStyle}
    />
  );
}

export function Area({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle, resize: "vertical" }}
    />
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} style={inputStyle}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 15.5, cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** Panel formulir sebaris — dipakai untuk tambah/ubah tanpa berpindah halaman. */
export function FormPanel({
  title,
  error,
  busy,
  onSubmit,
  onCancel,
  submitLabel = "Simpan",
  children,
}: {
  title: string;
  error?: string | null;
  busy?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel?: string;
  children: ReactNode;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      style={{
        border: "1px solid var(--color-forest)",
        borderRadius: 12,
        background: "var(--color-surface)",
        padding: 24,
        marginBottom: 20,
      }}
    >
      <div style={{ fontFamily: serif, fontSize: 20, marginBottom: 18 }}>{title}</div>

      <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {children}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            marginTop: 16,
            padding: "12px 14px",
            background: "#f7e6e0",
            border: "1px solid #e8cdc3",
            borderRadius: 8,
            fontSize: 15,
            lineHeight: 1.55,
            color: "#8d4632",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
        <button type="submit" className="btn-solid-sm" disabled={busy} style={{ opacity: busy ? 0.6 : 1 }}>
          {busy ? "Menyimpan…" : submitLabel}
        </button>
        <button type="button" className="btn-sm" onClick={onCancel}>
          Batal
        </button>
      </div>
    </form>
  );
}

/** Tombol hapus dengan konfirmasi dua langkah — hapus tidak bisa dibatalkan. */
export function DeleteButton({ onConfirm, label = "Hapus" }: { onConfirm: () => void; label?: string }) {
  return (
    <button
      type="button"
      className="btn-sm"
      style={{ color: "#8d4632", borderColor: "#e8cdc3" }}
      onClick={() => {
        if (window.confirm("Hapus item ini beserta seluruh isinya? Tindakan ini tidak dapat dibatalkan.")) {
          onConfirm();
        }
      }}
    >
      {label}
    </button>
  );
}

export { mono, serif };
