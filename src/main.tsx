import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { installManifestStartUrlOverride } from "./pwaManifestBootstrap.ts";

installManifestStartUrlOverride();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
