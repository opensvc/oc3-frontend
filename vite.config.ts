import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.OC3_API_TARGET ?? "http://localhost:8080";

  // Nom d'hôte public quand le serveur de dev est exposé derrière une passerelle
  // TLS (HAProxy). Vide en dev local : on accède alors au serveur par son IP.
  const publicHost = env.OC3_PUBLIC_HOST ?? "";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      host: true,
      port: 5173,
      // Sans cette liste, Vite répond 403 aux requêtes dont l'en-tête Host
      // n'est pas une IP, donc à tout ce qui arrive via la passerelle.
      allowedHosts: publicHost ? [publicHost] : undefined,
      // La passerelle termine le TLS sur 443 : le client HMR doit viser ce
      // port-là, pas le 5173 du conteneur.
      hmr: publicHost
        ? { host: publicHost, protocol: "wss", clientPort: 443 }
        : undefined,
      // En dev, le frontend parle à apicollector via ce proxy : pas de CORS à gérer.
      proxy: {
        "/api": { target, changeOrigin: true, secure: false },
      },
    },
  };
});
