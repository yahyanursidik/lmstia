import { Navigate, Route, Routes, useLocation, useParams } from "react-router";
import { Suspense, lazy, useEffect } from "react";

import { AdminLayout, PublicLayout, StudentLayout } from "./components/layouts";
import { RequireRole } from "./lib/auth";

import Landing from "./views/public/Landing";
import Login from "./views/public/Login";
import DaftarProgram, { DaftarIndex } from "./views/public/DaftarProgram";
import {
  CaraBelajar,
  CaturwulanDetail,
  CaturwulanList,
  Faq,
  PengajarPublik,
  Program,
} from "./views/public/Pages";

/*
 * Portal peserta dan admin dimuat saat dibutuhkan, bukan di muka.
 *
 * Sebelumnya seluruh aplikasi berada dalam satu berkas 621 kB, sehingga
 * pengunjung halaman utama — yang mungkin belum punya akun sama sekali —
 * ikut mengunduh lima belas layar admin yang tidak akan pernah ia buka.
 * Halaman publik tetap dimuat langsung karena itulah yang pertama digambar;
 * menundanya justru menambah satu perjalanan sebelum apa pun tampak.
 */
const StudentDashboard = lazy(() => import("./views/student/Dashboard"));
const UnitBelajar = lazy(() => import("./views/student/UnitBelajar"));
const Kuis = lazy(() => import("./views/student/Kuis"));
const NilaiPeserta = lazy(() => import("./views/student/Nilai"));
const Pembayaran = lazy(() => import("./views/student/Pembayaran"));
const PustakaPeserta = lazy(() => import("./views/student/Pustaka"));
const Riwayat = lazy(() => import("./views/student/Riwayat"));
const Catatan = lazy(() => halamanPeserta("Catatan"));
const Caturwulan = lazy(() => halamanPeserta("Caturwulan"));
const Jadwal = lazy(() => halamanPeserta("Jadwal"));
const Kelas = lazy(() => halamanPeserta("Kelas"));
const Murojaah = lazy(() => halamanPeserta("Murojaah"));
const Profil = lazy(() => halamanPeserta("Profil"));
const Progress = lazy(() => halamanPeserta("Progress"));

const AdminDashboard = lazy(() => import("./views/admin/Dashboard"));
const Portofolio = lazy(() => import("./views/admin/Portofolio"));
const Penilaian = lazy(() => import("./views/admin/Penilaian"));
const KuisUjian = lazy(() => import("./views/admin/KuisUjian"));
const Pengguna = lazy(() => import("./views/admin/Pengguna"));
const PendaftaranAdmin = lazy(() => import("./views/admin/Pendaftaran"));
const HalaqohAdmin = lazy(() => import("./views/admin/Halaqoh"));
const Penempatan = lazy(() => import("./views/admin/Penempatan"));
const JadwalPengajar = lazy(() => import("./views/admin/JadwalPengajar"));
const Pustaka = lazy(() => import("./views/admin/Pustaka"));
const BankSoal = lazy(() => import("./views/admin/BankSoal"));
const Kehadiran = lazy(() => import("./views/admin/Kehadiran"));
const Laporan = lazy(() => halamanAdmin("Laporan"));
const Nilai = lazy(() => halamanAdmin("Nilai"));
const PengajarAdmin = lazy(() => halamanAdmin("PengajarAdmin"));
const Pengumuman = lazy(() => halamanAdmin("Pengumuman"));
const Worksheet = lazy(() => halamanAdmin("Worksheet"));

/*
 * `Pages.tsx` memuat beberapa layar sekaligus sebagai ekspor bernama.
 * `lazy` menuntut modul dengan ekspor `default`, jadi tiap nama dibungkus
 * menjadi modul kecil berisi satu layar. Berkasnya tetap satu potongan —
 * yang dihindari hanyalah memuatnya bersama bundel utama.
 */
function halamanPeserta(nama: keyof typeof import("./views/student/Pages")) {
  return import("./views/student/Pages").then((m) => ({ default: m[nama] }));
}
function halamanAdmin(nama: keyof typeof import("./views/admin/Pages")) {
  return import("./views/admin/Pages").then((m) => ({ default: m[nama] }));
}

const STUDENT_ONLY = ["student"] as const;
const STAFF = ["instructor", "academic_admin", "super_admin"] as const;

/**
 * Mengalihkan tautan lama `/pekan/:week` ke `/pertemuan/:week`.
 *
 * Penggantian istilah tidak boleh mematikan tautan yang sudah dibagikan atau
 * disimpan peserta, jadi jalur lamanya dipertahankan sebagai pengalih.
 */
