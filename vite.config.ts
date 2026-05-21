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
  ),
  {
      name: 'ios-pwa-hash-fix',
      transformIndexHtml(html) {
        // Injects a synchronous script directly into the index.html head layout
        const scriptInject = `
          <script>
            (function() {
              if (typeof window === 'undefined') return;
              var hash = window.location.hash;
              if (!hash || hash === '#') return;
              
              var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
              if (!isIOS) return;
              
              if (window.matchMedia('(display-mode: standalone)').matches) return;

              window.addEventListener('DOMContentLoaded', function() {
                var link = document.querySelector('link[rel="manifest"]');
                if (!link) return;
                
                var baseManifest = {
                  name: "My App",
                  short_name: "App",
                  id: window.location.pathname,
                  start_url: window.location.pathname + hash,
                  display: "standalone",
                  icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }]
                };
                
                link.href = "data:application/manifest+json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(baseManifest))));
              });
            })();
          </script>
        `;
        return html.replace('</head>', `${scriptInject}</head>`);
      },
    }
  ],

  base: "/",
  server: {
    allowedHosts: true,
  },
});
