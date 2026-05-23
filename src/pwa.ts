import React from "react";

const DISMISSED_KEY = "pwaInstallHintDismissed";

function checkIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  // iOS Safari
  return (
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true
  );
}

function checkIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

export function useShouldShowInstallHint(): boolean {
  const [isStandalone, setIsStandalone] = React.useState(checkIsStandalone);
  const [isMobile, setIsMobile] = React.useState(checkIsMobile);

  React.useEffect(() => {
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const mobileQuery = window.matchMedia("(max-width: 768px)");
    const onStandaloneChange = () => setIsStandalone(checkIsStandalone());
    const onMobileChange = () => setIsMobile(mobileQuery.matches);
    standaloneQuery.addEventListener("change", onStandaloneChange);
    mobileQuery.addEventListener("change", onMobileChange);
    return () => {
      standaloneQuery.removeEventListener("change", onStandaloneChange);
      mobileQuery.removeEventListener("change", onMobileChange);
    };
  }, []);

  return isMobile && !isStandalone;
}

export function loadInstallHintDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveInstallHintDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
}
