import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Clip Cards: learn from YouTube",
        short_name: "Clip Cards",
        description: "Study real sentences from YouTube videos with spaced repetition, offline.",
        start_url: "/",
        display: "standalone",
        background_color: "#111318",
        theme_color: "#111318",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        // App shell + sample decks are precached; the YouTube iframe itself is never cached.
        globPatterns: ["**/*.{js,css,html,svg,png,json}"],
        navigateFallback: "/index.html",
      },
    }),
  ],
  test: { environment: "node" },
});
