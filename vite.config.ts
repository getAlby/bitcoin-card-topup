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
      includeAssets: ["mask-icon.svg"],
      manifest: {
        name: "Bitcoin Card Topup",
        short_name: "Bitcoin Card Topup",
        description: "Instantly top up any crypto debit card with one tap via the Bitcoin Lightning Network",
        scope: "/",
        background_color: "#FFFFFF",
        theme_color: "#FFFFFF",
        display: "standalone",
        icons: [],
      },
    }),
  ],
  base: "/",
  server: {
    allowedHosts: true,
  },
});
