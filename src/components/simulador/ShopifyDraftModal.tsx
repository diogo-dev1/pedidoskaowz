import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, ShoppingBag, Sparkles, Copy, Send, ExternalLink, Truck, AlertTriangle } from 'lucide-react';
import { classificarItemPE, PRAZO_PADRAO_PRONTA, PRAZO_PADRAO_ENCOMENDA } from '@/lib/prontaEntrega';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  BRL, calcEntry, calcItem, nomeBainha, espacadorIdx, temLaser, nomeCatalogo, catalogoIntacto,
  type SimuladorData, type PedidoEntry,
} from '@/lib/simuladorData';


interface DraftLineItem {
  title: string;
  quantity: number;
  price: number;
  properties: { name: string; value: string }[];
  /** Quando presente, a linha usa a variante real da Shopify (baixa estoque) */
  variantId?: string;
  /** Veio do catálogo do site → pronta entrega definida pelo FORNECEDOR do produto */
  doCatalogo?: boolean;
  vendor?: string;
}


/** Notas internas (configuração completa de cada item) — nunca viram propriedade visível da linha. */
export function montarNotasInternas(data: SimuladorData, entries: PedidoEntry[]): string[] {
  const out: string[] = [];
  let n = 0;
  entries.forEach((e) => {
    n++;

    if (e.kind === 'faca') {
      const cfg = e.faca;
      const m = cfg.modeloIdx !== null ? data.modelos[cfg.modeloIdx] : null;
      const titulo = cfg.origem?.produtoTitulo ?? m?.nome ?? '';
      if (!titulo) return;

      const linhas: string[] = [`Item ${n} — ${titulo}`];
      if (cfg.origem) linhas.push(`  Base: ${cfg.origem.produtoTitulo}`);
      if (m) linhas.push(`  Modelo: ${m.nome}`);

      const aco = data.acos[cfg.acoIdx]?.nome ?? '';
      if (aco) linhas.push(`  Aço: ${aco}`);
      if (cfg.bruteForge) linhas.push(`  Brute Forge: Sim`);

      const emp = data.empunhaduras[cfg.empIdx]?.nome ?? '';
      if (emp) linhas.push(`  Empunhadura: ${emp}${cfg.empCor ? ` (${cfg.empCor})` : ''}`);
      if (cfg.dragonScale) linhas.push(`  Dragon Scale: Sim`);
      linhas.push(`  Espaçador: ${cfg.espacador ? `Sim${cfg.espacadorCor ? ` (${cfg.espacadorCor})` : ''}` : 'Não'}`);

      const acab = data.acabamentos[cfg.acabIdx]?.nome ?? '';
      if (acab) linhas.push(`  Acabamento: ${acab}`);

      const bainhas = (cfg.bainhaIdxs ?? []).map((i) => nomeBainha(data, cfg, i)).filter(Boolean);
      if (bainhas.length) linhas.push(`  Bainhas: ${bainhas.join(', ')}`);

      const laser = (cfg.textoLaser ?? '').trim();
      linhas.push(`  Personalização: ${temLaser(cfg) ? `Sim — ${laser}` : 'Não'}`);

      const cert = (cfg.certificado ?? '').trim();
      linhas.push(`  Certificado: ${cert || 'Não'}`);

      const emb = (cfg.embalagem ?? '').trim();
      if (emb) linhas.push(`  Embalagem: ${emb}`);

      out.push(linhas.join('\n'));
      return;
    }

    if (e.kind === 'avulso') {
      const a = data.adicionais[e.avulso.adicionalIdx];
      if (!a) return;
      out.push(`Item ${n} — ${a.nome}${e.avulso.quantidade > 1 ? ` ×${e.avulso.quantidade}` : ''}`);
      return;
    }

    if (e.kind === 'catalogo') {
      const c = e.catalogo;
      out.push(`Item ${n} — ${nomeCatalogo(c)}${c.quantidade > 1 ? ` ×${c.quantidade}` : ''}`);
      return;
    }

    const c = e.custom;
    out.push(`Item ${n} — ${(c.descricao.trim() || 'Item personalizado')}${c.brinde ? ' (Brinde)' : ''}${c.quantidade > 1 ? ` ×${c.quantidade}` : ''}`);
  });
  return out;
}

