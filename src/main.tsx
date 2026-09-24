import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import "@fontsource-variable/ibm-plex-sans";
import "@/styles/index.css";
import "@/i18n";
import { queryClient } from "@/lib/query";
import { router } from "@/app/router";
import { applyPalette, applyTheme, cachedPalette, cachedTheme } from "@/lib/theme";

// Before the first render: the cached choices, otherwise the system theme and the
// standard palette.
applyTheme(cachedTheme());
applyPalette(cachedPalette());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
