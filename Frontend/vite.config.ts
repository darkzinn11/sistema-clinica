import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // O backend roda em 127.0.0.1:8083: o proxy evita CORS em desenvolvimento e o front usa URLs relativas.
  server: { proxy: { "/api": { target: "http://127.0.0.1:8083", changeOrigin: false } } },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