/** Converte as entradas do simulador em custom line items da Shopify. */
export function montarLineItems(data: SimuladorData, entries: PedidoEntry[]): DraftLineItem[] {
  const out: DraftLineItem[] = [];

  entries.forEach((e) => {
    if (e.kind === 'faca') {
      const cfg = e.faca;
      const m = cfg.modeloIdx !== null ? data.modelos[cfg.modeloIdx] : null;
      if (!m) return;

      const aco = data.acos[cfg.acoIdx]?.nome ?? '';
      let emp = data.empunhaduras[cfg.empIdx]?.nome ?? '';
      if (cfg.empCor) emp += ` ${cfg.empCor}`;
      const bainhas = (cfg.bainhaIdxs ?? []).map((i) => nomeBainha(data, cfg, i)).filter(Boolean);

      const tituloPartes = [m.nome];
      if (aco) tituloPartes.push(`Aço ${aco}${cfg.bruteForge ? ' + Brute Forge' : ''}`);
      if (emp) tituloPartes.push(`Empunhadura ${emp}${cfg.dragonScale ? ' + Dragon Scale' : ''}`);

      const props: { name: string; value: string }[] = [
        { name: 'Modelo', value: m.nome },
        { name: 'Aço', value: aco },
        { name: 'Empunhadura', value: data.empunhaduras[cfg.empIdx]?.nome ?? '' },
      ];
      if (cfg.bruteForge) props.push({ name: 'Brute Forge', value: 'Sim' });
      if (cfg.empCor) props.push({ name: 'Cor da empunhadura', value: cfg.empCor });
      if (cfg.dragonScale) props.push({ name: 'Dragon Scale', value: 'Sim' });
      if (cfg.espacador) {
        const ei = espacadorIdx(data);
        props.push({
          name: 'Espaçador',
          value: cfg.espacadorCor ? `Sim (${cfg.espacadorCor})` : 'Sim',
        });
        if (ei < 0) props.pop();
      }
      props.push({ name: 'Acabamento', value: data.acabamentos[cfg.acabIdx]?.nome ?? '' });
      bainhas.forEach((b, i) => props.push({ name: `Bainha ${i + 1}`, value: b }));
      if (temLaser(cfg)) props.push({ name: 'Personalização', value: (cfg.textoLaser ?? '').trim() });
      if ((cfg.certificado ?? '').trim()) props.push({ name: 'Certificado', value: (cfg.certificado ?? '').trim() });
      // Embalagem NÃO entra aqui — é campo interno (vai na nota do pedido).

      // Veio da vitrine e não foi alterada → usa a variante real (baixa estoque)
      if (cfg.origem && catalogoIntacto(cfg)) {
        out.push({
          title: cfg.origem.varianteTitulo
            ? `${cfg.origem.produtoTitulo} — ${cfg.origem.varianteTitulo}`
            : cfg.origem.produtoTitulo,
          quantity: 1,
          price: calcItem(data, cfg),
          properties: [],
          variantId: cfg.origem.variantId,
          doCatalogo: true,
          vendor: cfg.origem.vendor,
        });
        return;
      }
      if (cfg.origem) props.push({ name: 'Base', value: cfg.origem.produtoTitulo });

      out.push({
        title: tituloPartes.join(' — '),
        quantity: 1,
        price: calcItem(data, cfg),
        properties: props.filter((p) => p.value),
        ...(cfg.origem ? { doCatalogo: true, vendor: cfg.origem.vendor } : {}),
      });
      return;
    }


    if (e.kind === 'avulso') {
      const a = data.adicionais[e.avulso.adicionalIdx];
      if (!a) return;
      out.push({
        title: a.nome,
        quantity: Math.max(1, e.avulso.quantidade),
        price: a.preco,
        properties: [],
      });
      return;
    }

    if (e.kind === 'catalogo') {
      const c = e.catalogo;
      out.push({
        title: nomeCatalogo(c),
        quantity: Math.max(1, c.quantidade),
        price: Math.max(0, c.preco),
        properties: [],
        variantId: c.variantId,
        doCatalogo: true,
        vendor: c.vendor,
      });
      return;
    }

    const c = e.custom;
    out.push({
      title: (c.descricao.trim() || 'Item personalizado') + (c.brinde ? ' (Brinde)' : ''),
      quantity: Math.max(1, c.quantidade),
      price: c.brinde ? 0 : Math.max(0, c.preco),
      properties: c.brinde ? [{ name: 'Brinde', value: 'Sim' }] : [],
    });
  });


  return out;
}


