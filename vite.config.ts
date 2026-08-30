import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    /*
     * Klien selalu memanggil `/api/...` secara relatif. Saat pengembangan,
     * proxy ini meneruskannya ke proses API lokal — sehingga jalur kode yang
     * sama berlaku di lokal maupun produksi, tanpa URL mutlak yang berbeda.
     */
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
