import { useEffect } from 'react';

/**
 * Redireciona o navegador para uma URL externa assim que a rota é acessada.
 * Usado para "tirar do ar" temporariamente uma página interna, apontando
 * para o site oficial enquanto o conteúdo é atualizado.
 */
export default function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-center px-6">
      <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">
        Redirecionando para{' '}
        <a href={to} className="text-accent underline underline-offset-2">
          kaowz.com.br
        </a>
        …
      </p>
    </div>
  );
}
