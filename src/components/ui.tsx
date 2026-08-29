import type { CSSProperties, ReactNode } from "react";

/**
 * Shared primitives for both portals. Deliberately small and unstyled-by-
 * default: 12-HALLMARK-RULES.md forbids a uniform three-card grid on every
 * section, so these compose rather than impose a layout.
 */

export const mono = "var(--font-mono)";
export const serif = "var(--font-serif)";

export function Eyebrow({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "dark" | "accent" }) {
  const cls = tone === "dark" ? "eyebrow eyebrow-on-dark" : tone === "accent" ? "eyebrow eyebrow-accent" : "eyebrow";
  return <div className={cls}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  actions?: ReactNode;
}) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 24,
        flexWrap: "wrap",
        marginBottom: 26,
      }}
    >
      <div style={{ minWidth: 0 }}>
        {eyebrow && (
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            {eyebrow}
          </div>
        )}
        <h1 style={{ fontSize: 32 }}>{title}</h1>
        {lead && (
          <p
            style={{
              margin: "12px 0 0",
              fontSize: 17.5,
              lineHeight: 1.6,
              color: "var(--color-body)",
              maxWidth: 620,
            }}
          >
            {lead}
          </p>
        )}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
    </header>
  );
}

export function Card({
  children,
  tone = "surface",
  padding = 24,
  style,
}: {
  children: ReactNode;
  tone?: "surface" | "sand" | "forest" | "mist";
  padding?: number | string;
  style?: CSSProperties;
}) {
  const cls =
    tone === "sand" ? "card-sand" : tone === "forest" ? "card-forest" : tone === "mist" ? "card-mist" : "card";
  return (
    <section className={cls} style={{ padding, ...style }}>
      {children}
    </section>
  );
}

export function CardTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 16,
        marginBottom: 16,
        flexWrap: "wrap",
      }}
    >
      <h2 style={{ fontFamily: serif, fontSize: 21 }}>{children}</h2>
      {aside && <div style={{ fontSize: 14.5, color: "#807a70" }}>{aside}</div>}
    </div>
  );
}

export function Badge({ children, bg, fg }: { children: ReactNode; bg: string; fg: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 10px",
        borderRadius: 5,
        background: bg,
        color: fg,
        fontSize: 13,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function Meter({ percent, label }: { percent: number; label?: string }) {
  return (
    <div
      className="meter"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}

/** Completion ring used in unit checklists. */
export function StepMark({ done, size = 22, current = false }: { done: boolean; size?: number; current?: boolean }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        flex: "none",
        borderRadius: "50%",
        border: `1.5px solid ${done || current ? "var(--color-forest)" : "var(--color-line-strong)"}`,
        background: done ? "var(--color-forest)" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.5,
        fontWeight: 700,
        color: "var(--color-paper)",
      }}
    >
      {done ? "✓" : ""}
    </div>
  );
}

export function DataRow({
  children,
  first = false,
}: {
  children: ReactNode;
  first?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 0",
        borderTop: first ? undefined : "1px solid var(--color-line-soft)",
      }}
    >
      {children}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div
      style={{
        padding: "40px 24px",
        textAlign: "center",
        border: "1px dashed var(--color-line-strong)",
        borderRadius: 10,
        background: "var(--color-surface)",
      }}
    >
      <div style={{ fontFamily: serif, fontSize: 19, color: "var(--color-ink)" }}>{title}</div>
      {hint && (
        <div
          style={{
            fontSize: 15.5,
            color: "var(--color-muted)",
            marginTop: 8,
            lineHeight: 1.55,
            maxWidth: 420,
            marginInline: "auto",
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

/**
 * Table that degrades to a stacked list on narrow screens: columns marked
 * `secondary` are hidden below 900px rather than squeezed.
 */
export type Column<T> = {
  key: string;
  head: string;
  width?: string;
  secondary?: boolean;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  empty,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
  caption?: string;
}) {
  const template = columns.map((c) => c.width ?? "1fr").join(" ");
  if (!rows.length) {
    return <EmptyState title={empty ?? "Belum ada data"} />;
  }
  return (
    <div>
      {caption && (
        <div style={{ fontSize: 14.5, color: "#807a70", padding: "0 0 12px" }}>{caption}</div>
      )}
      <div
        className="table-head"
        style={{
          display: "grid",
          gridTemplateColumns: template,
          gap: 8,
          padding: "12px 20px",
          background: "var(--color-paper)",
          fontFamily: mono,
          fontSize: 11,
          letterSpacing: ".1em",
          color: "var(--color-soft)",
          borderRadius: "8px 8px 0 0",
          border: "1px solid var(--color-line)",
        }}
      >
        {columns.map((c) => (
          <div key={c.key} className={c.secondary ? "col-hide" : undefined}>
            {c.head}
          </div>
        ))}
      </div>
      <div style={{ border: "1px solid var(--color-line)", borderTop: 0, borderRadius: "0 0 8px 8px", background: "var(--color-surface)" }}>
        {rows.map((r, i) => (
          <div
            key={i}
            className="table-row"
            style={{
              display: "grid",
              gridTemplateColumns: template,
              gap: 8,
              padding: "14px 20px",
              borderTop: i === 0 ? undefined : "1px solid var(--color-line-softer)",
              alignItems: "center",
              fontSize: 15.5,
            }}
          >
            {columns.map((c) => (
              <div key={c.key} className={c.secondary ? "col-hide" : undefined}>
                {c.render(r)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
