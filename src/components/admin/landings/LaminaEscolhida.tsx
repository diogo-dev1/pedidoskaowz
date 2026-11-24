import { useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  CTA_LABEL,
  CTA_LABEL_ADMIN,
  EXIBICOES_PRECO,
  NIVEIS,
  NIVEL_LABEL,
  PRECO_LABEL,
  TIPOS_CTA,
  ctaEfetivo,
  exibicaoPrecoEfetiva,
  formatarBRL,
  formatarPreco,
  modeloEhPublico,
  nivelEfetivo,
  textoEfetivo,
  type ExibicaoPreco,
  type LandingEdicao,
  type NivelLanding,
  type TipoCta,
} from '@/lib/landings';
import { Campo } from './Campo';
import { PADRAO, type LaminaEditor } from './tipos';

interface Props {
  lamina: LaminaEditor;
  landing: LandingEdicao;
  alterar: (campos: Partial<LaminaEditor>) => void;
  remover: () => void;
  subir?: () => void;
  descer?: () => void;
}

export function LaminaEscolhida({ lamina, landing, alterar, remover, subir, descer }: Props) {
  const [aberta, setAberta] = useState(false);
  const modelo = lamina.modelo;
  const nome = modelo?.nome_modelo ?? 'Modelo removido do catálogo';
  const base = { posicao_escada: modelo?.posicao_escada ?? null };
  const nivelDoModelo = nivelEfetivo({ nivel_override: null }, base);
  const nivel = nivelEfetivo(lamina, base);
  const preco = exibicaoPrecoEfetiva(lamina, landing, nivel);
  const precoPadrao = exibicaoPrecoEfetiva({ preco_override: null }, landing, nivel);
  const cta = ctaEfetivo(lamina, landing, nivel);
  const ctaPadrao = ctaEfetivo({ cta_override: null }, landing, nivel);
  const textoPadrao = modelo ? textoEfetivo({ texto_categoria: null }, modelo) : '';
  const foraDoPublico = !modeloEhPublico(modelo);
  const idBase = `lamina-${lamina.modelo_id}`;

  return (
    <div className={`rounded-lg border bg-card ${foraDoPublico ? 'border-warning/50' : ''}`}>
      <div className="flex items-center gap-3 p-3">
        <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-muted">
          {modelo?.imagem_modelo && <img src={modelo.imagem_modelo} alt="" loading="lazy" className="h-full w-full object-cover" />}
        </div>
        <button
          type="button"
          onClick={() => setAberta((v) => !v)}
          aria-expanded={aberta}
          aria-controls={`${idBase}-detalhes`}
          className="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex items-start gap-1.5">
            {lamina.destaque && <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-primary text-primary" aria-label="Destaque" />}
            <span className="line-clamp-2 text-sm font-medium leading-5">{nome}</span>
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {modelo ? formatarPreco(preco, modelo.preco_base) : '—'} · {CTA_LABEL[cta]}
          </span>
        </button>
        <div className="flex shrink-0 items-center">
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={subir} disabled={!subir} aria-label={`Subir ${nome}`}>
            <ArrowUp />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={descer} disabled={!descer} aria-label={`Descer ${nome}`}>
            <ArrowDown />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => setAberta((v) => !v)} aria-label={aberta ? 'Fechar edição' : 'Editar'}>
            <ChevronDown className={`transition-transform duration-150 ${aberta ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {foraDoPublico && (
        <p className="mx-3 mb-3 flex items-start gap-2 rounded-md bg-warning/10 p-2 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Este modelo não está mais visível no catálogo público, então não aparece na página.
        </p>
      )}

      {aberta && (
        <div id={`${idBase}-detalhes`} className="grid gap-4 border-t p-4 md:grid-cols-2">
          <Campo rotulo="Nível na escada" ajuda="Em que bloco da página a lâmina aparece.">
            <Select
              value={lamina.nivel_override ?? PADRAO}
              onValueChange={(v) => alterar({ nivel_override: v === PADRAO ? null : (v as NivelLanding) })}
            >
              <SelectTrigger aria-label="Nível na escada"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={PADRAO}>Do cadastro do modelo ({NIVEL_LABEL[nivelDoModelo]})</SelectItem>
                {NIVEIS.map((n) => <SelectItem key={n} value={n}>{NIVEL_LABEL[n]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Campo>

          <Campo rotulo="Preço" ajuda={modelo ? `Preço base: ${formatarBRL(Number(modelo.preco_base))}` : undefined}>
            <Select
              value={lamina.preco_override ?? PADRAO}
              onValueChange={(v) => alterar({ preco_override: v === PADRAO ? null : (v as ExibicaoPreco) })}
            >
              <SelectTrigger aria-label="Exibição do preço"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={PADRAO}>Padrão do nível ({PRECO_LABEL[precoPadrao]})</SelectItem>
                {EXIBICOES_PRECO.map((p) => <SelectItem key={p} value={p}>{PRECO_LABEL[p]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Campo>

          <Campo rotulo="Botão (CTA)" ajuda="Para onde o botão do card leva.">
            <Select
              value={lamina.cta_override ?? PADRAO}
              onValueChange={(v) => alterar({ cta_override: v === PADRAO ? null : (v as TipoCta) })}
            >
              <SelectTrigger aria-label="Botão do card"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={PADRAO}>Padrão do nível ({CTA_LABEL_ADMIN[ctaPadrao]})</SelectItem>
                {TIPOS_CTA.map((c) => <SelectItem key={c} value={c}>{CTA_LABEL_ADMIN[c]}</SelectItem>)}
              </SelectContent>
            </Select>
          </Campo>

          <Campo
            rotulo="URL de compra"
            htmlFor={`${idBase}-url`}
            ajuda='Link do produto na loja, usado por "Ver detalhes". Sem link, o botão abre o catálogo.'
          >
            <Input
              id={`${idBase}-url`}
              type="url"
              inputMode="url"
              placeholder="https://kaowz.com.br/products/…"
              value={lamina.url_compra ?? ''}
              onChange={(e) => alterar({ url_compra: e.target.value || null })}
            />
          </Campo>

          <Campo
            rotulo="Texto para esta categoria"
            htmlFor={`${idBase}-texto`}
            className="md:col-span-2"
            ajuda="Por que esta lâmina serve para esta categoria. Vazio usa o texto do cadastro do modelo."
          >
            <Textarea
              id={`${idBase}-texto`}
              rows={2}
              placeholder={textoPadrao ? `Padrão: ${textoPadrao.slice(0, 140)}${textoPadrao.length > 140 ? '…' : ''}` : 'Sem texto no cadastro do modelo'}
              value={lamina.texto_categoria ?? ''}
              onChange={(e) => alterar({ texto_categoria: e.target.value || null })}
            />
          </Campo>

          <div className="flex items-center justify-between gap-4 md:col-span-2">
            <div className="flex items-center gap-3">
              <Switch id={`${idBase}-destaque`} checked={lamina.destaque} onCheckedChange={(v) => alterar({ destaque: v })} />
              <label htmlFor={`${idBase}-destaque`} className="text-sm">
                Destaque <span className="text-muted-foreground">· ganha selo no card</span>
              </label>
            </div>
            <Button type="button" variant="ghost" className="h-10 rounded-lg text-muted-foreground hover:text-destructive" onClick={remover}>
              <Trash2 /> Remover
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
