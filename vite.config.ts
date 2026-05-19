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
  base: "/bitcoin-card-topup",
  server: {
    allowedHosts: true,
  },
});
