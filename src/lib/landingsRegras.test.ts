import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  agruparPorGrupo,
  agruparPorNivel,
  bateComFiltros,
  comparativo,
  ctaEfetivo,
  destinoCta,
  exibicaoPrecoEfetiva,
  formatarPreco,
  garantiaTexto,
  gerarSlug,
  prazoTexto,
  modeloEhPublico,
  nivelEfetivo,
  resolverLamina,
  slugValido,
  sugerirModelos,
  taxaFim,
  textoEfetivo,
  textoSemHtml,
  type Landing,
  type LandingLamina,
  type ModeloLanding,
} from './landingsRegras';

const wa = (m: string) => `https://wa.me/5528999025695?text=${encodeURIComponent(m)}`;

const landing: Landing = {
  id: 'l1', slug: 'porte-velado', titulo: 'Porte velado', frase_abertura: null, subtitulo: null,
  capa_url: null, capa_tipo: 'imagem', publicada: true, ordem: 0, filtro_casos_uso: [], filtro_tipo_porte: ['velado'],
  texto_nivel_entrada: null, texto_nivel_ideal: null, texto_nivel_definitiva: null,
  preco_entrada: 'mostrar', preco_ideal: 'a_partir', preco_definitiva: 'consulta',
  cta_entrada: 'detalhes', cta_ideal: 'montar', cta_definitiva: 'vendedor',
  mensagem_whatsapp: 'Olá! Vi a página de porte velado da Kaowz e quero saber mais',
};

const modelo = (o: Partial<ModeloLanding> = {}): ModeloLanding => ({
  id: 'm1', nome_modelo: 'EDC Mini', preco_base: 1090, imagem_modelo: null, video_url: null,
  posicao_escada: null, grupo_escada: null, casos_uso: [], tipo_porte: [], porque_texto: null,
  apresentacao_venda: null, prazo_entrega: null, garantia: null, pronta_entrega: false,
  visivel_catalogo: true, visivel_publico: true, ...o,
});

const lamina = (o: Partial<LandingLamina> = {}): LandingLamina => ({
  id: 'x1', landing_id: 'l1', modelo_id: 'm1', ordem: 0, nivel_override: null, texto_categoria: null,
  preco_override: null, cta_override: null, url_compra: null, destaque: false, ...o,
});

test('nível: override → posição na escada → ideal', () => {
  assert.equal(nivelEfetivo(lamina({ nivel_override: 'definitiva' }), modelo({ posicao_escada: 'entrada' })), 'definitiva');
  assert.equal(nivelEfetivo(lamina(), modelo({ posicao_escada: 'entrada' })), 'entrada');
  assert.equal(nivelEfetivo(lamina(), modelo({ posicao_escada: null })), 'ideal');
  assert.equal(nivelEfetivo(lamina(), modelo({ posicao_escada: 'premium' })), 'ideal');
});

test('texto: categoria → porquê → apresentação sem HTML', () => {
  const m = modelo({ porque_texto: 'Porquê', apresentacao_venda: '<p>Apresentação</p>' });
  assert.equal(textoEfetivo(lamina({ texto_categoria: ' Para velado ' }), m), 'Para velado');
  assert.equal(textoEfetivo(lamina({ texto_categoria: '   ' }), m), 'Porquê');
  assert.equal(textoEfetivo(lamina(), modelo({ apresentacao_venda: '<p>Aço <b>Sandvik</b>&nbsp;14C28N</p><p>Fosco</p>' })), 'Aço Sandvik 14C28N Fosco');
  assert.equal(textoEfetivo(lamina(), modelo()), '');
});

test('apresentação da Shopify perde o rótulo "Descrição do produto"', () => {
  assert.equal(textoEfetivo(lamina(), modelo({ apresentacao_venda: 'Descrição do produto  O design da lâmina  Wharncliffe' })), 'O design da lâmina Wharncliffe');
  assert.equal(textoEfetivo(lamina(), modelo({ apresentacao_venda: 'DESCRICAO DO PRODUTO: Aço 52100' })), 'Aço 52100');
  assert.equal(textoEfetivo(lamina(), modelo({ apresentacao_venda: 'Essa é nossa EDC Ring' })), 'Essa é nossa EDC Ring');
});

test('textoSemHtml lida com quebras e entidades', () => {
  assert.equal(textoSemHtml('Linha 1<br/>Linha 2 &amp; mais'), 'Linha 1 Linha 2 & mais');
  assert.equal(textoSemHtml(null), '');
});

test('preço e CTA: override da lâmina → padrão do nível na landing', () => {
  assert.equal(exibicaoPrecoEfetiva(lamina(), landing, 'ideal'), 'a_partir');
  assert.equal(exibicaoPrecoEfetiva(lamina({ preco_override: 'mostrar' }), landing, 'definitiva'), 'mostrar');
  assert.equal(ctaEfetivo(lamina(), landing, 'definitiva'), 'vendedor');
  assert.equal(ctaEfetivo(lamina({ cta_override: 'detalhes' }), landing, 'definitiva'), 'detalhes');
  // Landing com valor inválido cai no padrão do sistema
  assert.equal(ctaEfetivo(lamina(), { ...landing, cta_ideal: 'x' as never }, 'ideal'), 'montar');
});

test('formatar preço', () => {
  const nbsp = (s: string) => s.replace(/\u00a0/g, ' ');
  assert.equal(nbsp(formatarPreco('mostrar', 1090)), 'R$ 1.090,00');
  assert.equal(nbsp(formatarPreco('a_partir', 1090)), 'a partir de R$ 1.090,00');
  assert.equal(formatarPreco('consulta', 1090), 'Valor sob consulta');
  assert.equal(formatarPreco('mostrar', 0), 'Valor sob consulta');
  assert.equal(formatarPreco('mostrar', null), 'Valor sob consulta');
});

