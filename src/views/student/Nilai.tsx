import { Link } from "react-router";
import { useResource } from "../../lib/useApi";
import { Badge, Card, EmptyState, Meter, PageHeader, mono, serif } from "../../components/ui";

/**
 * Nilai peserta pada tahapan berjalan — setiap kuis/ujian dibandingkan
 * terhadap KKM-nya masing-masing, bukan terhadap satu ambang global.
 */

type Baris = {
  assessmentId: string;
  title: string;
  kind: "kuis" | "ujian" | "latihan";
  kkm: number;
  weight: number | null;
  subjectName: string | null;
  subjectSlug: string | null;
  meetingNumber: number | null;
  status: "berlangsung" | "menunggu_penilaian" | "dinilai" | null;
  score: number | null;
  passed: boolean | null;
  attemptId: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  berlangsung: "Sedang dikerjakan",
  menunggu_penilaian: "Menunggu penilaian",
  dinilai: "Sudah dinilai",
};

export default function Nilai() {
  const { data, loading, error } = useResource<Baris[]>("/me/nilai");

  if (loading) {
    return <div className="shell" style={{ padding: 40, color: "var(--color-muted)" }}>Memuat nilai…</div>;
  }

  if (error) {
    return (
      <div className="shell" style={{ paddingBlock: "40px 80px" }}>
        <PageHeader eyebrow="Progres" title="Nilai" />
        <EmptyState title="Tidak dapat memuat nilai" hint={error} />
      </div>
    );
  }

  const rows = data ?? [];
  const dinilai = rows.filter((r) => r.status === "dinilai" && r.score != null);
  const lulus = dinilai.filter((r) => r.passed).length;
  const menunggu = rows.filter((r) => r.status === "menunggu_penilaian").length;
  const belum = rows.filter((r) => !r.status).length;
  const rata = dinilai.length
    ? Math.round(dinilai.reduce((n, r) => n + (r.score ?? 0), 0) / dinilai.length)
    : null;

  // Kelompokkan per mata pelajaran agar mudah dibaca.
  const perMapel = new Map<string, Baris[]>();
  for (const r of rows) {
    const k = r.subjectName ?? "Lainnya";
    perMapel.set(k, [...(perMapel.get(k) ?? []), r]);
  }

  return (
    <div className="shell" style={{ paddingBlock: "40px 80px" }}>
      <PageHeader
        eyebrow="Progres"
        title="Nilai"
        lead="Setiap kuis dan ujian punya KKM sendiri. Yang dinilai adalah pencapaian Anda terhadap ambang itu, bukan peringkat terhadap peserta lain."
      />

      <div className="quad" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { k: "RATA-RATA", v: rata != null ? String(rata) : "—" },
          { k: "MENCAPAI KKM", v: `${lulus}/${dinilai.length || 0}` },
          { k: "MENUNGGU DINILAI", v: String(menunggu) },
          { k: "BELUM DIKERJAKAN", v: String(belum) },
        ].map((x) => (
          <Card key={x.k} padding={20}>
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: ".11em", color: "var(--color-soft)" }}>
              {x.k}
            </div>
            <div style={{ fontFamily: serif, fontSize: 34, lineHeight: 1.1, marginTop: 10 }}>{x.v}</div>
          </Card>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Belum ada kuis" hint="Kuis akan muncul di sini setelah pengajar menerbitkannya." />
      ) : (
        [...perMapel.entries()].map(([mapel, list]) => (
          <div key={mapel} style={{ marginBottom: 26 }}>
            <h2 style={{ fontFamily: serif, fontSize: 22, marginBottom: 12 }}>{mapel}</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {list.map((r) => {
                const belumDikerjakan = !r.status;
                return (
                  <Card key={r.assessmentId} padding={18}>
                    <div
                      className="split"
                      style={{ display: "grid", gridTemplateColumns: "1fr 150px 130px 130px", gap: 16, alignItems: "center" }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 9, alignItems: "baseline", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 15.5, fontWeight: 600 }}>{r.title}</span>
                          <Badge
                            bg={r.kind === "ujian" ? "#f7e6e0" : "#f6eddb"}
                            fg={r.kind === "ujian" ? "#8d4632" : "#8a6a25"}
                          >
                            {r.kind}
                          </Badge>
                        </div>
                        <div style={{ fontSize: 13.5, color: "var(--color-faint)", marginTop: 4 }}>
                          {r.meetingNumber != null ? `Pertemuan ${r.meetingNumber}` : "Ujian mata pelajaran"}
                          {" · KKM "}
                          {r.kkm}
                          {r.weight != null && ` · bobot ${r.weight}%`}
                        </div>
                      </div>

                      <div className="col-hide">
                        {r.score != null ? (
                          <>
                            <Meter percent={r.score} label={r.title} />
                            <div style={{ fontFamily: mono, fontSize: 12, color: "var(--color-muted)", marginTop: 5 }}>
                              KKM {r.kkm}
                            </div>
                          </>
                        ) : (
                          <span style={{ fontSize: 13.5, color: "var(--color-faint)" }}>
                            {belumDikerjakan ? "Belum dikerjakan" : STATUS_LABEL[r.status!]}
                          </span>
                        )}
                      </div>

                      <div style={{ fontFamily: serif, fontSize: 26, textAlign: "right" }}>
                        {r.score ?? "—"}
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        {r.passed === true && <Badge bg="#e6ede7" fg="#1f3d34">Lulus</Badge>}
                        {r.passed === false && <Badge bg="#f7e6e0" fg="#8d4632">Belum</Badge>}
                        <Link to={`/belajar/kuis/${r.assessmentId}`} className="btn-sm">
                          {belumDikerjakan ? "Kerjakan" : "Lihat"}
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      <div style={{ fontSize: 13.5, color: "var(--color-muted)", lineHeight: 1.6, marginTop: 8 }}>
        Nilai yang ditampilkan adalah percobaan terbaik Anda. Soal esai dinilai pengajar, sehingga
        nilai akhir baru muncul setelah diperiksa.
      </div>
    </div>
  );
}
