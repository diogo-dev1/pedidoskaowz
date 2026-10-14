import { entregaDaEntrada, nomeBainha, nomeCatalogo, temLaser, type PedidoEntry, type SimuladorData } from './simuladorData';

export const SEPARADOR_NOTA = '━━━━━━━━━━━━━━━━━━';
export function textoNota(value: string): string {
  return value.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').trim();
}
export function linhasCurtas(value: string, limite = 32): string {
  return textoNota(value).split('\n').map((line) => {
    const result: string[] = [];
    let atual = '';
    for (const word of line.trim().split(/\s+/)) {
      if (atual && atual.length + word.length + 1 > limite) { result.push(atual); atual = ''; }
      atual += (atual ? ' ' : '') + word;
    }
    if (atual) result.push(atual);
    return result.join('\n');
  }).join('\n');
}
const preenchido = (value?: string) => !!value?.trim() && !/^(não|nao|desligado)$/i.test(value.trim());

export function montarNotasInternas(data: SimuladorData, entries: PedidoEntry[]): string[] {
  const grupos = new Map<number, string[]>();
  const itens: string[] = [];
  entries.forEach((entry, index) => {
    const pe = entregaDaEntrada(entry);
    let titulo = '';
    let quantidade = 1;
    const linhas: string[] = [];
    if (entry.kind === 'faca') {
      const cfg = entry.faca;
      const modelo = cfg.modeloIdx === null ? undefined : data.modelos[cfg.modeloIdx];
      titulo = cfg.origem?.produtoTitulo ?? modelo?.nome ?? 'Faca';
      linhas.push(`${index + 1} · ${textoNota(titulo).toUpperCase()}`);
      const materiais = [data.acos[cfg.acoIdx]?.nome, data.acabamentos[cfg.acabIdx]?.nome].filter((v) => preenchido(v));
      if (materiais.length) linhas.push(materiais.join(' · '));
      if (cfg.bruteForge) linhas.push('Brute Forge');
      const cabo = [data.empunhaduras[cfg.empIdx]?.nome, cfg.empCor].filter(Boolean).join(' ');
      if (preenchido(cabo)) linhas.push(`Cabo: ${cabo}`);
      if (cfg.dragonScale) linhas.push('Dragon Scale');
      if (cfg.espacador) linhas.push(`Espaçador: ${cfg.espacadorCor || 'Sim'}`);
      (cfg.bainhaIdxs ?? []).forEach((idx) => { const bainha = nomeBainha(data, cfg, idx); if (preenchido(bainha)) linhas.push(`Bainha: ${bainha}`); });
      if (!cfg.semGravacao && temLaser(cfg)) {
        const gravacoes = Object.entries(cfg.gravacoes ?? {});
        if (gravacoes.length) gravacoes.forEach(([local, texto]) => {
          if (preenchido(texto)) linhas.push(`GRAVAR (${local}):`, `"${texto.trim()}"`);
        });
        else if (preenchido(cfg.textoLaser)) linhas.push('GRAVAR (Personalização):', `"${cfg.textoLaser?.trim()}"`);
      }
      if (preenchido(cfg.certificado)) linhas.push(`Certificado: ${cfg.certificado?.trim()}`);
      if (preenchido(cfg.embalagem)) linhas.push(`Embalagem: ${cfg.embalagem?.trim()}`);
    } else {
      titulo = entry.kind === 'catalogo' ? nomeCatalogo(entry.catalogo) : entry.kind === 'avulso' ? data.adicionais[entry.avulso.adicionalIdx]?.nome ?? 'Acessório' : entry.custom.descricao.trim() || 'Item personalizado';
      quantidade = entry.kind === 'catalogo' ? entry.catalogo.quantidade : entry.kind === 'avulso' ? entry.avulso.quantidade : entry.custom.quantidade;
      linhas.push(`${index + 1} · ${textoNota(titulo)}${quantidade > 1 ? ` ×${quantidade}` : ''}${entry.kind === 'custom' && entry.custom.brinde ? ' (Brinde)' : ''}`);
    }
    if (pe.pronta) grupos.set(pe.prazo, [...(grupos.get(pe.prazo) ?? []), linhasCurtas(`• ${quantidade}x ${titulo}`)]);
    itens.push(entry.kind === 'faca' ? linhas.map((line) => linhasCurtas(line)).join('\n') : linhas.join('\n'));
  });
  const out: string[] = [];
  if (grupos.size) {
    out.push('⚡ PRONTA ENTREGA');
    [...grupos].sort(([a], [b]) => a - b).forEach(([prazo, lista]) => out.push(`Enviar em até ${prazo} dias úteis:`, ...lista));
  }
  out.push(SEPARADOR_NOTA, `PEDIDO INTERNO · ${entries.length} ${entries.length === 1 ? 'item' : 'itens'}`, SEPARADOR_NOTA, itens.join('\n\n'));
  return out;
}
