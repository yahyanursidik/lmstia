import { useState } from "react";
import { mono, serif } from "./ui";

/**
 * Pratinjau materi.
 *
 * Setiap sumber punya cara tampil sendiri: YouTube dan Google Drive punya URL
 * embed khusus, PDF ditampilkan dalam bingkai, audio/video memakai pemutar
 * bawaan peramban. Bila URL tidak dikenali, kita tampilkan kartu tautan —
 * lebih baik daripada iframe kosong.
 */

export type MaterialType = "pdf" | "audio" | "video" | "youtube" | "gdrive" | "article" | "link";

export const MATERIAL_LABEL: Record<MaterialType, string> = {
  pdf: "PDF",
  audio: "Audio",
  video: "Video",
  youtube: "YouTube",
  gdrive: "Google Drive",
  article: "Bacaan",
  link: "Tautan",
};

export const MATERIAL_TONE: Record<MaterialType, { bg: string; fg: string }> = {
  pdf: { bg: "#f7e6e0", fg: "#8d4632" },
  audio: { bg: "#eae4f2", fg: "#5b4a7a" },
  video: { bg: "#e6ede7", fg: "#1f3d34" },
  youtube: { bg: "#f7e0e0", fg: "#a3352f" },
  gdrive: { bg: "#e2ecf5", fg: "#2f5b80" },
  article: { bg: "#f6eddb", fg: "#8a6a25" },
  link: { bg: "#ecebe6", fg: "#6d675e" },
};

/** Ambil ID video dari bentuk watch?v=, youtu.be/, /embed/, atau /shorts/. */
export function youtubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  );
  return m ? m[1] : null;
}

/** Ambil file ID dari /file/d/<id>/ atau ?id=<id>. */
export function driveId(url: string): string | null {
  const m = url.match(/\/file\/d\/([A-Za-z0-9_-]+)/) ?? url.match(/[?&]id=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

export function embedUrl(type: MaterialType, url: string | null): string | null {
  if (!url) return null;
  if (type === "youtube") {
    const id = youtubeId(url);
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (type === "gdrive") {
    const id = driveId(url);
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  }
  if (type === "pdf") {
    // PDF Drive tetap dilayani lewat pratinjau Drive.
    const id = driveId(url);
    return id ? `https://drive.google.com/file/d/${id}/preview` : url;
  }
  return null;
}

const frameStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "16 / 9",
  border: "1px solid var(--color-line)",
  borderRadius: 10,
  background: "var(--color-paper)",
  display: "block",
};

function Fallback({ url, note }: { url: string | null; note: string }) {
  return (
    <div
      style={{
        border: "1px dashed var(--color-line-strong)",
        borderRadius: 10,
        padding: "22px 20px",
        background: "var(--color-paper)",
      }}
    >
      <div style={{ fontSize: 15.5, color: "var(--color-muted)", lineHeight: 1.6 }}>{note}</div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-sm"
          style={{ display: "inline-block", marginTop: 14 }}
        >
          Buka di tab baru ↗
        </a>
      )}
    </div>
  );
}

export function MaterialPreview({
  type,
  url,
  content,
  title,
}: {
  type: MaterialType;
  url: string | null;
  content?: string | null;
  title: string;
}) {
  const [failed, setFailed] = useState(false);

  if (type === "article") {
    return (
      <div
        style={{
          border: "1px solid var(--color-line)",
          borderRadius: 10,
          padding: "22px 24px",
          background: "var(--color-surface)",
          fontSize: 16.5,
          lineHeight: 1.75,
          color: "var(--color-body)",
          maxHeight: 320,
          overflowY: "auto",
        }}
      >
        {content || "Konten bacaan belum diisi."}
      </div>
    );
  }

  if (type === "audio") {
    return url ? (
      <div
        style={{
          border: "1px solid var(--color-line)",
          borderRadius: 10,
          padding: "20px 22px",
          background: "var(--color-surface)",
        }}
      >
        <div style={{ fontFamily: mono, fontSize: 11.5, letterSpacing: ".1em", color: "var(--color-faint)", marginBottom: 12 }}>
          AUDIO
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls preload="none" src={url} style={{ width: "100%" }}>
          Peramban Anda tidak mendukung pemutar audio.
        </audio>
      </div>
    ) : (
      <Fallback url={null} note="URL audio belum diisi." />
    );
  }

  if (type === "video") {
    return url ? (
      <video controls preload="none" src={url} style={frameStyle}>
        Peramban Anda tidak mendukung pemutar video.
      </video>
    ) : (
      <Fallback url={null} note="URL video belum diisi." />
    );
  }

  if (type === "link") {
    return <Fallback url={url} note="Materi berupa tautan eksternal." />;
  }

  const src = embedUrl(type, url);
  if (!src || failed) {
    return (
      <Fallback
        url={url}
        note={
          url
            ? `Pratinjau ${MATERIAL_LABEL[type]} tidak dapat dimuat di sini. Tautan mungkin belum dibagikan untuk publik.`
            : "URL materi belum diisi."
        }
      />
    );
  }

  return (
    <iframe
      src={src}
      title={title}
      style={frameStyle}
      allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
      onError={() => setFailed(true)}
    />
  );
}

/** Baris ringkas satu materi, dengan pratinjau yang dapat dibuka-tutup. */
export function MaterialRow({
  title,
  type,
  url,
  content,
  durationMinutes,
  isEssential,
  publishStatus,
  actions,
}: {
  title: string;
  type: MaterialType;
  url: string | null;
  content?: string | null;
  durationMinutes: number;
  isEssential: boolean;
  publishStatus: string;
  actions?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const tone = MATERIAL_TONE[type];

  return (
    <div style={{ borderTop: "1px solid var(--color-line-soft)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0" }}>
        <span
          style={{
            flex: "none",
            padding: "4px 9px",
            borderRadius: 5,
            background: tone.bg,
            color: tone.fg,
            fontSize: 12,
            fontWeight: 700,
            fontFamily: mono,
            letterSpacing: ".04em",
            minWidth: 58,
            textAlign: "center",
          }}
        >
          {MATERIAL_LABEL[type]}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-ink)" }}>{title}</div>
          <div style={{ fontSize: 14, color: "var(--color-faint)", marginTop: 3 }}>
            {durationMinutes} menit
            {isEssential && " · esensial"}
            {publishStatus !== "published" && ` · ${publishStatus}`}
          </div>
        </div>

        <button type="button" className="btn-sm" style={{ flex: "none" }} onClick={() => setOpen((v) => !v)}>
          {open ? "Tutup" : "Pratinjau"}
        </button>
        {actions}
      </div>

      {open && (
        <div style={{ padding: "4px 0 18px" }}>
          <MaterialPreview type={type} url={url} content={content} title={title} />
          {url && (
            <div style={{ marginTop: 10, fontFamily: mono, fontSize: 12.5, color: "var(--color-faint)", wordBreak: "break-all" }}>
              {url}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { serif };
