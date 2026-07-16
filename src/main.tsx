import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Service Worker com auto-reload quando há nova versão publicada.
// Assim, ao publicar uma atualização, todos os dispositivos conectados
// pegam a versão nova sem precisar limpar cache.
if ("serviceWorker" in navigator && import.meta.env.PROD && window.location.protocol.startsWith("http")) {
  const isPreview =
    window.self !== window.top ||
    /^(id-)?preview--/.test(window.location.hostname) ||
    window.location.hostname.endsWith(".lovableproject.com");

  if (!isPreview) {
    let reloading = false;
    // Quando o novo SW assume controle, recarrega a página uma vez.
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });

    fetch("/sw.js", { method: "HEAD" })
      .then((res) => {
        const contentType = res.headers.get("content-type") ?? "";
        if (!res.ok || !contentType.includes("javascript")) return;

        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            // Verifica atualização periodicamente e ao focar a aba
            const checkForUpdate = () => registration.update().catch(() => {});
            setInterval(checkForUpdate, 60_000);
            window.addEventListener("focus", checkForUpdate);

            // Se já existir um SW esperando, ativa imediatamente
            if (registration.waiting) {
              registration.waiting.postMessage({ type: "SKIP_WAITING" });
            }
            registration.addEventListener("updatefound", () => {
              const installing = registration.installing;
              if (!installing) return;
              installing.addEventListener("statechange", () => {
                if (installing.state === "installed" && navigator.serviceWorker.controller) {
                  installing.postMessage({ type: "SKIP_WAITING" });
                }
              });
            });
          })
          .catch((err) => console.warn("SW registration failed:", err));
      })
      .catch(() => {});
  }
}
