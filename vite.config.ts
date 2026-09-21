import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.OC3_API_TARGET ?? "http://localhost:8080";

  // Public host name when the dev server is exposed behind a TLS gateway (HAProxy).
  // Empty in local dev: the server is then reached by its IP.
  const publicHost = env.OC3_PUBLIC_HOST ?? "";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      host: true,
      port: 5173,
      // Without this list, Vite answers 403 to requests whose Host header is not an
      // IP, hence to everything arriving through the gateway.
      allowedHosts: publicHost ? [publicHost] : undefined,
      // The gateway terminates TLS on 443: the HMR client must aim at that port,
      // not at the container's 5173.
      hmr: publicHost
        ? { host: publicHost, protocol: "wss", clientPort: 443 }
        : undefined,
      // In dev, the frontend talks to apicollector through this proxy: no CORS to handle.
      proxy: {
        "/api": { target, changeOrigin: true, secure: false },
      },
    },
  };
});