interface Resultado {
  nome?: string;
  invoiceUrl?: string;
}

export default function ShopifyDraftModal({ open, onOpenChange, data, entries, total, nomeInicial, onNomeChange }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: SimuladorData;
  entries: PedidoEntry[];
  total: number;
  nomeInicial?: string;
  onNomeChange?: (n: string) => void;
}) {
  const [nome, setNome] = useState(nomeInicial ?? '');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [cep, setCep] = useState('');
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [bairro, setBairro] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [colado, setColado] = useState('');
  const [observacao, setObservacao] = useState('');
  const [parsing, setParsing] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [dadosExpandidos, setDadosExpandidos] = useState(false);
  const [freteGratis, setFreteGratis] = useState(total >= 1000);
  const [touchedFrete, setTouchedFrete] = useState(false);
  // Acesso é compartilhado pelos vendedores → NUNCA memorizar a última escolha.
  const [vendedor, setVendedor] = useState('');
  const [origemVenda, setOrigemVenda] = useState('');
  // Pronta entrega: respostas por item avulso (índice da linha) + prazo da encomenda + modo de envio
  const [respostasPE, setRespostasPE] = useState<Record<number, { pronta: boolean | null; prazo: number }>>({});
  const [prazoEncomenda, setPrazoEncomenda] = useState(PRAZO_PADRAO_ENCOMENDA);
  const [modoEnvio, setModoEnvio] = useState<'' | 'junto' | 'parcial'>('');

  const vendedoresAtivos = useMemo(
    () => (data.vendedores ?? []).filter((v) => v.ativo && v.nome.trim()),
    [data.vendedores],
  );

  useEffect(() => { if (!open) { setResultado(null); setEnviando(false); } }, [open]);
  useEffect(() => {
    if (open) {
      setTouchedFrete(false);
      setFreteGratis(total >= 1000);
      setVendedor('');
      setOrigemVenda('');
      setRespostasPE({});
      setPrazoEncomenda(PRAZO_PADRAO_ENCOMENDA);
      setModoEnvio('');
    }
  }, [open]);
  useEffect(() => {
    if (!touchedFrete) setFreteGratis(total >= 1000);
  }, [total, touchedFrete]);
  useEffect(() => { if (open && nomeInicial && !nome.trim()) setNome(nomeInicial); }, [open, nomeInicial]); // eslint-disable-line react-hooks/exhaustive-deps


  const itens = useMemo(() => montarLineItems(data, entries), [data, entries]);
  const notasInternas = useMemo(() => montarNotasInternas(data, entries), [data, entries]);
  const somaItens = useMemo(() => itens.reduce((s, i) => s + i.price * i.quantity, 0), [itens]);
  const ajuste = +(total - somaItens).toFixed(2);

  // Classificação de cada linha: catálogo → pelo fornecedor; avulso → resposta do vendedor
  const itensPE = useMemo(() => itens.map((i, idx) => {
    if (i.doCatalogo) {
      const c = classificarItemPE(i.vendor, i.properties);
      return { pronta: c.pronta as boolean | null, prazo: c.prazo, auto: true };
    }
    const r = respostasPE[idx];
    const pronta = r?.pronta ?? null;
    return { pronta, prazo: pronta ? (r?.prazo || PRAZO_PADRAO_PRONTA) : prazoEncomenda, auto: false };
  }), [itens, respostasPE, prazoEncomenda]);
  const temPronta = itensPE.some((i) => i.pronta === true);
  const temEncomenda = itensPE.some((i) => i.pronta === false);
  const ehMisto = temPronta && temEncomenda;
  const maxPronta = Math.max(0, ...itensPE.filter((i) => i.pronta).map((i) => i.prazo));
  const maxEncomenda = Math.max(0, ...itensPE.filter((i) => i.pronta === false).map((i) => i.prazo));
  const faltaPE = itensPE.filter((i) => i.pronta === null).length;

  const pendencias: string[] = [];
  if (!vendedor.trim()) pendencias.push('escolher o vendedor');
  if (!origemVenda) pendencias.push('escolher a origem da venda');
  if (faltaPE) pendencias.push(`responder se ${faltaPE === 1 ? '1 item é' : `${faltaPE} itens são`} pronta entrega`);
  if (ehMisto && !modoEnvio) pendencias.push('escolher como será o envio do pedido');



  const preencherComIA = async () => {
    if (!colado.trim()) { toast.error('Cole a mensagem do cliente primeiro'); return; }
    setParsing(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('parse-order-data', {
        body: { text: colado },
      });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);
      const c = res?.data?.cliente ?? {};
      if (c.nomeCompleto) setNome(c.nomeCompleto);
      if (c.celular) setTelefone(c.celular);
      if (c.email) setEmail(c.email);
      if (c.cpf) setCpf(c.cpf);
      if (c.dataNascimento) setNascimento(c.dataNascimento);
      if (c.cep) setCep(c.cep);
      if (c.estado) setEstado(c.estado);
      if (c.cidade) setCidade(c.cidade);
      if (c.bairro) setBairro(c.bairro);
      if (c.endereco) setEndereco(c.endereco);
      if (c.numero) setNumero(c.numero);
      if (c.complemento) setComplemento(c.complemento);
      if (res?.data?.pedido?.observacao) setObservacao(res.data.pedido.observacao);
      toast.success('Dados preenchidos!');
    } catch (err: any) {
      toast.error(err?.message ?? 'Não foi possível ler os dados');
    } finally {
      setParsing(false);
    }
  };

  const enviar = async () => {
    if (!itens.length) { toast.error('Nenhum item para enviar'); return; }
    if (!vendedor.trim()) { toast.error('Selecione o vendedor deste pedido'); return; }
    if (!origemVenda) { toast.error('Selecione a origem desta venda'); return; }
    if (pendencias.length) { toast.error(`Falta ${pendencias.join(', ')}`); return; }
    const itensEnvio = itens.map((i, idx) => ({
      ...i,
      properties: [
        ...i.properties.filter((p) => !/^pronta entrega$|^prazo \(dias/i.test(p.name)),
        { name: 'Pronta entrega', value: itensPE[idx].pronta ? 'Sim' : 'Não' },
        { name: 'Prazo (dias úteis)', value: String(itensPE[idx].prazo) },
      ],
    }));
    setEnviando(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('criar-draft-order-shopify', {
        body: {
          itens: itensEnvio,
          modoEnvio: ehMisto ? modoEnvio : undefined,
          vendedor: vendedor.trim(),
          origem: origemVenda,

          cliente: {
            nome: nome.trim() || undefined,
            email: email.trim() || undefined,
            telefone: telefone.trim() || undefined,
            cpf: cpf.trim() || undefined,
            dataNascimento: nascimento.trim() || undefined,
          },
          endereco: {
            cep: cep.trim() || undefined,
            estado: estado.trim() || undefined,
            cidade: cidade.trim() || undefined,
            bairro: bairro.trim() || undefined,
            endereco: endereco.trim() || undefined,
            numero: numero.trim() || undefined,
            complemento: complemento.trim() || undefined,
          },
          observacao: observacao.trim() || undefined,
          notasInternas,
          totalDesejado: Math.abs(ajuste) >= 0.01 ? total : undefined,
          freteGratis,
        },

      });
      if (error) throw error;
      if (!res?.sucesso) throw new Error(res?.erro ?? 'Falha ao criar o pedido na Shopify');
      setResultado({ nome: res.nome, invoiceUrl: res.invoiceUrl });
      toast.success(`Draft ${res.nome} criado na Shopify`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao criar o pedido');
    } finally {
      setEnviando(false);
    }
  };

  const copiarLink = async () => {
    if (!resultado?.invoiceUrl) return;
    try { await navigator.clipboard.writeText(resultado.invoiceUrl); toast.success('Link copiado!'); }
    catch { toast.error('Não foi possível copiar'); }
  };

  const telDigits = telefone.replace(/\D/g, '');
  const whatsappUrl = useMemo(() => {
    const numeroWa = telDigits.length <= 11 ? `55${telDigits}` : telDigits;
    const msg = [
      nome.trim() ? `Olá, ${nome.trim()}!` : 'Olá!',
      '',
      `Seu pedido Kaowz ${resultado?.nome ?? ''} está pronto para pagamento.`,
      `Total: ${BRL(total)}`,
      '',
      'Finalize por aqui (endereço e frete são escolhidos no checkout):',
      resultado?.invoiceUrl ?? '',
    ].join('\n');
    return `https://wa.me/${numeroWa}?text=${encodeURIComponent(msg)}`;
  }, [telDigits, nome, resultado, total]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" /> Lançar no Shopify
          </DialogTitle>
          <DialogDescription>
            Cria um pedido rascunho (draft order) com link de pagamento. O frete usa as regras da loja.
          </DialogDescription>
        </DialogHeader>

        {resultado ? (
          <div className="space-y-4">
            <div className="rounded-xl border-2 border-accent/40 bg-accent/5 p-4 space-y-2 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Draft criado</p>
              <p className="text-2xl font-bold">{resultado.nome}</p>
              <p className="text-sm text-muted-foreground break-all">{resultado.invoiceUrl}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-11 rounded-xl gap-2" onClick={copiarLink}>
                <Copy className="h-4 w-4" /> Copiar link
              </Button>
              {telDigits.length >= 10 ? (
                <Button asChild className="h-11 rounded-xl gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <Send className="h-4 w-4" /> WhatsApp
                  </a>
                </Button>
              ) : (
                <Button asChild variant="secondary" className="h-11 rounded-xl gap-2">
                  <a href={resultado.invoiceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> Abrir
                  </a>
                </Button>
              )}
            </div>
            <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Vendedor — obrigatório, sempre vazio a cada lançamento */}
            <div className="space-y-1.5">
              <Label htmlFor="sh-vendedor" className="text-xs">Vendedor <span className="text-destructive">*</span></Label>
              {vendedoresAtivos.length === 0 ? (
                <p className="text-[11px] text-muted-foreground rounded-xl border border-dashed p-3">
                  Nenhum vendedor ativo cadastrado. Cadastre em Configuradores → Valores do Simulador → aba Vendedores.
                </p>
              ) : (
                <Select value={vendedor} onValueChange={setVendedor}>
                  <SelectTrigger id="sh-vendedor" className="h-11 rounded-xl">
                    <SelectValue placeholder="Quem está vendendo?" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendedoresAtivos.map((v) => (
                      <SelectItem key={v.nome} value={v.nome}>{v.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sh-origem" className="text-xs">Origem <span className="text-destructive">*</span></Label>
              <Select value={origemVenda} onValueChange={setOrigemVenda}>
                <SelectTrigger id="sh-origem" className="h-11 rounded-xl">
                  <SelectValue placeholder="Como esta venda chegou?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Recorrência">Recorrência</SelectItem>
                  <SelectItem value="Orgânico">Orgânico</SelectItem>
                  <SelectItem value="Tráfego">Tráfego</SelectItem>
                  <SelectItem value="Presencial">Presencial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Resumo dos itens */}

            <div className="rounded-xl border p-3 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {itens.length} {itens.length === 1 ? 'item' : 'itens'}
              </span>
              <ul className="space-y-1.5">
                {itens.map((i, idx) => {
                  const pe = itensPE[idx];
                  const resp = respostasPE[idx];
                  const setResp = (v: { pronta: boolean | null; prazo: number }) =>
                    setRespostasPE((p) => ({ ...p, [idx]: v }));
                  return (
                  <li key={idx} className="text-xs space-y-1.5 border-b border-border/50 pb-2 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 flex-1">{i.title}{i.quantity > 1 ? ` ×${i.quantity}` : ''}</span>
                      <span className="tabular-nums font-semibold flex-shrink-0">{BRL(i.price * i.quantity)}</span>
                    </div>
                    {pe.auto ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          pe.pronta ? 'bg-green-600/15 text-green-500' : 'bg-muted text-muted-foreground')}>
                          <Truck className="h-3 w-3" />
                          {pe.pronta ? 'Pronta entrega' : 'Sob encomenda'} • {pe.prazo} dias úteis
                        </span>
                        <span className="text-[10px] text-muted-foreground">definido pelo cadastro do produto no site</span>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-muted/40 p-2 space-y-1.5">
                        <p className="text-[11px] font-medium">Esse item é pronta entrega? *</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          <Button type="button" size="sm" variant={resp?.pronta === true ? 'default' : 'outline'} className="h-10"
                            onClick={() => setResp({ pronta: true, prazo: resp?.prazo || PRAZO_PADRAO_PRONTA })}>Sim</Button>
                          <Button type="button" size="sm" variant={resp?.pronta === false ? 'default' : 'outline'} className="h-10"
                            onClick={() => setResp({ pronta: false, prazo: resp?.prazo || PRAZO_PADRAO_PRONTA })}>Não</Button>
                        </div>
                        {resp?.pronta === true && (
                          <div className="space-y-0.5">
                            <Label className="text-[11px]">Prazo de envio (dias úteis)</Label>
                            <Input type="number" min={1} inputMode="numeric" className="h-9 w-24"
                              value={resp.prazo} onChange={(e) => setResp({ pronta: true, prazo: Math.max(1, Number(e.target.value) || 1) })} />
                            <p className="text-[10px] text-muted-foreground">Prazo padrão de pronta entrega — altere só se este item for diferente</p>
                          </div>
                        )}
                        {resp?.pronta === false && (
                          <p className="text-[10px] text-muted-foreground">Usa o prazo da lâmina sob encomenda ({prazoEncomenda} dias úteis), definido abaixo.</p>
                        )}
                      </div>
                    )}
                  </li>
                  );
                })}
              </ul>
              <div className="flex items-center justify-between border-t pt-2 text-sm font-bold">
                <span>Total</span><span className="text-accent tabular-nums">{BRL(total)}</span>
              </div>
              {Math.abs(ajuste) >= 0.01 && (
                <p className="text-[10px] text-muted-foreground">
                  Total ajustado manualmente ({ajuste < 0 ? 'desconto' : 'acréscimo'} de {BRL(Math.abs(ajuste))} sobre {BRL(somaItens)}) — vai aplicado no draft.
                </p>
              )}
              {notasInternas.length > 0 && (
                <p className="text-[10px] text-muted-foreground whitespace-pre-line">
                  Notas internas (não aparecem para o cliente):{'\n'}{notasInternas.join('\n')}
                </p>
              )}

            </div>

            {/* Prazo da encomenda + modo de envio */}
            <div className="rounded-xl border p-3 space-y-1">
              <Label className="text-xs">Prazo da lâmina sob encomenda (dias úteis)</Label>
              <Input type="number" min={1} inputMode="numeric" className="h-9 w-24" value={prazoEncomenda}
                onChange={(e) => setPrazoEncomenda(Math.max(1, Number(e.target.value) || 1))} />
              <p className="text-[10px] text-muted-foreground">Padrão: {PRAZO_PADRAO_ENCOMENDA} dias úteis. Vale para os itens avulsos marcados como "Não".</p>
            </div>
            {ehMisto && (
              <div className="rounded-xl border border-yellow-500/50 bg-yellow-500/10 p-3 space-y-2">
                <p className="text-sm font-semibold flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Como será o envio deste pedido? *</p>
                {([
                  ['junto', 'Tudo junto', `O cliente recebe tudo de uma vez, no prazo da lâmina sob encomenda (${maxEncomenda} dias úteis).`],
                  ['parcial', 'Pronta entrega primeiro', `Os itens prontos saem em até ${maxPronta} dias úteis; a lâmina segue depois, em outro envio.`],
                ] as const).map(([v, t, d]) => (
                  <button key={v} type="button" onClick={() => setModoEnvio(v)}
                    className={cn('w-full text-left rounded-lg border p-2.5 transition-colors',
                      modoEnvio === v ? 'border-primary bg-primary/10' : 'border-border bg-background/40')}>
                    <span className="block text-sm font-semibold">{t}</span>
                    <span className="block text-[11px] text-muted-foreground">{d}</span>
                  </button>
                ))}
                <p className="text-[11px] text-muted-foreground">Confirme essa escolha com o cliente antes de lançar.</p>
              </div>
            )}

            {/* Dados do cliente — colapsado por padrão */}
            {!dadosExpandidos ? (
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => setDadosExpandidos(true)}
                  className="text-xs text-primary underline-offset-4 hover:underline"
                >
                  Colar dados do cliente (manualmente)
                </button>
                <p className="text-[10px] text-muted-foreground">(cliente preenche dados no checkout)</p>
              </div>
            ) : (
              <div className="space-y-4 rounded-xl border p-3">
                {/* Colar mensagem + IA */}
                <div className="space-y-1.5">
                  <Label htmlFor="sh-colar" className="text-xs">Colar dados do cliente (WhatsApp)</Label>
                  <Textarea id="sh-colar" value={colado} onChange={(e) => setColado(e.target.value)}
                    rows={3} placeholder="Cole aqui a mensagem com nome, CPF, endereço..." className="text-xs resize-y" />
                  <Button variant="outline" className="w-full h-10 rounded-xl gap-2" onClick={preencherComIA} disabled={parsing}>
                    {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Preencher automaticamente
                  </Button>
                </div>

                {/* Cliente */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="sh-nome" className="text-xs">Nome (opcional)</Label>
                    <Input id="sh-nome" value={nome} onChange={(e) => { setNome(e.target.value); onNomeChange?.(e.target.value); }} className="h-10" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="sh-tel" className="text-xs">Telefone</Label>
                      <Input id="sh-tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sh-email" className="text-xs">E-mail</Label>
                      <Input id="sh-email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" className="h-10" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="sh-cpf" className="text-xs">CPF</Label>
                      <Input id="sh-cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} inputMode="numeric" className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="sh-nasc" className="text-xs">Nascimento</Label>
                      <Input id="sh-nasc" value={nascimento} onChange={(e) => setNascimento(e.target.value)} placeholder="dd/mm/aaaa" className="h-10" />
                    </div>
                  </div>
                </div>

                {/* Endereço opcional */}
                <details className="rounded-xl border p-3">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Endereço (opcional)
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="CEP" className="h-10" />
                      <Input value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="UF" className="h-10" />
                    </div>
                    <Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" className="h-10" />
                    <Input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Bairro" className="h-10" />
                    <div className="grid grid-cols-3 gap-3">
                      <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua" className="h-10 col-span-2" />
                      <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Nº" className="h-10" />
                    </div>
                    <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Complemento" className="h-10" />
                    <p className="text-[10px] text-muted-foreground">
                      Se ficar em branco, o cliente preenche o endereço e escolhe o frete no checkout da loja.
                    </p>
                  </div>
                </details>

                <button
                  type="button"
                  onClick={() => setDadosExpandidos(false)}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Ocultar dados do cliente
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="sh-obs" className="text-xs">Observação do pedido</Label>
              <Textarea id="sh-obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} className="text-sm resize-none" />
            </div>

            <div className="flex items-start justify-between gap-3 rounded-xl border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="sh-frete" className="text-sm font-medium">Frete grátis</Label>
                <p className="text-[10px] text-muted-foreground">
                  {total >= 1000
                    ? 'Aplicado automaticamente acima de R$ 1.000'
                    : 'Aplica frete grátis independente do valor do pedido'}
                </p>
              </div>
              <Switch
                id="sh-frete"
                checked={freteGratis}
                onCheckedChange={(v) => { setFreteGratis(v); setTouchedFrete(true); }}
              />
            </div>

            <Button className="w-full h-11 rounded-xl gap-2" onClick={enviar} disabled={enviando || !itens.length || pendencias.length > 0}>
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
              Criar pedido na Shopify
            </Button>
            {pendencias.length > 0 && itens.length > 0 && (
              <p className="text-[11px] text-center text-muted-foreground">Para lançar, falta: {pendencias.join('; ')}.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
