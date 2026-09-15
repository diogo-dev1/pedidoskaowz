import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';

function deveDesativarServiceWorker() {
  const { hostname, search } = window.location;

  return (
    !import.meta.env.PROD
    || window.self !== window.top
    || hostname.startsWith('id-preview--')
    || hostname.startsWith('preview--')
    || hostname === 'lovableproject.com'
    || hostname.endsWith('.lovableproject.com')
    || hostname === 'lovableproject-dev.com'
    || hostname.endsWith('.lovableproject-dev.com')
    || hostname === 'beta.lovable.dev'
    || hostname.endsWith('.beta.lovable.dev')
    || new URLSearchParams(search).get('sw') === 'off'
  );
}

async function removerServiceWorkerDoApp() {
  if (!('serviceWorker' in navigator)) return;

  const registros = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registros
      .filter((registro) => new URL(registro.active?.scriptURL ?? registro.installing?.scriptURL ?? registro.waiting?.scriptURL ?? '', window.location.origin).pathname === '/sw.js')
      .map((registro) => registro.unregister()),
  );
}

function AvisoAtualizacao() {
  const {
    needRefresh: [precisaAtualizar],
    updateServiceWorker,
  } = useRegisterSW();

  if (!precisaAtualizar) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-accent bg-zinc-900 px-3 py-2 text-zinc-100 shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <p className="text-xs font-medium sm:text-sm">Nova versão disponível</p>
        <Button size="sm" className="h-8 shrink-0" onClick={() => void updateServiceWorker(true)}>
          Atualizar
        </Button>
      </div>
    </div>
  );
}

export default function AtualizacaoDisponivel() {
  if (deveDesativarServiceWorker()) {
    void removerServiceWorkerDoApp();
    return null;
  }

  return <AvisoAtualizacao />;
}