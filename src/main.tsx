import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  // registrar apenas em produção e quando sw.js estiver presente
  if (import.meta.env.PROD && window.location.protocol.startsWith('http')) {
    fetch('/sw.js', { method: 'HEAD' })
      .then((res) => {
        const contentType = res.headers.get('content-type') ?? '';
        if (res.ok && contentType.includes('javascript')) {
          navigator.serviceWorker
            .register('/sw.js')
            .catch((err) => console.warn('SW registration failed:', err));
        } else {
          console.warn('sw.js não encontrado ou MIME incorreto:', res.status, contentType);
        }
      })
      .catch((err) => {
        console.warn('Não registrando ServiceWorker (fetch falhou):', err);
      });
  } else {
    // ambiente dev/localhost: não registrar SW
    console.info('ServiceWorker não registrado em dev/localhost.');
  }
}

