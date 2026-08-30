import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { mutate, slugify, useResource } from "../../lib/useApi";
import { useAuth } from "../../lib/auth";
import { Badge, EmptyState, mono, serif } from "../../components/ui";
import { Area, Check, DeleteButton, Field, FormPanel, Select, Text } from "../../components/form";
import { MATERIAL_LABEL, MaterialRow, type MaterialType } from "../../components/MaterialPreview";
import SoalEditor from "./SoalEditor";

/**
 * Portofolio Kurikulum — satu halaman untuk seluruh hierarki konten.
 *
 * Program → Tahapan → Mata Pelajaran → Pertemuan → Materi ditelusuri di
 * tempat yang sama, bukan lewat lima menu terpisah. Pencarian, penyaring
 * status, dan pilihan tampilan kartu/daftar berlaku di setiap tingkat.
 */

/* --- tipe ------------------------------------------------------- */

type Program = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "draft" | "active" | "archived";
  sequence: number;
};
type Tahapan = {
  id: string;
  programId: string;
  code: string;
  slug: string;
  name: string;
  title: string | null;
  subtitle: string | null;
  durationWeeks: number;
  status: "draft" | "open" | "running" | "closed";
  isPublic: boolean;
  sequence: number;
};
type Subject = {
  id: string;
  tahapanId: string;
  code: string;
  slug: string;
  name: string;
  description: string | null;
  role: "INTENSIVE" | "FOUNDATION" | "COMPANION";
  deliveryModel: string | null;
  weeklyLoad: string | null;
  instructorId: string | null;
  sequence: number;
};
type Material = {
  id: string;
  meetingId: string;
  title: string;
  description: string | null;
  type: MaterialType;
  url: string | null;
  content: string | null;
  durationMinutes: number;
  sequence: number;
  isEssential: boolean;
  publishStatus: "draft" | "review" | "published";
};
type Assessment = {
  id: string;
  kind: "kuis" | "ujian" | "latihan";
  title: string;
  kkm: number;
  durationMinutes: number;
  maxAttempts: number;
  publishStatus: string;
};
type Meeting = {
  id: string;
  subjectId: string;
  number: number;
  title: string;
  description: string | null;
  type: "ORIENTATION" | "REGULAR" | "REVIEW" | "ASSESSMENT" | "BREAK";
  mode: "online" | "offline" | "hybrid" | "mandiri";
  liveUrl: string | null;
  livePlatform: string | null;
  location: string | null;
  durationMinutes: number;
  sequence: number;
  isLocked: boolean;
  publishStatus: "draft" | "review" | "published";
  materials: Material[];
  assessments: Assessment[];
};
type SubjectNode = Subject & { meetings: Meeting[] };
type Tree = {
  tahapan: Tahapan;
  subjects: SubjectNode[];
  summary: { subjects: number; meetings: number; materials: number; assessments: number; published: number };
};
type Instructor = { id: string; name: string };

/* --- tampilan --------------------------------------------------- */

const PUBLISH_TONE: Record<string, { bg: string; fg: string }> = {
  published: { bg: "#e6ede7", fg: "#1f3d34" },
  active: { bg: "#e6ede7", fg: "#1f3d34" },
  running: { bg: "#e6ede7", fg: "#1f3d34" },
  open: { bg: "#f6eddb", fg: "#8a6a25" },
  review: { bg: "#f6eddb", fg: "#8a6a25" },
  draft: { bg: "#ecebe6", fg: "#6d675e" },
  closed: { bg: "#ecebe6", fg: "#6d675e" },
  archived: { bg: "#ecebe6", fg: "#6d675e" },
};
const LABEL: Record<string, string> = {
  published: "Diterbitkan",
  active: "Aktif",
  running: "Berjalan",
  open: "Pendaftaran dibuka",
  review: "Review",
  draft: "Draf",
  closed: "Selesai",
  archived: "Diarsipkan",
};
const MODE_LABEL: Record<Meeting["mode"], string> = {
  online: "Online",
  offline: "Tatap muka",
  hybrid: "Hybrid",
  mandiri: "Mandiri",
};
const MODE_TONE: Record<Meeting["mode"], { bg: string; fg: string }> = {
  online: { bg: "#e2ecf5", fg: "#2f5b80" },
  offline: { bg: "#f6eddb", fg: "#8a6a25" },
  hybrid: { bg: "#e6ede7", fg: "#1f3d34" },
  mandiri: { bg: "#ecebe6", fg: "#6d675e" },
};

/**
 * Sampul kartu. Warna diambil dari palet TIA, bukan gradien terang seperti
 * referensi — 11-DESIGN-SYSTEM.md melarang "glowing gradients".
 */
