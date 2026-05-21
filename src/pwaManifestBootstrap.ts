// Override the PWA manifest's start_url at runtime to include the current
// URL hash, so iOS "Add to Home Screen" preserves the one-tap bootstrap
// params (see hashBootstrap.ts).
//
// Without this, iOS launches the standalone app at the manifest's default
// start_url ("/"), dropping #label=...&nwc=... — so the homescreen icon
// can never see the wallet on first launch, and (since iOS standalone
// storage is isolated from Safari pre-16.4) it has no other way to find it.
//
// We fetch the build's manifest, swap in start_url = pathname + hash, and
// point <link rel="manifest"> at a blob URL with the rewritten body. iOS
// reads the manifest at the moment the user taps Add to Home Screen, so
// as long as the swap completes before then we're good.

export function installManifestStartUrlOverride() {
  if (typeof window === "undefined") return;
  const hash = window.location.hash;
  if (!hash || hash === "#") return;

  // 1. Precise iOS Environment Detection (Includes iPadOS Touch targets)
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isIOS) return;

  // 2. Do not mutate if already running standalone
  const isStandalone =
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia("(display-mode: standalone)").matches;
  if (isStandalone) return;

  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) return;

  // Prevent overriding our own blob if this function runs multiple times
  if (link.href.startsWith("blob:")) return; 

  const originalHref = link.href;

  fetch(originalHref)
    .then((r) => r.json())
    .then((manifest: Record<string, any>) => {
      const updated = {
        ...manifest,
        // Enforce a hardcoded application ID so iOS doesn't 
        // treat different hashes as different apps.
        id: manifest.id || window.location.pathname,
        
        // Inject the bootstrap parameters cleanly
        start_url: window.location.pathname + hash,
      };

      const blob = new Blob([JSON.stringify(updated)], {
        type: "application/manifest+json",
      });
      
      // Clean up previous blob URLs if applicable to prevent memory leaks
      if (link.href.startsWith("blob:")) {
        URL.revokeObjectURL(link.href);
      }

      link.href = URL.createObjectURL(blob);
    })
    .catch(() => {
      // Graceful fallback to original manifest file on network error
    });
}