test('destino do CTA', () => {
  const m = modelo({ id: 'abc', nome_modelo: 'KZR Nimbus' });
  assert.deepEqual(destinoCta('detalhes', { modelo: m, urlCompra: 'https://kaowz.com.br/p/nimbus', linkWhatsApp: wa }), { href: 'https://kaowz.com.br/p/nimbus', externo: true });
  assert.deepEqual(destinoCta('detalhes', { modelo: m, urlCompra: '  ', linkWhatsApp: wa }), { href: '/catalogo/abc', externo: false });
  assert.deepEqual(destinoCta('montar', { modelo: m, linkWhatsApp: wa }), { href: '/montar?modelo=KZR%20Nimbus', externo: false });
  const vendedor = destinoCta('vendedor', { modelo: m, mensagemWhatsapp: 'Olá! Vi a página', linkWhatsApp: wa });
  assert.equal(vendedor.externo, true);
  assert.equal(decodeURIComponent(vendedor.href.split('text=')[1]), 'Olá! Vi a página — KZR Nimbus');
});

test('resolverLamina junta tudo', () => {
  const r = resolverLamina(landing, lamina({ destaque: true }), modelo({ posicao_escada: 'definitiva', porque_texto: 'Peça de coleção' }), wa);
  assert.equal(r.nivel, 'definitiva');
  assert.equal(r.precoTexto, 'Valor sob consulta');
  assert.equal(r.cta, 'vendedor');
  assert.equal(r.ctaLabel, 'Falar com um vendedor');
  assert.equal(r.texto, 'Peça de coleção');
  assert.equal(r.destaque, true);
});

test('agrupar por nível e comparativo', () => {
  const ls = [
    { id: 'a', nivel: 'ideal' as const, ordem: 2 },
    { id: 'b', nivel: 'entrada' as const, ordem: 5 },
    { id: 'c', nivel: 'ideal' as const, ordem: 1 },
  ];
  const g = agruparPorNivel(ls);
  assert.deepEqual(g.ideal.map((l) => l.id), ['c', 'a']);
  assert.deepEqual(g.definitiva, []);
  assert.deepEqual(comparativo(ls).map((l) => l.id), ['b', 'c']);
});

test('modelo público e sugestão por filtro', () => {
  assert.equal(modeloEhPublico(modelo()), true);
  assert.equal(modeloEhPublico(modelo({ visivel_publico: false })), false);
  assert.equal(modeloEhPublico(null), false);
  assert.equal(bateComFiltros(modelo({ tipo_porte: ['velado'], casos_uso: ['edc_urbano'] }), { casosUso: [], tiposPorte: ['velado'] }), true);
  assert.equal(bateComFiltros(modelo({ tipo_porte: ['velado'], casos_uso: ['caca'] }), { casosUso: ['edc_urbano'], tiposPorte: ['velado'] }), false);
  const grupos = sugerirModelos(
    [
      modelo({ id: '1', nome_modelo: 'EDC Mini', grupo_escada: 'EDC Mini', tipo_porte: ['velado'] }),
      modelo({ id: '2', nome_modelo: 'Ring Tantô', grupo_escada: 'Ring', tipo_porte: ['velado'] }),
      modelo({ id: '3', nome_modelo: 'Avulsa', grupo_escada: null, tipo_porte: ['velado'] }),
      modelo({ id: '4', nome_modelo: 'Oculta', tipo_porte: ['velado'], visivel_catalogo: false }),
      modelo({ id: '5', nome_modelo: 'Camp', tipo_porte: ['mochila_colete'] }),
    ],
    { casosUso: [], tiposPorte: ['velado'] },
  );
  assert.deepEqual(grupos.map((g) => g.grupo), ['EDC Mini', 'Ring', 'Sem família']);
  assert.deepEqual(agruparPorGrupo([]), []);
});

test('slug', () => {
  assert.equal(gerarSlug('Porte velado'), 'porte-velado');
  assert.equal(gerarSlug('  Caça & Pesca — Ação!  '), 'caca-pesca-acao');
  assert.equal(slugValido('porte-velado'), true);
  assert.equal(slugValido('Porte velado'), false);
  assert.equal(slugValido('-x'), false);
});

test('prazo e garantia do comparativo', () => {
  assert.equal(prazoTexto(modelo({ pronta_entrega: true, prazo_entrega: '65 dias úteis' })), 'Pronta entrega');
  assert.equal(prazoTexto(modelo({ prazo_entrega: ' 40 dias úteis ' })), '40 dias úteis');
  assert.equal(prazoTexto(modelo()), 'Até 65 dias úteis');
  assert.equal(garantiaTexto(modelo({ garantia: 'Vitalicia' })), 'Vitalicia');
  assert.equal(garantiaTexto(modelo({ garantia: '  ' })), 'Vitalícia');
});

test('taxa de fim', () => {
  const base = { landing_id: 'l', cliques_detalhes: 0, cliques_montar: 0, cliques_vendedor: 0, cliques_quiz: 0 };
  assert.equal(taxaFim({ ...base, visitas: 0, fins: 0 }), null);
  assert.equal(taxaFim({ ...base, visitas: 3, fins: 1 }), 33);
  assert.equal(taxaFim({ ...base, visitas: 2, fins: 5 }), 100);
});
