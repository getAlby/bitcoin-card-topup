import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss({}),
    VitePWA({
      injectRegister: "auto",
      // Update the service worker silently on each deploy. Without this,
      // the first time a returning user opens the PWA after a new release
      // they get the old cached bundle (no hashBootstrap, etc.) until
      // they reload again. skipWaiting + clientsClaim makes the new SW
      // take over immediately on the next page load.
      registerType: "autoUpdate",
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      // Generate and serve a fresh SW + manifest in dev too. Without this,
      // a stale SW from a prior preview/prod session keeps trying to precache
      // assets the dev server doesn't serve, producing workbox 404s and
      // occasional blank pages.
      devOptions: {
        enabled: true,
        type: "module",
        navigateFallback: "index.html",
      },
      includeAssets: ["mask-icon.svg", "/shortcut-icon-192.png"],
      manifest: {
        name: "Bitcoin Card Topup",
        short_name: "Bitcoin Card Topup",
        description: "Instantly top up any crypto debit card with one tap via the Bitcoin Lightning Network",
        scope: "/",
        background_color: "#FFFFFF",
        theme_color: "#FFFFFF",
        display: "standalone",
        icons: [
          {
            src: "shortcut-icon-192.png",
            type: "image/png",
            sizes: "192x192",
            purpose: "any",
          },
          {
            src: "shortcut-icon.png",
            type: "image/png",
            sizes: "512x512",
            purpose: "any",
          },
          {
            src: "shortcut-icon.png",
            type: "image/png",
            sizes: "512x512",
            purpose: "maskable",
          },
        ],
      },
    },
  )
  ],

  base: "/",
  server: {
    allowedHosts: true,
  },
});
