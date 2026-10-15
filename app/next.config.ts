import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Ferramenta interna de clínica: toda tela depende de dados ao vivo
     (agenda, fila de espera, confirmações), então desligamos o Cache
     Components experimental em vez de anotar boundary de dinamismo em
     cada página. */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
