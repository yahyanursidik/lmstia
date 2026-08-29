import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "./api";

/**
 * Pengambilan data sederhana untuk halaman admin.
 *
 * Sengaja tidak memakai pustaka cache: setiap halaman admin memuat satu daftar
 * dan memuat ulang setelah mutasi. Bila nanti butuh cache lintas halaman,
 * TanStack Query masuk di sini tanpa mengubah pemanggilnya.
 */
export function useResource<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<T>(path)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Gagal memuat data."))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(reload, [reload]);

  return { data, loading, error, reload, setError };
}

/** Membungkus mutasi agar galat Zod dari server tampil apa adanya. */
export async function mutate(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (e) {
    if (e instanceof ApiError) {
      const details = e.details as { path: string; message: string }[] | undefined;
      if (Array.isArray(details) && details.length) {
        return details.map((d) => `${d.path}: ${d.message}`).join(" · ");
      }
      return e.message;
    }
    return "Terjadi kesalahan yang tidak diketahui.";
  }
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
