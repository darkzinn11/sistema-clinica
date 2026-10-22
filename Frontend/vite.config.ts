import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

// O front chama sempre /api (mesma origem do navegador); o Vite repassa para o backend.
// Por padrão usa o backend local, mas API_PROXY_TARGET permite apontar para a VPS em desenvolvimento.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.API_PROXY_TARGET || "http://127.0.0.1:8083";

  return {
    plugins: [react(), tailwindcss()],
    server: { proxy: { "/api": { target, changeOrigin: true, secure: true } } },
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
  };
});
