import { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import kaowzLogo from '@/assets/kaowz-logo.png';
import {
  ACO_KEYS,
  ACO_NAMES,
  EMPUNHADURA_KEYS,
  EMPUNHADURA_NAMES,
  FINISH_KEYS,
  FINISH_NAMES,
  SIZE_LIST,
  VERSION_LIST,
  loadKitConfig,
  type KitConfig,
  type VersionConfig,
} from '@/pages/ConfiguradorKit';

const moeda = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

const medida = (valor: number) => valor.toFixed(2).replace('.', ',');

function CelulaTamanho({ tamanho }: { tamanho: (typeof SIZE_LIST)[number] }) {
  return (
    <div className="min-w-36">
      <strong className="block text-sm font-black text-foreground">{tamanho.name}</strong>
      <div className="mt-1 space-y-0.5 text-[11px] leading-4 text-muted-foreground">
        <span className="block">Lâmina {medida(tamanho.bladeMm)} mm</span>
        <span className="block">Empunhadura {medida(tamanho.gripMm)} mm</span>
        <span className="block text-foreground/70">Total {medida(tamanho.bladeMm + tamanho.gripMm)} mm</span>
      </div>
    </div>
  );
}

function TabelaSimples({ versao }: { versao: VersionConfig }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[560px] border-collapse">
        <thead className="bg-muted/70">
          <tr>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-muted-foreground">Tamanho</th>
            {versao.hasFinishes ? (
              FINISH_KEYS.map((acabamento) => (
                <th key={acabamento} className="px-4 py-3 text-right text-[11px] font-bold uppercase text-muted-foreground">
                  {FINISH_NAMES[acabamento]}
                </th>
              ))
            ) : (
              <th className="px-4 py-3 text-right text-[11px] font-bold uppercase text-muted-foreground">Preço</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {SIZE_LIST.map((tamanho) => (
            <tr key={tamanho.key} className="bg-card">
              <td className="px-4 py-3"><CelulaTamanho tamanho={tamanho} /></td>
              {versao.hasFinishes ? (
                FINISH_KEYS.map((acabamento) => (
                  <td key={acabamento} className="whitespace-nowrap px-4 py-3 text-right text-sm font-bold text-primary">
                    {moeda(versao.prices[tamanho.key][acabamento])}
                  </td>
                ))
              ) : (
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-bold text-primary">
                  {moeda(versao.prices[tamanho.key].satin)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaMetalica({ versao }: { versao: VersionConfig }) {
  const precos = versao.pricesByConfig;
  if (!precos) return <TabelaSimples versao={versao} />;

  return (
    <div className="space-y-5">
      {ACO_KEYS.flatMap((aco) =>
        EMPUNHADURA_KEYS.map((empunhadura) => (
          <section key={`${aco}-${empunhadura}`}>
            <h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">
              {ACO_NAMES[aco]} · {EMPUNHADURA_NAMES[empunhadura]}
            </h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[660px] border-collapse">
                <thead className="bg-muted/70">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase text-muted-foreground">Tamanho</th>
                    {FINISH_KEYS.map((acabamento) => (
                      <th key={acabamento} className="px-4 py-3 text-right text-[11px] font-bold uppercase text-muted-foreground">
                        {FINISH_NAMES[acabamento]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {SIZE_LIST.map((tamanho) => (
                    <tr key={tamanho.key} className="bg-card">
                      <td className="px-4 py-3"><CelulaTamanho tamanho={tamanho} /></td>
                      {FINISH_KEYS.map((acabamento) => (
                        <td key={acabamento} className="whitespace-nowrap px-4 py-3 text-right text-sm font-bold text-primary">
                          {moeda(precos[tamanho.key][aco][empunhadura][acabamento])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )),
      )}
    </div>
  );
}

export default function TabelaPrecosPushDagger() {
  const [config, setConfig] = useState<KitConfig | null>(null);

  useEffect(() => {
    document.title = 'Tabela de Preços Push Dagger — Kaowz';
    void loadKitConfig().then(setConfig);
  }, []);

  const compartilhar = async () => {
    const dados = { title: 'Tabela de Preços Push Dagger — Kaowz', url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(dados);
        return;
      }
      await navigator.clipboard.writeText(dados.url);
      toast.success('Link copiado');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error('Não foi possível compartilhar o link');
    }
  };

  return (
    <main className="dark min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-background text-foreground">
      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-6">
          <Link to="/push-dagger-kaowz" aria-label="Kaowz Push Dagger">
            <img src={kaowzLogo} alt="Kaowz" className="h-9 w-auto object-contain" />
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={compartilhar} className="gap-2">
            <Share2 className="h-4 w-4" />
            Compartilhar
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-3 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 border-l-4 border-primary pl-4 sm:mb-10">
          <p className="mb-2 text-xs font-bold uppercase text-primary">Tabela de Preços</p>
          <h1 className="text-3xl font-black leading-tight sm:text-5xl">Push Dagger · Todas as Configurações</h1>
          <p className="mt-3 text-sm text-muted-foreground">Valores por unidade. Bainha Velada inclusa.</p>
        </div>

        {!config ? (
          <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">Carregando preços...</div>
        ) : (
          <div className="space-y-8">
            {VERSION_LIST.map(({ key, label }) => {
              const versao = config.versions[key];
              return (
                <article key={key} className="overflow-hidden rounded-lg border border-border bg-card">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-4 sm:px-6">
                    <h2 className="text-xl font-black">{versao.texts.tabLabel || label}</h2>
                    {!versao.hasFinishes && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-primary" /> Acabamento único
                      </span>
                    )}
                  </div>
                  <div className="p-3 sm:p-6">
                    {versao.hasAcoEmpunhadura ? <TabelaMetalica versao={versao} /> : <TabelaSimples versao={versao} />}
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm">
                      <span className="text-muted-foreground">Bainha Extra</span>
                      <strong className="text-primary">+ {moeda(versao.bainhaExtraPrice)}</strong>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button asChild size="lg" className="gap-2">
            <Link to="/push-dagger-kaowz">Montar minha Push Dagger <ArrowRight className="h-4 w-4" /></Link>
          </Button>
          <Button type="button" variant="outline" size="lg" onClick={compartilhar} className="gap-2">
            <Copy className="h-4 w-4" /> Compartilhar tabela
          </Button>
        </div>

        <p className="mt-8 text-center text-[11px] leading-5 text-muted-foreground">
          Garantia vitalícia · Afiação vitalícia gratuita · Certificado oficial<br />Venda exclusiva para maiores de 18 anos.
        </p>
      </div>
    </main>
  );
}