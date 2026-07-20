import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { scanApiPlugin } from "./server/scanPlugin";

// On `vite build` (GitHub Pages) assets live under /supplement-dash/; in dev
// they're served from root. Output to docs/ so Pages can serve from main/docs.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/supplement-dash/" : "/",
  build: { outDir: "docs" },
  plugins: [
    react(),
    scanApiPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Supplement Dash",
        short_name: "SuppDash",
        description: "Mix your own powdered supplement batches",
        theme_color: "#1D9E75",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
}));
