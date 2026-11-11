import { useMemo, useState } from "react";
import { useResource } from "../../lib/useApi";
import { Card, DataTable, EmptyState, PageHeader, mono, type Column } from "../../components/ui";
import { Field, Select } from "../../components/form";
import { HARI } from "./Halaqoh";

/**
 * Pengajar dan jadwalnya.
 *
 * Dua tampilan atas data yang sama. Daftar menjawab "siapa mengampu berapa";
 * kalender pekan menjawab "siapa mengajar kapan" — dan itulah yang dipakai
 * saat menyusun penugasan baru agar tidak menumpuk pada satu orang di jam
 * yang sama.
 */

type Pengajar = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  accountStatus: string;
  halaqohDiampu: number;
  mapelDiampu: number;
  halaqohDibina: number;
};

type Penugasan = {
  id: string;
  halaqohName: string;
  halaqohCode: string;
  tahapanName: string;
  programName: string;
  subjectName: string;
  instructorId: string;
  instructorName: string;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  mode: string;
  location: string | null;
};

const MODE_LABEL: Record<string, string> = {
  online: "Daring",
  offline: "Luring",
  hybrid: "Hibrida",
  mandiri: "Mandiri",
};

export default function JadwalPengajar() {
  const pengajar = useResource<Pengajar[]>("/admin/halaqoh/pengajar/daftar");
  const [instructorId, setInstructorId] = useState("");
  const [tampilan, setTampilan] = useState<"pekan" | "daftar">("pekan");

  const penugasan = useResource<Penugasan[]>(
    `/admin/halaqoh/penugasan/daftar${instructorId ? `?instructorId=${instructorId}` : ""}`,
  );

  /**
   * Penugasan dikelompokkan per hari untuk tampilan pekan.
   *
   * Yang belum dijadwalkan dikumpulkan terpisah, bukan dibuang: justru
   * itulah yang perlu dilihat admin — penugasan tanpa jadwal tidak akan
   * pernah muncul di kalender mana pun kalau disembunyikan.
   */
  const perHari = useMemo(() => {
    const kotak: Penugasan[][] = [[], [], [], [], [], [], [], []];
    const tanpaJadwal: Penugasan[] = [];
    for (const p of penugasan.data ?? []) {
      if (p.dayOfWeek && p.startTime) kotak[p.dayOfWeek]!.push(p);
      else tanpaJadwal.push(p);
    }
    return { kotak, tanpaJadwal };
  }, [penugasan.data]);

  const kolomPengajar: Column<Pengajar>[] = [
    {
      key: "nama",
      head: "PENGAJAR",
      width: "1.6fr",
      render: (r) => (
        <div>
          <div style={{ fontWeight: 700 }}>{r.name}</div>
          <div style={{ fontSize: 13.5, color: "var(--color-muted)" }}>
            {r.title ?? r.email}
          </div>
        </div>
      ),
    },
    {
      key: "kontak",
      head: "KONTAK",
      width: "1.1fr",
      render: (r) => <span style={{ fontFamily: mono, fontSize: 13 }}>{r.phone ?? "—"}</span>,
    },
    {
      key: "bina",
      head: "HALAQOH DIBINA",
      width: ".9fr",
      render: (r) => <span style={{ fontFamily: mono, fontSize: 13 }}>{r.halaqohDibina}</span>,
    },
    {
      key: "ampu",
      head: "MAPEL DIAMPU",
      width: ".9fr",
      render: (r) => (
        <span style={{ fontFamily: mono, fontSize: 13 }}>
          {r.mapelDiampu}
          {r.halaqohDiampu > 0 && (
            <span style={{ color: "var(--color-faint)" }}> · {r.halaqohDiampu} rombel</span>
          )}
        </span>
      ),
    },
    {
      key: "aksi",
      head: "",
      width: ".7fr",
      render: (r) => (
        <button
          type="button"
          className="btn-sm"
          onClick={() => {
            setInstructorId(r.id);
            setTampilan("pekan");
          }}
        >
          Jadwal
        </button>
      ),
    },
  ];

  const terpilih = (pengajar.data ?? []).find((p) => p.id === instructorId);

  return (
    <>
      <PageHeader
        eyebrow="Orang"
        title="Pengajar & Jadwal"
        lead="Beban mengajar setiap ustadz dan jadwal pekanannya. Penugasan sendiri diatur dari rincian halaqoh."
      />

      <Card padding={18} style={{ marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          <Field label="Pengajar">
            <Select
              value={instructorId}
              onChange={setInstructorId}
              options={[
                { value: "", label: "— semua pengajar —" },
                ...(pengajar.data ?? []).map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </Field>
          <Field label="Tampilan">
            <Select
              value={tampilan}
              onChange={(v) => setTampilan(v as "pekan" | "daftar")}
              options={[
                { value: "pekan", label: "Kalender pekan" },
                { value: "daftar", label: "Daftar pengajar" },
              ]}
            />
          </Field>
        </div>
      </Card>

      {tampilan === "daftar" && (
        <>
          {pengajar.loading && <div style={{ color: "var(--color-faint)" }}>Memuat pengajar…</div>}
          {pengajar.data && (
            <DataTable
              columns={kolomPengajar}
              rows={
                instructorId
                  ? pengajar.data.filter((p) => p.id === instructorId)
                  : pengajar.data
              }
              empty="Belum ada akun berperan pengajar."
            />
          )}
        </>
      )}

      {tampilan === "pekan" && (
        <>
          {terpilih && (
            <div style={{ marginBottom: 14, fontSize: 15.5, color: "var(--color-muted)" }}>
              Jadwal <strong style={{ color: "var(--color-body)" }}>{terpilih.name}</strong> —{" "}
              {terpilih.mapelDiampu} mata pelajaran di {terpilih.halaqohDiampu} halaqoh.
            </div>
          )}

          {penugasan.loading && <div style={{ color: "var(--color-faint)" }}>Memuat jadwal…</div>}

          {penugasan.data && penugasan.data.length === 0 && (
            <EmptyState
              title={instructorId ? "Pengajar ini belum punya penugasan" : "Belum ada penugasan"}
              hint="Penugasan dibuat dari rincian halaqoh, pada bagian Pengampu mata pelajaran."
            />
          )}

          {penugasan.data && penugasan.data.length > 0 && (
            <div className="jadwal-pekan" style={{ display: "grid", gap: 12 }}>
              {HARI.slice(1).map((nama, i) => {
                const hari = i + 1;
                const isi = perHari.kotak[hari] ?? [];
                return (
                  <Card key={hari} padding={0}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "120px 1fr",
                        alignItems: "stretch",
                      }}
                    >
                      <div
                        style={{
                          padding: "14px 16px",
                          borderRight: "1px solid var(--color-line)",
                          background: isi.length ? "var(--color-mist)" : undefined,
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{nama}</div>
                        <div
                          style={{ fontFamily: mono, fontSize: 12, color: "var(--color-faint)" }}
                        >
                          {isi.length} sesi
                        </div>
                      </div>
                      <div style={{ padding: isi.length ? 10 : "14px 16px" }}>
                        {isi.length === 0 ? (
                          <span style={{ color: "var(--color-faint)", fontSize: 14.5 }}>
                            Tidak ada jadwal
                          </span>
                        ) : (
                          <div style={{ display: "grid", gap: 7 }}>
                            {isi.map((p) => (
                              <div
                                key={p.id}
                                style={{
                                  display: "flex",
                                  gap: 12,
                                  alignItems: "baseline",
                                  flexWrap: "wrap",
                                  padding: "7px 10px",
                                  border: "1px solid var(--color-line)",
                                  borderRadius: 8,
                                }}
                              >
                                <span
                                  style={{ fontFamily: mono, fontSize: 13, flex: "none" }}
                                >
                                  {p.startTime}–{p.endTime}
                                </span>
                                <span style={{ fontWeight: 600 }}>{p.subjectName}</span>
                                <span style={{ fontSize: 14, color: "var(--color-muted)" }}>
                                  {p.halaqohName}
                                </span>
                                {!instructorId && (
                                  <span style={{ fontSize: 14, color: "var(--color-forest)" }}>
                                    {p.instructorName}
                                  </span>
                                )}
                                <span
                                  style={{ fontSize: 13, color: "var(--color-faint)" }}
                                >
                                  {MODE_LABEL[p.mode] ?? p.mode}
                                  {p.location ? ` · ${p.location}` : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}

              {perHari.tanpaJadwal.length > 0 && (
                <Card padding={18}>
                  <div className="eyebrow" style={{ marginBottom: 10 }}>
                    Belum dijadwalkan ({perHari.tanpaJadwal.length})
                  </div>
                  <div style={{ display: "grid", gap: 7 }}>
                    {perHari.tanpaJadwal.map((p) => (
                      <div key={p.id} style={{ fontSize: 14.5 }}>
                        <strong>{p.subjectName}</strong> · {p.halaqohName}
                        {!instructorId && (
                          <span style={{ color: "var(--color-forest)" }}> · {p.instructorName}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
