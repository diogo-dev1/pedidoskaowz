import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Send, FileText, CheckCircle2, XCircle, Save, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

type Pedido = any;
type Item = any;

interface Resultado {
  status: 'idle' | 'loading' | 'ok' | 'erro';
  mensagem?: string;
}

function StatusBadge({ r, okLabel }: { r: Resultado; okLabel: string }) {
  if (r.status === 'idle') return null;
  if (r.status === 'loading') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Processando…
      </Badge>
    );
  }
  if (r.status === 'ok') {
    return (
      <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
        <CheckCircle2 className="h-3 w-3" /> {okLabel}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" /> Falhou
    </Badge>
  );
}

function Campo({ label, value, onChange, type = 'text' }: {
  label: string; value: any; onChange: (v: string) => void; type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} className="h-9" />
    </div>
  );
}

export default function BlingPedido() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [lista, setLista] = useState<Pedido[]>([]);

  const [resLancar, setResLancar] = useState<Resultado>({ status: 'idle' });
  const [resNfe, setResNfe] = useState<Resultado>({ status: 'idle' });

  useEffect(() => {
    (async () => {
      setCarregando(true);
      if (!id) {
        const { data } = await supabase
          .from('pedidos')
          .select('id, numero_pedido, cliente_nome, valor_total, bling_pedido_id, bling_nfe_id, created_at')
          .order('created_at', { ascending: false })
          .limit(30);
        setLista(data ?? []);
        setCarregando(false);
        return;
      }
      const { data: p } = await supabase.from('pedidos').select('*').eq('id', id).maybeSingle();
      const { data: its } = await supabase
        .from('pedido_itens').select('*').eq('pedido_id', id).order('created_at');
      setPedido(p);
      setItens(its ?? []);
      if (p?.bling_pedido_id) setResLancar({ status: 'ok', mensagem: `Pedido Bling #${p.bling_pedido_id}` });
      if (p?.bling_nfe_id) setResNfe({ status: 'ok', mensagem: `NF-e #${p.bling_nfe_id}` });
      setCarregando(false);
    })();
  }, [id]);

  const set = (campo: string, valor: any) => setPedido((p: any) => ({ ...p, [campo]: valor }));
  const setItem = (idx: number, campo: string, valor: any) =>
    setItens(prev => prev.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));

  function payloadEdicoes() {
    const campos = [
      'cliente_nome', 'cliente_cpf', 'cliente_email', 'cliente_celular', 'cliente_cep',
      'cliente_estado', 'cliente_cidade', 'cliente_bairro', 'cliente_endereco',
      'cliente_numero', 'cliente_complemento', 'forma_pagamento', 'observacao',
      'embalagem', 'brindes',
    ];
    const p: any = {};
    for (const c of campos) p[c] = pedido?.[c] ? String(pedido[c]).trim() : null;
    p.valor_total = parseFloat(String(pedido?.valor_total ?? '0').replace(',', '.')) || 0;
    return {
      pedido: p,
      itens: itens.map(it => ({
        id: it.id,
        modelo: it.modelo || null,
        aco: it.aco || null,
        acabamento: it.acabamento || null,
        empunhadura: it.empunhadura || null,
        bainha: it.bainha || null,
        cor_bainha: it.cor_bainha || null,
        texto_laser: it.texto_laser || null,
        quantidade: Number(it.quantidade) || 1,
        preco_unitario: parseFloat(String(it.preco_unitario ?? '0').replace(',', '.')) || 0,
      })),
    };
  }

  async function chamar(acao: 'salvar' | 'lancar' | 'nfe') {
    const { data, error } = await supabase.functions.invoke('bling-pedido', {
      body: { acao, pedidoId: id, ...payloadEdicoes() },
    });
    if (error) throw new Error(error.message);
    return data as any;
  }

  async function salvar() {
    setSalvando(true);
    try {
      await chamar('salvar');
      toast.success('Dados salvos');
    } catch (e: any) {
      toast.error(e.message);
    }
    setSalvando(false);
  }

  async function lancar() {
    setResLancar({ status: 'loading' });
    try {
      const d = await chamar('lancar');
      if (!d?.sucesso) throw new Error(d?.erro ?? 'Erro desconhecido');
      setResLancar({ status: 'ok', mensagem: `Pedido Bling #${d.blingPedidoId}` });
      set('bling_pedido_id', d.blingPedidoId);
      toast.success('Pedido de venda lançado no Bling!');
    } catch (e: any) {
      setResLancar({ status: 'erro', mensagem: e.message });
      toast.error('Falha ao lançar no Bling');
    }
  }

  async function gerarNfe() {
    setResNfe({ status: 'loading' });
    try {
      const d = await chamar('nfe');
      if (!d?.sucesso) throw new Error(d?.erro ?? 'Erro desconhecido');
      setResNfe({
        status: 'ok',
        mensagem: `NF-e #${d.nfeId}${d.enviada ? ' — enviada à SEFAZ' : ' — rascunho no Bling'}`,
      });
      set('bling_nfe_id', d.nfeId);
      toast.success('NF-e gerada!');
    } catch (e: any) {
      setResNfe({ status: 'erro', mensagem: e.message });
      toast.error('Falha ao gerar NF-e');
    }
  }

  if (carregando) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  // ── Listagem quando não há pedido selecionado ────────────────────────────
  if (!id) {
    return (
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div>
          <h1 className="text-xl font-bold">Bling</h1>
          <p className="text-sm text-muted-foreground">Selecione um pedido para lançar no Bling</p>
        </div>
        <div className="space-y-2">
          {lista.map(p => (
            <button
              key={p.id}
              onClick={() => navigate(`/bling-pedido/${p.id}`)}
              className="w-full text-left rounded-xl border bg-card p-3 hover:bg-muted/50 flex items-center gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{p.cliente_nome}</p>
                <p className="text-xs text-muted-foreground">{p.numero_pedido}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                {p.bling_pedido_id && <Badge className="bg-emerald-600 hover:bg-emerald-600">Pedido</Badge>}
                {p.bling_nfe_id && <Badge variant="secondary">NF-e</Badge>}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
          {lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pedido registrado.</p>}
        </div>
      </div>
    );
  }

  if (!pedido) {
    return <div className="p-6 text-sm text-muted-foreground">Pedido não encontrado.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-3 sm:p-4 space-y-4 pb-28">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Lançamento no Bling</h1>
          <p className="text-xs text-muted-foreground">{pedido.numero_pedido}</p>
        </div>
        <Button variant="outline" size="sm" onClick={salvar} disabled={salvando}>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="ml-1 hidden sm:inline">Salvar</span>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Cliente</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Nome" value={pedido.cliente_nome} onChange={v => set('cliente_nome', v)} />
          <Campo label="CPF/CNPJ" value={pedido.cliente_cpf} onChange={v => set('cliente_cpf', v)} />
          <Campo label="E-mail" value={pedido.cliente_email} onChange={v => set('cliente_email', v)} />
          <Campo label="Celular" value={pedido.cliente_celular} onChange={v => set('cliente_celular', v)} />
          <Campo label="CEP" value={pedido.cliente_cep} onChange={v => set('cliente_cep', v)} />
          <Campo label="Estado (UF)" value={pedido.cliente_estado} onChange={v => set('cliente_estado', v)} />
          <Campo label="Cidade" value={pedido.cliente_cidade} onChange={v => set('cliente_cidade', v)} />
          <Campo label="Bairro" value={pedido.cliente_bairro} onChange={v => set('cliente_bairro', v)} />
          <Campo label="Endereço" value={pedido.cliente_endereco} onChange={v => set('cliente_endereco', v)} />
          <Campo label="Número" value={pedido.cliente_numero} onChange={v => set('cliente_numero', v)} />
          <Campo label="Complemento" value={pedido.cliente_complemento} onChange={v => set('cliente_complemento', v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Pedido</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Valor total (R$)" value={pedido.valor_total} onChange={v => set('valor_total', v)} />
          <Campo label="Forma de pagamento" value={pedido.forma_pagamento} onChange={v => set('forma_pagamento', v)} />
          <Campo label="Embalagem" value={pedido.embalagem} onChange={v => set('embalagem', v)} />
          <Campo label="Brindes" value={pedido.brindes} onChange={v => set('brindes', v)} />
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs text-muted-foreground">Observação</Label>
            <Textarea
              value={pedido.observacao ?? ''}
              onChange={e => set('observacao', e.target.value)}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Itens ({itens.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {itens.map((it, idx) => (
            <div key={it.id} className="rounded-lg border p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground">Item {idx + 1}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Campo label="Modelo" value={it.modelo} onChange={v => setItem(idx, 'modelo', v)} />
                <Campo label="Aço" value={it.aco} onChange={v => setItem(idx, 'aco', v)} />
                <Campo label="Acabamento" value={it.acabamento} onChange={v => setItem(idx, 'acabamento', v)} />
                <Campo label="Empunhadura" value={it.empunhadura} onChange={v => setItem(idx, 'empunhadura', v)} />
                <Campo label="Bainha" value={it.bainha} onChange={v => setItem(idx, 'bainha', v)} />
                <Campo label="Cor da bainha" value={it.cor_bainha} onChange={v => setItem(idx, 'cor_bainha', v)} />
                <Campo label="Texto laser" value={it.texto_laser} onChange={v => setItem(idx, 'texto_laser', v)} />
                <Campo label="Qtd" type="number" value={it.quantidade} onChange={v => setItem(idx, 'quantidade', v)} />
                <Campo label="Valor unitário (R$)" value={it.preco_unitario} onChange={v => setItem(idx, 'preco_unitario', v)} />
              </div>
            </div>
          ))}
          {itens.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item neste pedido.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Ações no Bling</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">1. Pedido de venda</span>
              <StatusBadge r={resLancar} okLabel="Lançado" />
            </div>
            <Button
              className="w-full"
              onClick={lancar}
              disabled={resLancar.status === 'loading' || resLancar.status === 'ok'}
            >
              {resLancar.status === 'loading'
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Send className="h-4 w-4 mr-2" />}
              Lançar pedido de venda
            </Button>
            {resLancar.mensagem && (
              <p className={`text-xs ${resLancar.status === 'erro' ? 'text-destructive' : 'text-muted-foreground'}`}>
                {resLancar.mensagem}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">2. Nota fiscal</span>
              <StatusBadge r={resNfe} okLabel="Gerada" />
            </div>
            <Button
              className="w-full"
              variant="secondary"
              onClick={gerarNfe}
              disabled={resNfe.status === 'loading' || resLancar.status !== 'ok'}
            >
              {resNfe.status === 'loading'
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <FileText className="h-4 w-4 mr-2" />}
              Gerar nota fiscal
            </Button>
            {resNfe.mensagem && (
              <p className={`text-xs ${resNfe.status === 'erro' ? 'text-destructive' : 'text-muted-foreground'}`}>
                {resNfe.mensagem}
              </p>
            )}
            {resLancar.status !== 'ok' && (
              <p className="text-xs text-muted-foreground">Lance o pedido de venda antes de gerar a NF-e.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