const COVERS = [
  ["#1f3d34", "#2b5245"],
  ["#8a6a25", "#a8843a"],
  ["#5b4a7a", "#6f5c92"],
  ["#8d4632", "#a3553f"],
  ["#2f5b80", "#3d6f99"],
  ["#3f5d4a", "#547a62"],
];
function cover(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const [a, b] = COVERS[h % COVERS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

const publishOptions = [
  { value: "draft" as const, label: "Draf" },
  { value: "review" as const, label: "Review" },
  { value: "published" as const, label: "Terbit" },
];

/* --- potongan UI ------------------------------------------------- */

function Toolbar({
  query,
  onQuery,
  filter,
  onFilter,
  filters,
  view,
  onView,
  count,
  noun,
}: {
  query: string;
  onQuery: (v: string) => void;
  filter: string;
  onFilter: (v: string) => void;
  filters: { value: string; label: string }[];
  view: "kartu" | "daftar";
  onView: (v: "kartu" | "daftar") => void;
  count: number;
  noun: string;
}) {
  return (
    <section className="card" style={{ padding: 20, marginBottom: 22 }}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
          <span
            aria-hidden="true"
            style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--color-faint)", fontSize: 15 }}
          >
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={`Cari ${noun}…`}
            aria-label={`Cari ${noun}`}
            style={{
              width: "100%",
              padding: "11px 13px 11px 32px",
              border: "1px solid var(--color-line-strong)",
              borderRadius: 8,
              background: "var(--color-paper)",
              fontFamily: "var(--font-sans)",
              fontSize: 16,
              color: "var(--color-ink)",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 3, padding: 3, background: "#eee9df", borderRadius: 8 }}>
          {(["kartu", "daftar"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onView(v)}
              aria-pressed={view === v}
              style={{
                padding: "7px 14px",
                border: 0,
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14.5,
                fontWeight: view === v ? 700 : 500,
                background: view === v ? "var(--color-surface)" : "transparent",
                color: view === v ? "var(--color-forest)" : "#7a746a",
                boxShadow: view === v ? "0 1px 2px rgba(28,26,23,.08)" : "none",
                textTransform: "capitalize",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 16 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              className={filter === f.value ? "btn-solid-sm" : "btn-sm"}
              onClick={() => onFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ fontFamily: mono, fontSize: 13, color: "var(--color-muted)", whiteSpace: "nowrap" }}>
          {count} {noun} ditampilkan
        </div>
      </div>
    </section>
  );
}

function Cover({ id, badge, right }: { id: string; badge?: string; right?: string }) {
  return (
    <div
      style={{
        height: 120,
        borderRadius: 10,
        background: cover(id),
        marginBottom: 16,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 100% at 80% 0%, rgba(255,255,255,.10), transparent 60%)",
        }}
      />
      {badge && (
        <span
          style={{
            position: "absolute",
            left: 12,
            bottom: 12,
            padding: "4px 9px",
            borderRadius: 5,
            background: "rgba(255,253,249,.92)",
            color: "var(--color-forest)",
            fontFamily: mono,
            fontSize: 11.5,
            fontWeight: 700,
            letterSpacing: ".06em",
          }}
        >
          {badge}
        </span>
      )}
      {right && (
        <span
          style={{
            position: "absolute",
            right: 12,
            bottom: 12,
            fontFamily: mono,
            fontSize: 12,
            color: "rgba(255,253,249,.85)",
            letterSpacing: ".05em",
          }}
        >
          {right}
        </span>
      )}
    </div>
  );
}

function MetaRow({ items }: { items: { k: string; v: string }[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        gap: 12,
        marginTop: 16,
        paddingTop: 14,
        borderTop: "1px solid var(--color-line-soft)",
      }}
    >
      {items.map((x) => (
        <div key={x.k}>
          <div style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: ".1em", color: "var(--color-soft)" }}>
            {x.k}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{x.v}</div>
        </div>
      ))}
    </div>
  );
}

