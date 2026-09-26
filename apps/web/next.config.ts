import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build liviano para Docker: copia solo los archivos que hacen falta para
  // correr (server.js + node_modules mínimos) en vez de la carpeta .next
  // completa + todos los node_modules del monorepo.
  output: "standalone",
};

export default nextConfig;