function AlihkanKePertemuan() {
  const { courseSlug, week } = useParams();
  return <Navigate to={`/belajar/kelas/${courseSlug}/pertemuan/${week}`} replace />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<MemuatHalaman />}>
      <Routes>
        {/* --- Public (03-IA §Public Routes) --- */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/program" element={<Program />} />
          <Route path="/caturwulan" element={<CaturwulanList />} />
          <Route path="/caturwulan/:slug" element={<CaturwulanDetail />} />
          <Route path="/cara-belajar" element={<CaraBelajar />} />
          <Route path="/pengajar" element={<PengajarPublik />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/daftar" element={<DaftarIndex />} />
          {/* Tautan unik per program: halaman pengantar + formulir. */}
          <Route path="/daftar/:slug" element={<DaftarProgram />} />
          <Route path="/login" element={<Login />} />
        </Route>

        {/* --- Student portal (03-IA §Student Routes) --- */}
        <Route
          element={
            <RequireRole allow={[...STUDENT_ONLY]}>
              <StudentLayout />
            </RequireRole>
          }
        >
          <Route path="/belajar" element={<Navigate to="/belajar/dashboard" replace />} />
          <Route path="/belajar/dashboard" element={<StudentDashboard />} />
          <Route path="/belajar/caturwulan" element={<Caturwulan />} />
          <Route path="/belajar/kelas/:courseSlug" element={<Kelas />} />
          <Route path="/belajar/kelas/:courseSlug/pertemuan/:week" element={<UnitBelajar />} />
          {/* Tautan lama /pekan/ tetap hidup — peserta mungkin sudah menyimpannya. */}
          <Route path="/belajar/kelas/:courseSlug/pekan/:week" element={<AlihkanKePertemuan />} />
          <Route path="/belajar/jadwal" element={<Jadwal />} />
          <Route path="/belajar/murojaah" element={<Murojaah />} />
          <Route path="/belajar/kuis/:id" element={<Kuis />} />
          <Route path="/belajar/nilai" element={<NilaiPeserta />} />
          <Route path="/belajar/progress" element={<Progress />} />
          <Route path="/belajar/riwayat" element={<Riwayat />} />
          <Route path="/belajar/pustaka" element={<PustakaPeserta />} />
          <Route path="/belajar/pembayaran" element={<Pembayaran />} />
          <Route path="/belajar/catatan" element={<Catatan />} />
          <Route path="/belajar/profil" element={<Profil />} />
        </Route>

        {/* --- Admin portal (03-IA §Admin Routes) --- */}
        <Route
          element={
            <RequireRole allow={[...STAFF]}>
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/halaqoh" element={<HalaqohAdmin />} />
          <Route path="/admin/penempatan" element={<Penempatan />} />
          <Route path="/admin/jadwal-pengajar" element={<JadwalPengajar />} />
          <Route path="/admin/pustaka" element={<Pustaka />} />
          <Route path="/admin/pengguna" element={<Pengguna />} />
          {/* Halaman peserta lama masih memakai data contoh; manajemen pengguna menggantikannya. */}
          <Route path="/admin/peserta" element={<Navigate to="/admin/pengguna" replace />} />
          <Route path="/admin/pendaftaran" element={<PendaftaranAdmin />} />
          <Route path="/admin/program" element={<Portofolio />} />
          {/* Menu lama diarahkan ke portofolio terpadu. */}
          {["tahapan", "mata-pelajaran", "pertemuan", "materi", "kurikulum", "caturwulan"].map((p) => (
            <Route key={p} path={"/admin/" + p} element={<Navigate to="/admin/program" replace />} />
          ))}
          <Route path="/admin/worksheet" element={<Worksheet />} />
          <Route path="/admin/kuis" element={<KuisUjian />} />
          <Route path="/admin/bank-soal" element={<BankSoal />} />
          <Route path="/admin/penilaian" element={<Penilaian />} />
          <Route path="/admin/quiz" element={<Navigate to="/admin/penilaian" replace />} />
          <Route path="/admin/kehadiran" element={<Kehadiran />} />
          <Route path="/admin/nilai" element={<Nilai />} />
          <Route path="/admin/pengajar" element={<PengajarAdmin />} />
          <Route path="/admin/pengumuman" element={<Pengumuman />} />
          <Route path="/admin/laporan" element={<Laporan />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </>
  );
}

/** Penanda singkat selagi potongan halaman diunduh. */
function MemuatHalaman() {
  return (
    <div
      className="shell"
      style={{ paddingBlock: 56, color: "var(--color-faint)", fontSize: 15.5 }}
      role="status"
    >
      Memuat…
    </div>
  );
}