/** Kartu generik untuk tingkat mana pun. */
function EntityCard({
  id,
  title,
  subtitle,
  badges,
  meta,
  coverBadge,
  coverRight,
  onOpen,
  actions,
  view,
}: {
  id: string;
  title: string;
  subtitle: string;
  badges: { label: string; bg: string; fg: string }[];
  meta: { k: string; v: string }[];
  coverBadge?: string;
  coverRight?: string;
  onOpen: () => void;
  actions?: React.ReactNode;
  view: "kartu" | "daftar";
}) {
  if (view === "daftar") {
    return (
      <div
        className="card"
        style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "6px 1fr auto auto", gap: 16, alignItems: "center" }}
      >
        <div style={{ width: 6, height: 34, borderRadius: 3, background: cover(id) }} aria-hidden="true" />
        <button
          type="button"
          onClick={onOpen}
          style={{ background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer", minWidth: 0 }}
        >
          <div style={{ fontSize: 16.5, fontWeight: 700, color: "var(--color-ink)" }}>{title}</div>
          <div style={{ fontSize: 14.5, color: "var(--color-muted)", marginTop: 3 }}>{subtitle}</div>
        </button>
        <div className="col-hide" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {badges.map((b) => (
            <Badge key={b.label} bg={b.bg} fg={b.fg}>
              {b.label}
            </Badge>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>{actions}</div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column" }}>
      <button
        type="button"
        onClick={onOpen}
        style={{ background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer", display: "block" }}
      >
        <Cover id={id} badge={coverBadge} right={coverRight} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {badges.map((b) => (
            <Badge key={b.label} bg={b.bg} fg={b.fg}>
              {b.label}
            </Badge>
          ))}
        </div>
        <div style={{ fontFamily: serif, fontSize: 20, lineHeight: 1.25, color: "var(--color-ink)" }}>{title}</div>
        <div
          style={{
            fontSize: 15,
            lineHeight: 1.55,
            color: "var(--color-muted)",
            marginTop: 8,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {subtitle}
        </div>
        {meta.length > 0 && <MetaRow items={meta} />}
      </button>
      {actions && (
        <div style={{ display: "flex", gap: 6, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--color-line-soft)" }}>
          {actions}
        </div>
      )}
    </div>
  );
}

function Grid({ view, children }: { view: "kartu" | "daftar"; children: React.ReactNode }) {
  return (
    <div
      className={view === "kartu" ? "portfolio-grid" : undefined}
      style={
        view === "kartu"
          ? { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }
          : { display: "grid", gap: 8 }
      }
    >
      {children}
    </div>
  );
}

/* --- halaman ----------------------------------------------------- */

type FormKind = "program" | "tahapan" | "subject" | "meeting" | "material";

export default function Portofolio() {
  const { user } = useAuth();
  const canWrite = user?.role === "academic_admin" || user?.role === "super_admin";

  const programs = useResource<Program[]>("/admin/programs");
  const allTahapan = useResource<Tahapan[]>("/admin/tahapan");
  const instructors = useResource<Instructor[]>("/admin/instructors");

  const [programId, setProgramId] = useState<string | null>(null);
  const [tahapanId, setTahapanId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);

  const tree = useResource<Tree>(tahapanId ? `/admin/tahapan/${tahapanId}/tree` : null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("semua");
  const [view, setView] = useState<"kartu" | "daftar">("kartu");
  const [soalUntuk, setSoalUntuk] = useState<string | null>(null);

  // Satu state formulir untuk seluruh tingkat.
  const [form, setForm] = useState<{ kind: FormKind; data: Record<string, unknown>; id: string | null } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const program = programs.data?.find((p) => p.id === programId) ?? null;
  const tahapan = tree.data?.tahapan ?? null;
  const subject = tree.data?.subjects.find((s) => s.id === subjectId) ?? null;
  const meeting = subject?.meetings.find((m) => m.id === meetingId) ?? null;

  const level: FormKind = meeting ? "material" : subject ? "meeting" : tahapan ? "subject" : program ? "tahapan" : "program";

  function resetTo(l: "root" | "program" | "tahapan" | "subject") {
    if (l === "root") {
      setProgramId(null);
      setTahapanId(null);
      setSubjectId(null);
      setMeetingId(null);
    } else if (l === "program") {
      setTahapanId(null);
      setSubjectId(null);
      setMeetingId(null);
    } else if (l === "tahapan") {
      setSubjectId(null);
      setMeetingId(null);
    } else {
      setMeetingId(null);
    }
    setQuery("");
    setFilter("semua");
    setForm(null);
  }

  function reloadAll() {
    programs.reload();
    allTahapan.reload();
    if (tahapanId) tree.reload();
  }

  async function save() {
    if (!form) return;
    setBusy(true);
    const path = {
      program: "/admin/programs",
      tahapan: "/admin/tahapan",
      subject: "/admin/subjects",
      meeting: "/admin/meetings",
      material: "/admin/materials",
    }[form.kind];
    const body = Object.fromEntries(
      Object.entries(form.data).map(([k, v]) => [k, v === "" ? null : v]),
    );
    const m = await mutate(() => (form.id ? api.patch(`${path}/${form.id}`, body) : api.post(path, body)));
    setBusy(false);
    if (m) return setErr(m);
    setForm(null);
    setErr(null);
    reloadAll();
  }

  async function remove(kind: FormKind, id: string) {
    const path = {
      program: "/admin/programs",
      tahapan: "/admin/tahapan",
      subject: "/admin/subjects",
      meeting: "/admin/meetings",
      material: "/admin/materials",
    }[kind];
    const m = await mutate(() => api.del(`${path}/${id}`));
    if (m) setErr(m);
    if (kind === "program" && id === programId) resetTo("root");
    if (kind === "tahapan" && id === tahapanId) resetTo("program");
    if (kind === "subject" && id === subjectId) resetTo("tahapan");
    if (kind === "meeting" && id === meetingId) resetTo("subject");
    reloadAll();
  }

  const d = form?.data ?? {};
  const set = (patch: Record<string, unknown>) => form && setForm({ ...form, data: { ...form.data, ...patch } });

  /* --- daftar tersaring per tingkat --- */

  const q = query.trim().toLowerCase();
  const match = (...fields: (string | null | undefined)[]) =>
    !q || fields.some((f) => (f ?? "").toLowerCase().includes(q));

  const visiblePrograms = useMemo(
    () =>
      (programs.data ?? []).filter(
        (p) => match(p.name, p.slug, p.description) && (filter === "semua" || p.status === filter),
      ),
    [programs.data, q, filter],
  );
  const visibleTahapan = useMemo(
    () =>
      (allTahapan.data ?? []).filter(
        (t) =>
          t.programId === programId &&
          match(t.name, t.code, t.title) &&
          (filter === "semua" || t.status === filter),
      ),
    [allTahapan.data, programId, q, filter],
  );
  const visibleSubjects = useMemo(
    () => (tree.data?.subjects ?? []).filter((s) => match(s.name, s.code, s.description)),
    [tree.data, q],
  );
  const visibleMeetings = useMemo(
    () =>
      (subject?.meetings ?? []).filter(
        (m) => match(m.title, String(m.number)) && (filter === "semua" || m.publishStatus === filter),
      ),
    [subject, q, filter],
  );
  const visibleMaterials = useMemo(
    () =>
      (meeting?.materials ?? []).filter(
        (m) => match(m.title, m.type) && (filter === "semua" || m.publishStatus === filter),
      ),
    [meeting, q, filter],
  );

  const NOUN: Record<FormKind, string> = {
    program: "program",
    tahapan: "tahapan",
    subject: "mata pelajaran",
    meeting: "pertemuan",
    material: "materi",
  };
  const ADD_LABEL: Record<FormKind, string> = {
    program: "Tambah Program",
    tahapan: "Tambah Tahapan",
    subject: "Tambah Mata Pelajaran",
    meeting: "Tambah Pertemuan",
    material: "Tambah Materi",
  };

  const FILTERS: Record<FormKind, { value: string; label: string }[]> = {
    program: [
      { value: "semua", label: "Semua" },
      { value: "active", label: "Aktif" },
      { value: "draft", label: "Draf" },
      { value: "archived", label: "Diarsipkan" },
    ],
    tahapan: [
      { value: "semua", label: "Semua" },
      { value: "running", label: "Berjalan" },
      { value: "open", label: "Dibuka" },
      { value: "draft", label: "Draf" },
      { value: "closed", label: "Selesai" },
    ],
    subject: [{ value: "semua", label: "Semua" }],
    meeting: [
      { value: "semua", label: "Semua" },
      { value: "published", label: "Diterbitkan" },
      { value: "review", label: "Review" },
      { value: "draft", label: "Draf" },
    ],
    material: [
      { value: "semua", label: "Semua" },
      { value: "published", label: "Diterbitkan" },
      { value: "review", label: "Review" },
      { value: "draft", label: "Draf" },
    ],
  };

  const counts: Record<FormKind, number> = {
    program: visiblePrograms.length,
    tahapan: visibleTahapan.length,
    subject: visibleSubjects.length,
    meeting: visibleMeetings.length,
    material: visibleMaterials.length,
  };

  function openCreate() {
    setErr(null);
    if (level === "program") {
      setForm({ kind: "program", id: null, data: { name: "", slug: "", description: "", status: "draft", sequence: (programs.data?.length ?? 0) + 1 } });
    } else if (level === "tahapan" && programId) {
      setForm({ kind: "tahapan", id: null, data: { programId, code: "", slug: "", name: "", title: "", subtitle: "", durationWeeks: 12, status: "draft", isPublic: false, sequence: visibleTahapan.length + 1 } });
    } else if (level === "subject" && tahapanId) {
      setForm({ kind: "subject", id: null, data: { tahapanId, code: "", slug: "", name: "", description: "", role: "FOUNDATION", deliveryModel: "", weeklyLoad: "", instructorId: "", sequence: visibleSubjects.length + 1 } });
    } else if (level === "meeting" && subjectId) {
      const next = subject?.meetings.length ? Math.max(...subject.meetings.map((m) => m.number)) + 1 : 0;
      setForm({ kind: "meeting", id: null, data: { subjectId, number: next, sequence: next, title: "", description: "", type: "REGULAR", mode: "mandiri", liveUrl: "", livePlatform: "", location: "", durationMinutes: 60, publishStatus: "draft" } });
    } else if (level === "material" && meetingId) {
      setForm({ kind: "material", id: null, data: { meetingId, title: "", description: "", type: "pdf", url: "", content: "", durationMinutes: 10, sequence: (meeting?.materials.length ?? 0) + 1, isEssential: false, publishStatus: "draft" } });
    }
  }

  const loading = programs.loading || (tahapanId != null && tree.loading);
  const loadError = programs.error ?? tree.error ?? allTahapan.error;

  return (
    <>
      {/* --- kepala --- */}
      <section
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-line)",
          borderRadius: 14,
          padding: "26px 28px",
          marginBottom: 22,
          display: "flex",
          justifyContent: "space-between",
          gap: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 34 }}>Portofolio Kurikulum</h1>
          <p style={{ margin: "10px 0 0", fontSize: 16.5, color: "var(--color-body)", maxWidth: 620, lineHeight: 1.6 }}>
            Kelola program pembelajaran dan seluruh isinya dari satu tempat — tahapan, mata pelajaran, pertemuan,
            hingga materi.
          </p>
        </div>
        {canWrite ? (
          <button type="button" className="btn btn-primary" style={{ padding: "13px 22px", fontSize: 16 }} onClick={openCreate}>
            <span aria-hidden="true" style={{ fontSize: 18.5 }}>+</span> {ADD_LABEL[level]}
          </button>
        ) : (
          <Badge bg="#ecebe6" fg="#6d675e">Hanya baca</Badge>
        )}
      </section>

      {/* --- jejak navigasi --- */}
      {(program || tahapan || subject || meeting) && (
        <nav
          aria-label="Breadcrumb"
          style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", fontSize: 15, marginBottom: 18 }}
        >
          {[
            { label: "Semua program", go: () => resetTo("root"), active: !program },
            ...(program ? [{ label: program.name, go: () => resetTo("program"), active: !tahapan }] : []),
            ...(tahapan ? [{ label: tahapan.name, go: () => resetTo("tahapan"), active: !subject }] : []),
            ...(subject ? [{ label: subject.name, go: () => resetTo("subject"), active: !meeting }] : []),
            ...(meeting ? [{ label: `Pertemuan ${meeting.number}`, go: () => {}, active: true }] : []),
          ].map((c, i, arr) => (
            <span key={c.label + i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
              {i > 0 && <span style={{ color: "#c9c1b2" }}>/</span>}
              {i === arr.length - 1 ? (
                <span style={{ fontWeight: 700, color: "var(--color-ink)" }}>{c.label}</span>
              ) : (
                <button
                  type="button"
                  onClick={c.go}
                  style={{ background: "none", border: 0, padding: 0, cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 600, color: "var(--color-forest)" }}
                >
                  {c.label}
                </button>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* --- formulir --- */}
      {form && (
        <FormPanel
          title={`${form.id ? "Ubah" : "Tambah"} ${NOUN[form.kind]}`}
          error={err}
          busy={busy}
          onSubmit={save}
          onCancel={() => {
            setForm(null);
            setErr(null);
          }}
        >
          {form.kind === "program" && (
            <>
              <Field label="Nama program">
                <Text value={String(d.name ?? "")} onChange={(v) => set({ name: v, slug: form.id ? d.slug : slugify(v) })} />
              </Field>
              <Field label="Slug">
                <Text value={String(d.slug ?? "")} onChange={(v) => set({ slug: v })} />
              </Field>
              <Field label="Status">
                <Select
                  value={String(d.status ?? "draft")}
                  onChange={(v) => set({ status: v })}
                  options={[
                    { value: "draft", label: "Draf" },
                    { value: "active", label: "Aktif" },
                    { value: "archived", label: "Diarsipkan" },
                  ]}
                />
              </Field>
              <Field label="Urutan">
                <Text type="number" value={String(d.sequence ?? 1)} onChange={(v) => set({ sequence: Number(v) || 1 })} />
              </Field>
              <Field label="Deskripsi" span>
                <Area value={String(d.description ?? "")} onChange={(v) => set({ description: v })} />
              </Field>
            </>
          )}

          {form.kind === "tahapan" && (
            <>
              <Field label="Nama tahapan">
                <Text value={String(d.name ?? "")} onChange={(v) => set({ name: v, slug: form.id ? d.slug : slugify(v) })} />
              </Field>
              <Field label="Kode">
                <Text value={String(d.code ?? "")} onChange={(v) => set({ code: v })} />
              </Field>
              <Field label="Slug">
                <Text value={String(d.slug ?? "")} onChange={(v) => set({ slug: v })} />
              </Field>
              <Field label="Tema akademik">
                <Text value={String(d.title ?? "")} onChange={(v) => set({ title: v })} />
              </Field>
              <Field label="Status">
                <Select
                  value={String(d.status ?? "draft")}
                  onChange={(v) => set({ status: v })}
                  options={[
                    { value: "draft", label: "Draf" },
                    { value: "open", label: "Pendaftaran dibuka" },
                    { value: "running", label: "Sedang berjalan" },
                    { value: "closed", label: "Selesai" },
                  ]}
                />
              </Field>
              <Field label="Durasi (pekan)">
                <Text type="number" value={String(d.durationWeeks ?? 12)} onChange={(v) => set({ durationWeeks: Number(v) || 12 })} />
              </Field>
              <Field label="Urutan">
                <Text type="number" value={String(d.sequence ?? 1)} onChange={(v) => set({ sequence: Number(v) || 1 })} />
              </Field>
              <Field label="Visibilitas">
                <Check checked={Boolean(d.isPublic)} onChange={(v) => set({ isPublic: v })} label="Tampilkan di halaman publik" />
              </Field>
              <Field label="Subjudul" span>
                <Text value={String(d.subtitle ?? "")} onChange={(v) => set({ subtitle: v })} />
              </Field>
            </>
          )}

          {form.kind === "subject" && (
            <>
              <Field label="Nama">
                <Text value={String(d.name ?? "")} onChange={(v) => set({ name: v, slug: form.id ? d.slug : slugify(v) })} />
              </Field>
              <Field label="Kode">
                <Text value={String(d.code ?? "")} onChange={(v) => set({ code: v })} />
              </Field>
              <Field label="Slug">
                <Text value={String(d.slug ?? "")} onChange={(v) => set({ slug: v })} />
              </Field>
              <Field label="Peran">
                <Select
                  value={String(d.role ?? "FOUNDATION")}
                  onChange={(v) => set({ role: v })}
                  options={[
                    { value: "INTENSIVE", label: "Intensif" },
                    { value: "FOUNDATION", label: "Fondasi" },
                    { value: "COMPANION", label: "Pendamping" },
                  ]}
                />
              </Field>
              <Field label="Pengajar">
                <Select
                  value={String(d.instructorId ?? "")}
                  onChange={(v) => set({ instructorId: v })}
                  options={[{ value: "", label: "— belum ditentukan —" }, ...(instructors.data ?? []).map((i) => ({ value: i.id, label: i.name }))]}
                />
              </Field>
              <Field label="Urutan">
                <Text type="number" value={String(d.sequence ?? 1)} onChange={(v) => set({ sequence: Number(v) || 1 })} />
              </Field>
              <Field label="Pola penyampaian">
                <Text value={String(d.deliveryModel ?? "")} onChange={(v) => set({ deliveryModel: v })} />
              </Field>
              <Field label="Beban belajar">
                <Text value={String(d.weeklyLoad ?? "")} onChange={(v) => set({ weeklyLoad: v })} />
              </Field>
              <Field label="Deskripsi" span>
                <Area value={String(d.description ?? "")} onChange={(v) => set({ description: v })} />
              </Field>
            </>
          )}

          {form.kind === "meeting" && (
            <>
              <Field label="Judul">
                <Text value={String(d.title ?? "")} onChange={(v) => set({ title: v })} />
              </Field>
              <Field label="Nomor pertemuan">
                <Text type="number" value={String(d.number ?? 0)} onChange={(v) => set({ number: Number(v) || 0, sequence: Number(v) || 0 })} />
              </Field>
              <Field label="Jenis">
                <Select
                  value={String(d.type ?? "REGULAR")}
                  onChange={(v) => set({ type: v })}
                  options={[
                    { value: "ORIENTATION", label: "Orientasi" },
                    { value: "REGULAR", label: "Pembelajaran" },
                    { value: "REVIEW", label: "Murojaah" },
                    { value: "ASSESSMENT", label: "Evaluasi" },
                    { value: "BREAK", label: "Jeda" },
                  ]}
                />
              </Field>
              <Field label="Mode">
                <Select
                  value={String(d.mode ?? "mandiri")}
                  onChange={(v) => set({ mode: v })}
                  options={[
                    { value: "mandiri", label: "Mandiri" },
                    { value: "online", label: "Online" },
                    { value: "offline", label: "Tatap muka" },
                    { value: "hybrid", label: "Hybrid" },
                  ]}
                />
              </Field>
              <Field label="Link live teaching" hint="Untuk mode online atau hybrid." span>
                <Text value={String(d.liveUrl ?? "")} onChange={(v) => set({ liveUrl: v })} placeholder="https://meet.tia.id/…" />
              </Field>
              <Field label="Platform">
                <Text value={String(d.livePlatform ?? "")} onChange={(v) => set({ livePlatform: v })} placeholder="Google Meet / Zoom" />
              </Field>
              <Field label="Lokasi (tatap muka)">
                <Text value={String(d.location ?? "")} onChange={(v) => set({ location: v })} />
              </Field>
              <Field label="Durasi (menit)">
                <Text type="number" value={String(d.durationMinutes ?? 0)} onChange={(v) => set({ durationMinutes: Number(v) || 0 })} />
              </Field>
              <Field label="Status terbit">
                <Select value={String(d.publishStatus ?? "draft")} onChange={(v) => set({ publishStatus: v })} options={publishOptions} />
              </Field>
              <Field label="Deskripsi" span>
                <Area value={String(d.description ?? "")} onChange={(v) => set({ description: v })} />
              </Field>
            </>
          )}

          {form.kind === "material" && (
            <>
              <Field label="Judul">
                <Text value={String(d.title ?? "")} onChange={(v) => set({ title: v })} />
              </Field>
              <Field label="Tipe">
                <Select
                  value={String(d.type ?? "pdf")}
                  onChange={(v) => set({ type: v })}
                  options={(Object.keys(MATERIAL_LABEL) as MaterialType[]).map((t) => ({ value: t, label: MATERIAL_LABEL[t] }))}
                />
              </Field>
              {d.type === "article" ? (
                <Field label="Isi bacaan" hint="Tipe Bacaan menyimpan teks langsung, tanpa URL." span>
                  <Area value={String(d.content ?? "")} onChange={(v) => set({ content: v })} rows={5} />
                </Field>
              ) : (
                <Field label="URL sumber" hint="Tempel tautan asli — YouTube dan Google Drive otomatis jadi pratinjau." span>
                  <Text value={String(d.url ?? "")} onChange={(v) => set({ url: v })} placeholder="https://youtu.be/… atau https://drive.google.com/file/d/…" />
                </Field>
              )}
              <Field label="Durasi (menit)">
                <Text type="number" value={String(d.durationMinutes ?? 0)} onChange={(v) => set({ durationMinutes: Number(v) || 0 })} />
              </Field>
              <Field label="Urutan">
                <Text type="number" value={String(d.sequence ?? 1)} onChange={(v) => set({ sequence: Number(v) || 1 })} />
              </Field>
              <Field label="Status terbit">
                <Select value={String(d.publishStatus ?? "draft")} onChange={(v) => set({ publishStatus: v })} options={publishOptions} />
              </Field>
              <Field label="Jalur mengejar ketertinggalan">
                <Check checked={Boolean(d.isEssential)} onChange={(v) => set({ isEssential: v })} label="Tandai sebagai materi esensial" />
              </Field>
            </>
          )}
        </FormPanel>
      )}

      {loadError ? (
        <EmptyState title="Tidak dapat memuat data" hint={`${loadError} Pastikan API berjalan ("npm run api").`} />
      ) : loading ? (
        <div style={{ padding: 40, color: "var(--color-muted)" }}>Memuat…</div>
      ) : (
        <>
          <Toolbar
            query={query}
            onQuery={setQuery}
            filter={filter}
            onFilter={setFilter}
            filters={FILTERS[level]}
            view={view}
            onView={setView}
            count={counts[level]}
            noun={NOUN[level]}
          />

          {/* --- Tingkat 1: Program --- */}
          {level === "program" && (
            <Grid view={view}>
              {visiblePrograms.map((p) => {
                const anak = (allTahapan.data ?? []).filter((t) => t.programId === p.id);
                return (
                  <EntityCard
                    key={p.id}
                    id={p.id}
                    view={view}
                    title={p.name}
                    subtitle={p.description ?? "Tidak ada penjelasan program"}
                    coverBadge="PROGRAM"
                    coverRight={`${anak.length} tahapan`}
                    badges={[{ label: LABEL[p.status], ...PUBLISH_TONE[p.status] }]}
                    meta={[
                      { k: "KODE", v: p.slug },
                      { k: "TAHAPAN", v: String(anak.length) },
                    ]}
                    onOpen={() => {
                      setProgramId(p.id);
                      resetTo("program");
                      setProgramId(p.id);
                    }}
                    actions={
                      canWrite ? (
                        <>
                          <button type="button" className="btn-sm" onClick={() => { setErr(null); setForm({ kind: "program", id: p.id, data: { name: p.name, slug: p.slug, description: p.description ?? "", status: p.status, sequence: p.sequence } }); }}>
                            Ubah
                          </button>
                          <DeleteButton onConfirm={() => remove("program", p.id)} />
                        </>
                      ) : undefined
                    }
                  />
                );
              })}
              {visiblePrograms.length === 0 && <EmptyState title="Tidak ada program" hint="Ubah kata kunci atau tambahkan program baru." />}
            </Grid>
          )}

          {/* --- Tingkat 2: Tahapan --- */}
          {level === "tahapan" && (
            <Grid view={view}>
              {visibleTahapan.map((t) => (
                <EntityCard
                  key={t.id}
                  id={t.id}
                  view={view}
                  title={t.name}
                  subtitle={t.title ?? t.subtitle ?? "Tidak ada tema akademik"}
                  coverBadge="TAHAPAN"
                  coverRight={`${t.durationWeeks} pekan`}
                  badges={[
                    { label: LABEL[t.status], ...PUBLISH_TONE[t.status] },
                    ...(t.isPublic ? [{ label: "Publik", bg: "#e2ecf5", fg: "#2f5b80" }] : []),
                  ]}
                  meta={[
                    { k: "KODE", v: t.code },
                    { k: "DURASI", v: `${t.durationWeeks} pekan` },
                  ]}
                  onOpen={() => {
                    setTahapanId(t.id);
                    setSubjectId(null);
                    setMeetingId(null);
                    setQuery("");
                    setFilter("semua");
                  }}
                  actions={
                    canWrite ? (
                      <>
                        <button type="button" className="btn-sm" onClick={() => { setErr(null); setForm({ kind: "tahapan", id: t.id, data: { programId: t.programId, code: t.code, slug: t.slug, name: t.name, title: t.title ?? "", subtitle: t.subtitle ?? "", durationWeeks: t.durationWeeks, status: t.status, isPublic: t.isPublic, sequence: t.sequence } }); }}>
                          Ubah
                        </button>
                        <DeleteButton onConfirm={() => remove("tahapan", t.id)} />
                      </>
                    ) : undefined
                  }
                />
              ))}
              {visibleTahapan.length === 0 && <EmptyState title="Belum ada tahapan" hint="Tambahkan tahapan untuk program ini." />}
            </Grid>
          )}

          {/* --- Tingkat 3: Mata Pelajaran --- */}
          {level === "subject" && (
            <Grid view={view}>
              {visibleSubjects.map((s) => {
                const materi = s.meetings.reduce((n, m) => n + m.materials.length, 0);
                return (
                  <EntityCard
                    key={s.id}
                    id={s.id}
                    view={view}
                    title={s.name}
                    subtitle={s.description ?? "Tidak ada penjelasan"}
                    coverBadge={s.role}
                    coverRight={`${s.meetings.length} pertemuan`}
                    badges={[{ label: s.role, bg: "#e6ede7", fg: "#1f3d34" }]}
                    meta={[
                      { k: "KODE", v: s.code },
                      { k: "PERTEMUAN", v: String(s.meetings.length) },
                      { k: "MATERI", v: String(materi) },
                    ]}
                    onOpen={() => {
                      setSubjectId(s.id);
                      setMeetingId(null);
                      setQuery("");
                      setFilter("semua");
                    }}
                    actions={
                      canWrite ? (
                        <>
                          <button type="button" className="btn-sm" onClick={() => { setErr(null); setForm({ kind: "subject", id: s.id, data: { tahapanId: s.tahapanId, code: s.code, slug: s.slug, name: s.name, description: s.description ?? "", role: s.role, deliveryModel: s.deliveryModel ?? "", weeklyLoad: s.weeklyLoad ?? "", instructorId: s.instructorId ?? "", sequence: s.sequence } }); }}>
                            Ubah
                          </button>
                          <DeleteButton onConfirm={() => remove("subject", s.id)} />
                        </>
                      ) : undefined
                    }
                  />
                );
              })}
              {visibleSubjects.length === 0 && <EmptyState title="Belum ada mata pelajaran" hint="Tambahkan mata pelajaran untuk tahapan ini." />}
            </Grid>
          )}

          {/* --- Tingkat 4: Pertemuan --- */}
          {level === "meeting" && (
            <div style={{ display: "grid", gap: 8 }}>
              {visibleMeetings.map((m) => (
                <div
                  key={m.id}
                  className="card"
                  style={{ padding: "14px 20px", display: "grid", gridTemplateColumns: "96px 1fr 200px auto", gap: 16, alignItems: "center" }}
                >
                  <div style={{ fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)" }}>PERTEMUAN {m.number}</div>
                  <button
                    type="button"
                    onClick={() => { setMeetingId(m.id); setQuery(""); setFilter("semua"); }}
                    style={{ background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer", minWidth: 0 }}
                  >
                    <div style={{ fontSize: 16.5, fontWeight: 600, color: "var(--color-ink)" }}>{m.title}</div>
                    <div style={{ fontSize: 14, color: "var(--color-faint)", marginTop: 3 }}>
                      {m.materials.length} materi · {m.assessments.length} kuis · {m.durationMinutes} menit
                    </div>
                  </button>
                  <div className="col-hide" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Badge bg={MODE_TONE[m.mode].bg} fg={MODE_TONE[m.mode].fg}>{MODE_LABEL[m.mode]}</Badge>
                    {m.liveUrl && <Badge bg="#e2ecf5" fg="#2f5b80">live</Badge>}
                    <Badge bg={PUBLISH_TONE[m.publishStatus].bg} fg={PUBLISH_TONE[m.publishStatus].fg}>
                      {LABEL[m.publishStatus]}
                    </Badge>
                  </div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {canWrite && (
                      <>
                        <button type="button" className="btn-sm" onClick={() => { setErr(null); setForm({ kind: "meeting", id: m.id, data: { subjectId: m.subjectId, number: m.number, sequence: m.sequence, title: m.title, description: m.description ?? "", type: m.type, mode: m.mode, liveUrl: m.liveUrl ?? "", livePlatform: m.livePlatform ?? "", location: m.location ?? "", durationMinutes: m.durationMinutes, publishStatus: m.publishStatus } }); }}>
                          Ubah
                        </button>
                        <DeleteButton onConfirm={() => remove("meeting", m.id)} />
                      </>
                    )}
                  </div>
                </div>
              ))}
              {visibleMeetings.length === 0 && <EmptyState title="Belum ada pertemuan" hint="Tambahkan pertemuan untuk mata pelajaran ini." />}
            </div>
          )}

          {/* --- Tingkat 5: isi Pertemuan --- */}
          {level === "material" && meeting && (
            <div style={{ display: "grid", gap: 20 }}>
              {meeting.liveUrl && (
                <section className="card-mist" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: ".1em", color: "#2f4a3f" }}>
                      LINK LIVE TEACHING · {MODE_LABEL[meeting.mode].toUpperCase()}
                    </div>
                    <div style={{ fontSize: 15, color: "#2f4a3f", marginTop: 4, wordBreak: "break-all" }}>{meeting.liveUrl}</div>
                  </div>
                  <a href={meeting.liveUrl} target="_blank" rel="noopener noreferrer" className="btn-sm" style={{ flex: "none" }}>
                    Buka ↗
                  </a>
                </section>
              )}

              <section className="card" style={{ padding: "6px 22px 18px" }}>
                {visibleMaterials.map((m) => (
                  <MaterialRow
                    key={m.id}
                    title={m.title}
                    type={m.type}
                    url={m.url}
                    content={m.content}
                    durationMinutes={m.durationMinutes}
                    isEssential={m.isEssential}
                    publishStatus={m.publishStatus}
                    actions={
                      canWrite ? (
                        <div style={{ display: "flex", gap: 6, flex: "none" }}>
                          <button type="button" className="btn-sm" onClick={() => { setErr(null); setForm({ kind: "material", id: m.id, data: { meetingId: m.meetingId, title: m.title, description: m.description ?? "", type: m.type, url: m.url ?? "", content: m.content ?? "", durationMinutes: m.durationMinutes, sequence: m.sequence, isEssential: m.isEssential, publishStatus: m.publishStatus } }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                            Ubah
                          </button>
                          <DeleteButton onConfirm={() => remove("material", m.id)} />
                        </div>
                      ) : undefined
                    }
                  />
                ))}
                {visibleMaterials.length === 0 && (
                  <div style={{ padding: "18px 0" }}>
                    <EmptyState title="Belum ada materi" hint="Tambahkan PDF, audio, video YouTube, atau berkas Google Drive." />
                  </div>
                )}
              </section>

              <section className="card" style={{ padding: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, marginBottom: 12 }}>
                  <h2 style={{ fontFamily: serif, fontSize: 20 }}>Kuis / Ujian</h2>
                  <div style={{ fontSize: 14.5, color: "#807a70" }}>{meeting.assessments.length} item</div>
                </div>
                {meeting.assessments.length === 0 ? (
                  <EmptyState title="Belum ada kuis" hint="Kuis melekat pada pertemuan, bukan pada masing-masing materi." />
                ) : (
                  meeting.assessments.map((a) => (
                    <div key={a.id} style={{ borderTop: "1px solid var(--color-line-soft)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", flexWrap: "wrap" }}>
                        <Badge bg={a.kind === "ujian" ? "#f7e6e0" : "#f6eddb"} fg={a.kind === "ujian" ? "#8d4632" : "#8a6a25"}>
                          {a.kind}
                        </Badge>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div style={{ fontSize: 16, fontWeight: 600 }}>{a.title}</div>
                          <div style={{ fontSize: 14, color: "var(--color-faint)", marginTop: 3 }}>
                            KKM {a.kkm} · {a.durationMinutes} menit
                            {a.maxAttempts > 0 ? ` · maks ${a.maxAttempts}×` : " · tanpa batas percobaan"}
                          </div>
                        </div>
                        <Badge bg={PUBLISH_TONE[a.publishStatus].bg} fg={PUBLISH_TONE[a.publishStatus].fg}>
                          {LABEL[a.publishStatus]}
                        </Badge>
                        <button
                          type="button"
                          className={soalUntuk === a.id ? "btn-solid-sm" : "btn-sm"}
                          onClick={() => setSoalUntuk(soalUntuk === a.id ? null : a.id)}
                        >
                          {soalUntuk === a.id ? "Tutup soal" : "Kelola soal"}
                        </button>
                      </div>
                      {soalUntuk === a.id && <SoalEditor assessmentId={a.id} canWrite={canWrite} />}
                    </div>
                  ))
                )}
              </section>
            </div>
          )}
        </>
      )}
    </>
  );
}
