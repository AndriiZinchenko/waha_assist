import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { syncedStatePlugin } from "./server/vitePlugin.mjs";

export default defineConfig({
  plugins: [
    syncedStatePlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-180.png", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "40k Combat Assistant",
        short_name: "40k Assist",
        description: "Warhammer 40k combat assistant",
        theme_color: "#232323",
        background_color: "#232323",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,ico}"],
        // Rosters, detachment data and the Ukrainian dictionary all ship in
        // the main bundle, already past 1.4 MB. Workbox's 2 MiB default would
        // silently leave it out of the precache once it grows, and the app
        // would stop working offline with no build error.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  server: {
    host: true,
    // The preview tool assigns a free port through PORT when 5173 is taken;
    // Vite ignores that variable on its own. Without PORT nothing changes.
    ...(process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : {}),
  },
});
