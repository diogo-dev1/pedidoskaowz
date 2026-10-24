import { Plus } from 'lucide-react';

/**
 * Barra de montagem ("monte seu lanche"): sempre fixa no topo do configurador.
 * Esquerda: a(s) Push Dagger(s) escolhida(s), trocando a cada escolha.
 * Direita, na mesma linha: o total. No PC, o botão de compra fica junto.
 *
 * Só apresentação — estado, preços e fotos vêm do ConfiguradorKit.
 * Estilos no bloco "Barra de montagem" do css de src/pages/ConfiguradorKit.tsx (escopo .ck-root).
 */

export interface ItemMontagem {
  /** Muda quando a foto muda — remonta a imagem para o fade de troca. */
  chave: string;
  imagem: string;
  /** Ex.: "Standard" */
  nome: string;
  /** Ex.: "Stone Washed · G10 Black" */
  resumo: string;
}

interface Props {
  itens: ItemMontagem[];
  /** Valor numérico do total: muda a key do preço para o "pulso" ao mudar. */
  totalValor: number;
  totalTexto: string;
  /** Preço "De" quando há desconto. */
  totalAntigoTexto?: string;
  podeAdicionar: boolean;
  /** % de desconto que a próxima unidade libera (0 = nenhum). */
  descontoAoAdicionar: number;
  onAdicionar: () => void;
  onVerItem: (indice: number) => void;
  linkCompra: string;
  textoCompra: string;
}

export function BarraMontagem({
  itens,
  totalValor,
  totalTexto,
  totalAntigoTexto,
  podeAdicionar,
  descontoAoAdicionar,
  onAdicionar,
  onVerItem,
  linkCompra,
  textoCompra,
}: Props) {
  const kit = itens.length > 1;

  return (
    <div className="build-bar" role="region" aria-label="Sua montagem">
      <div className="build-bar-inner">
        {/* ── Esquerda: o que está sendo montado ── */}
        <div className="build-items">
          {itens.map((item, i) => (
            <button
              key={i}
              type="button"
              className="build-item"
              onClick={() => onVerItem(i)}
              aria-label={`Ver opções da ${kit ? `unidade ${i + 1}, ` : ''}${item.nome}`}
            >
              <img key={item.chave} src={item.imagem} alt="" className="ck-swap" />
              {kit && <span className="build-item-tag">{item.nome}</span>}
            </button>
          ))}

          {/* Com 1 unidade há espaço para dizer o que é */}
          {!kit && itens[0] && (
            <div className="build-text">
              <span className="build-name">{itens[0].nome}</span>
              <span key={itens[0].resumo} className="build-cfg ck-swap">{itens[0].resumo}</span>
            </div>
          )}

          {podeAdicionar && (
            <button type="button" className="build-add" onClick={onAdicionar} aria-label="Adicionar outra Push Dagger ao kit">
              <Plus aria-hidden="true" />
              {descontoAoAdicionar > 0 && <span className="build-add-disc">-{descontoAoAdicionar}%</span>}
            </button>
          )}
        </div>

        {/* ── Direita, na mesma linha: o valor ── */}
        <div className="build-price" aria-live="polite">
          {totalAntigoTexto && <span className="build-old">{totalAntigoTexto}</span>}
          <span key={totalValor} className="build-total ck-pop">{totalTexto}</span>
          {kit && <span className="build-qty">{itens.length} unidades</span>}
        </div>

        {/* PC: compra na mesma barra. No celular ela fica na barra de baixo. */}
        <a className="btn-cta build-buy" href={linkCompra} target="_blank" rel="noopener noreferrer">
          {textoCompra}
        </a>
      </div>
    </div>
  );
}
