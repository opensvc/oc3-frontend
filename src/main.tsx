import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import "@fontsource-variable/ibm-plex-sans";
import "@/styles/index.css";
import "@/i18n";
import { queryClient } from "@/lib/query";
import { router } from "@/app/router";
import { applyTheme, cachedTheme } from "@/lib/theme";

// Avant le premier rendu : le choix mis en cache, sinon le thème du système.
applyTheme(cachedTheme());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
