import { Navigate, Route, Routes, useLocation, useParams } from "react-router";
import { useEffect } from "react";

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

import StudentDashboard from "./views/student/Dashboard";
import UnitBelajar from "./views/student/UnitBelajar";
import Kuis from "./views/student/Kuis";
import NilaiPeserta from "./views/student/Nilai";
import { Catatan, Caturwulan, Jadwal, Kelas, Murojaah, Profil, Progress } from "./views/student/Pages";

import AdminDashboard from "./views/admin/Dashboard";
import Portofolio from "./views/admin/Portofolio";
import Penilaian from "./views/admin/Penilaian";
import KuisUjian from "./views/admin/KuisUjian";
import Pengguna from "./views/admin/Pengguna";
import PendaftaranAdmin from "./views/admin/Pendaftaran";
import BankSoal from "./views/admin/BankSoal";
import {
  Kehadiran,
  Laporan,
  Nilai,
  PengajarAdmin,
  Pengumuman,
  Worksheet,
} from "./views/admin/Pages";

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
    </>
  );
}
