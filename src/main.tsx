import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// --- Purga única de cache/service worker antigo ---
// Ao subir uma nova versão, incremente APP_CACHE_VERSION: todos os dispositivos
// que ainda estiverem com cache antigo apagam tudo e recarregam uma única vez.
const APP_CACHE_VERSION = "2026-08-19-1";
if (typeof window !== "undefined" && window.location.protocol.startsWith("http")) {
  const chave = "app-cache-version";
  if (localStorage.getItem(chave) !== APP_CACHE_VERSION) {
    (async () => {
      try {
        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (e) {
        console.warn("Falha ao limpar cache antigo:", e);
      } finally {
        localStorage.setItem(chave, APP_CACHE_VERSION);
        window.location.reload();
      }
    })();
  }
}


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
