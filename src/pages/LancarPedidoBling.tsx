import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Loader2, Send, Search, CheckCircle, ClipboardPaste, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface ItemForm {
  modelo: string;       // produto / modelo
  aco: string;          // variação 1 (ex: aço)
  acabamento: string;   // variação 2 (ex: acabamento)
  empunhadura: string;  // variação 3 (ex: empunhadura)
  bainha: string;       // variação 4 (ex: bainha)
  corBainha: string;    // variação 5 (ex: cor)
  textoLaser: string;
  embalagem: string;
  valorUnit: string;
  quantidade: number;
  observacoesLamina: string;
}

const itemVazio = (): ItemForm => ({
  modelo: '', aco: '', acabamento: '', empunhadura: '',
  bainha: '', corBainha: '', textoLaser: '', embalagem: '',
  valorUnit: '', quantidade: 1, observacoesLamina: '',
});

const FORMAS_PAG = [
  'Pix', 'Cartão de Crédito', 'Cartão de Débito',
  'Pix + Cartão', 'Boleto', 'Dinheiro', 'Transferência',
];
const CANAIS = ['Whatsapp', 'Instagram', 'Facebook', 'Site (Shopify)', 'Indicação', 'Outros'];
const STATUS_OPTIONS = ['Pendente', 'Em andamento', 'Aguardando pagamento', 'Pago'];

// Normaliza datas variadas (20.06.73, 20/06/1973) para YYYY-MM-DD —
// a coluna cliente_nascimento no banco é DATE e rejeita texto livre.
function normalizarDataNascimento(raw: string): string | null {
  const s = raw.trim();
  if (!s || s === '-') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (!m) return null;
  const dia = m[1].padStart(2, '0');
  const mes = m[2].padStart(2, '0');
  let ano = m[3];
  if (ano.length === 2) ano = parseInt(ano) <= 29 ? `20${ano}` : `19${ano}`;
  if (parseInt(dia) > 31 || parseInt(mes) > 12) return null;
  return `${ano}-${mes}-${dia}`;
}

const ESTADO_MAP: Record<string, string> = {
  'acre': 'AC', 'alagoas': 'AL', 'amapá': 'AP', 'amazonas': 'AM',
  'bahia': 'BA', 'ceará': 'CE', 'distrito federal': 'DF',
  'espírito santo': 'ES', 'goiás': 'GO', 'maranhão': 'MA',
  'mato grosso do sul': 'MS', 'mato grosso': 'MT', 'minas gerais': 'MG',
  'pará': 'PA', 'paraíba': 'PB', 'paraná': 'PR', 'pernambuco': 'PE',
  'piauí': 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN',
  'rio grande do sul': 'RS', 'rondônia': 'RO', 'roraima': 'RR',
  'santa catarina': 'SC', 'são paulo': 'SP', 'sergipe': 'SE', 'tocantins': 'TO',
};

// ─── Parser do fechamento ───────────────────────────────────────────────────

function parseFechamento(
  texto: string,
  vendedores: { id: string; nome_vendedor: string }[],
) {
  const linhas = texto.split('\n').map(l => l.trim());

  // Extrai o valor após "CHAVE:" (ignora prefixo numérico, ex: "1. NOME: ...")
  const campo = (...chaves: string[]): string => {
    for (const linha of linhas) {
      const semNum = linha.replace(/^\d+\.\s*/, '');
      for (const chave of chaves) {
        if (semNum.toLowerCase().startsWith(chave.toLowerCase() + ':')) {
          const val = semNum.slice(chave.length + 1).trim();
          return val === '-' ? '' : val;
        }
      }
    }
    return '';
  };

  // Retorna as linhas que seguem uma seção até a próxima seção numerada
  const secao = (...chaves: string[]): string[] => {
    let dentroSecao = false;
    const resultado: string[] = [];
    for (const linha of linhas) {
      const semNum = linha.replace(/^\d+\.\s*/, '');
      const ehChave = chaves.some(c => semNum.toLowerCase().startsWith(c.toLowerCase() + ':'));
      if (ehChave) {
        dentroSecao = true;
        // valor inline (mesma linha)
        for (const c of chaves) {
          if (semNum.toLowerCase().startsWith(c.toLowerCase() + ':')) {
            const inline = semNum.slice(c.length + 1).trim();
            if (inline && inline !== '-') resultado.push(inline);
          }
        }
        continue;
      }
      if (dentroSecao) {
        // Para na próxima seção numerada ou OBS
        if (/^\d+\.\s/.test(linha) || /^obs\s*:/i.test(linha)) break;
        if (linha) resultado.push(linha);
      }
    }
    return resultado;
  };

  // ── Itens do pedido ──────────────────────────────────────────────────────
  const pedidoLinhas = secao('PEDIDO');
  const itensParsed: ItemForm[] = [];
  let iAtual = -1;

  for (const linha of pedidoLinhas) {
    const header = linha.match(/^item\s+(\d+)\s*:/i);
    if (header) {
      iAtual = parseInt(header[1]) - 1;
      while (itensParsed.length <= iAtual) itensParsed.push(itemVazio());
      continue;
    }
    if (iAtual >= 0) {
      const kv = linha.match(/^([^:]+):\s*(.*)/);
      if (!kv) continue;
      const key = kv[1].trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const val = kv[2].trim();
      const item = itensParsed[iAtual];
      if (key === 'modelo') item.modelo = val;
      else if (key === 'aco' || key === 'aço') item.aco = val;
      else if (key === 'acabamento') item.acabamento = val;
      else if (key === 'empunhadura') item.empunhadura = val;
      else if (key === 'bainha') item.bainha = val;
      else if (key === 'cor bainha' || key === 'cor da bainha') item.corBainha = val;
    }
  }

  // ── Laser por item ───────────────────────────────────────────────────────
  const laserLinhas = secao(
    'PERSONALIZAÇÃO À LASER', 'PERSONALIZACAO A LASER',
    'PERSONALIZAÇÃO A LASER', 'LASER',
  );
  for (const linha of laserLinhas) {
    const m = linha.match(/item\s+(\d+)\s*:\s*(.*)/i);
    if (m) {
      const idx = parseInt(m[1]) - 1;
      if (itensParsed[idx]) {
        itensParsed[idx].textoLaser = m[2].trim() === '-' ? '' : m[2].trim();
      }
    }
  }

  // ── Embalagem por item ───────────────────────────────────────────────────
  const embalagemLinhas = secao('EMBALAGEM');
  for (const linha of embalagemLinhas) {
    const m = linha.match(/item\s+(\d+)\s*:\s*(.*)/i);
    if (m) {
      const idx = parseInt(m[1]) - 1;
      if (itensParsed[idx]) {
        itensParsed[idx].embalagem = m[2].trim() === '-' ? '' : m[2].trim();
      }
    } else if (itensParsed[0] && !itensParsed[0].embalagem) {
      itensParsed[0].embalagem = linha === '-' ? '' : linha;
    }
  }

  // ── Prazo DD/MM/YYYY → YYYY-MM-DD (valor do input date) ─────────────────
  const parsePrazo = (raw: string): string => {
    const p = raw.split('/');
    if (p.length === 3) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    return '';
  };

  // ── Estado: nome completo → sigla ────────────────────────────────────────
  const estadoRaw = campo('ESTADO');
  const estadoSigla = ESTADO_MAP[estadoRaw.toLowerCase()] ?? estadoRaw;

  // ── Vendedor: nome → id ──────────────────────────────────────────────────
  const vendedorNome = campo('VENDEDOR');
  const vendedorMatch = vendedores.find(
    v => v.nome_vendedor.toLowerCase() === vendedorNome.toLowerCase(),
  );

  return {
    nome: campo('NOME'),
    cpf: campo('CPF'),
    cep: campo('CEP'),
    estado: estadoSigla,
    cidade: campo('CIDADE'),
    bairro: campo('BAIRRO'),
    endereco: campo('ENDEREÇO', 'ENDERECO', 'ENDEREÇO'),
    numero: campo('NÚMERO', 'NUMERO'),
    complemento: campo('COMPLEMENTO'),
    celular: campo('CELULAR'),
    email: campo('E-MAIL', 'EMAIL'),
    dataNasc: campo('DATA DE NASCIMENTO'),
    itens: itensParsed.length > 0 ? itensParsed : [itemVazio()],
    valorTotal: campo('VALOR').replace('R$', '').replace(/\s/g, ''),
    formaPagamento: campo('FORMA DE PAGAMENTO'),
    canal: campo('CANAL DE VENDA'),
    vendedorId: vendedorMatch?.id ?? '',
    nomeCertificado: campo(
      'NOME PROPRIETÁRIO P/ CERTIFICADO',
      'NOME PROPRIETARIO P/ CERTIFICADO',
      'NOME PROPRIETÁRIO',
    ),
    cupom: campo('CUPOM'),
    prazo: parsePrazo(campo('PRAZO')),
    statusPedido: campo('STATUS DO PEDIDO', 'STATUS'),
    brindes: campo('BRINDES'),
    observacao: campo('OBS'),
  };
}

// ─── Helpers de layout ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────

export default function LancarPedidoBling() {
  const { profile } = useAuth();

  // Cliente
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [cep, setCep] = useState('');
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [bairro, setBairro] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  const [dataNasc, setDataNasc] = useState('');

  // Itens
  const [itens, setItens] = useState<ItemForm[]>([itemVazio()]);

  // Pedido
  const [valorTotal, setValorTotal] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [canal, setCanal] = useState('');
  const [vendedorId, setVendedorId] = useState(profile?.id || '');
  const [nomeCertificado, setNomeCertificado] = useState('');
  const [cupom, setCupom] = useState('');
  const [prazo, setPrazo] = useState('');
  const [statusPedido, setStatusPedido] = useState('Pendente');
  const [brindes, setBrindes] = useState('');
  const [observacao, setObservacao] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [sucesso, setSucesso] = useState<{ numero: string; prazo: string; blingOk: boolean; blingErro?: string } | null>(null);
  const [colarAberto, setColarAberto] = useState(true);
  const [textoColar, setTextoColar] = useState('');

  const { data: vendedores = [] } = useQuery({
    queryKey: ['profiles-vendedores'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome_vendedor')
        .order('nome_vendedor');
      return (data ?? []) as { id: string; nome_vendedor: string }[];
    },
  });

  function aplicarFechamento() {
    if (!textoColar.trim()) { toast.error('Cole o texto do fechamento primeiro'); return; }
    const parsed = parseFechamento(textoColar, vendedores);

    setNome(parsed.nome);
    setCpf(parsed.cpf);
    setCep(parsed.cep);
    setEstado(parsed.estado);
    setCidade(parsed.cidade);
    setBairro(parsed.bairro);
    setEndereco(parsed.endereco);
    setNumero(parsed.numero);
    setComplemento(parsed.complemento);
    setCelular(parsed.celular);
    setEmail(parsed.email);
    setDataNasc(parsed.dataNasc);
    setItens(parsed.itens);
    setValorTotal(parsed.valorTotal);
    if (parsed.formaPagamento) setFormaPagamento(parsed.formaPagamento);
    if (parsed.canal) setCanal(parsed.canal);
    if (parsed.vendedorId) setVendedorId(parsed.vendedorId);
    setNomeCertificado(parsed.nomeCertificado);
    setCupom(parsed.cupom);
    if (parsed.prazo) setPrazo(parsed.prazo);
    if (parsed.statusPedido) setStatusPedido(parsed.statusPedido);
    setBrindes(parsed.brindes);
    setObservacao(parsed.observacao);

    setColarAberto(false);
    toast.success('Formulário preenchido!');
  }

  async function buscarCep() {
    const cleaned = cep.replace(/\D/g, '');
    if (cleaned.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const d = await res.json();
      if (!d.erro) {
        setEstado(d.uf ?? '');
        setCidade(d.localidade ?? '');
        setBairro(d.bairro ?? '');
        setEndereco(d.logradouro ?? '');
      }
    } catch {}
    setBuscandoCep(false);
  }

  function updateItem(idx: number, field: keyof ItemForm, value: string | number) {
    setItens(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  // YYYY-MM-DD (date input) → DD/MM/YYYY (banco.ts)
  function prazoParaBanco(iso: string) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function resetForm() {
    setNome(''); setCpf(''); setCep(''); setEstado(''); setCidade('');
    setBairro(''); setEndereco(''); setNumero(''); setComplemento('');
    setCelular(''); setEmail(''); setDataNasc('');
    setItens([itemVazio()]);
    setValorTotal(''); setFormaPagamento(''); setCanal('');
    setVendedorId(profile?.id || ''); setNomeCertificado('');
    setCupom(''); setPrazo(''); setStatusPedido('Pendente');
    setBrindes(''); setObservacao(''); setTextoColar('');
    setSucesso(null);
  }

  async function handleSubmit() {
    if (!nome.trim()) { toast.error('Nome do cliente é obrigatório'); return; }
    if (itens.some(i => !i.modelo.trim())) { toast.error('Informe o produto/modelo de todos os itens'); return; }

    setLoading(true);
    setSucesso(null);

    try {
      const { data, error } = await supabase.functions.invoke('confirmar-pedido', {
        body: {
          waitForBling: true,
          nomeCompleto: nome.trim(),
          cpf: cpf.replace(/\D/g, '') || null,
          email: email.trim() || null,
          celular: celular.trim() || null,
          cep: cep.replace(/\D/g, '') || null,
          estado: estado.trim() || null,
          cidade: cidade.trim() || null,
          bairro: bairro.trim() || null,
          endereco: endereco.trim() || null,
          numero: numero.trim() || null,
          complemento: complemento.trim() || null,
          dataNascimento: normalizarDataNascimento(dataNasc),
          canal: canal || null,
          formaPagamento: formaPagamento || null,
          status: statusPedido,
          prazo: prazoParaBanco(prazo),
          brindes: brindes.trim() || null,
          cupom: cupom.trim() || null,
          observacao: observacao.trim() || null,
          nomeCertificado: nomeCertificado.trim() || nome.trim(),
          valorTotal: parseFloat(String(valorTotal).replace(',', '.')) || 0,
          vendedorId: vendedorId || profile?.id || null,
          laminas: itens.map(item => ({
            modelo: item.modelo.trim(),
            aco: item.aco.trim() || null,
            acabamento: item.acabamento.trim() || null,
            empunhadura: item.empunhadura.trim() || null,
            bainha: item.bainha.trim() || null,
            corBainha: item.corBainha.trim() || null,
            textoLaser: item.textoLaser.trim() || 'Sem gravação',
            embalagem: item.embalagem.trim() || null,
            subtotal: parseFloat(String(item.valorUnit).replace(',', '.')) || 0,
            quantidade: item.quantidade || 1,
            observacoesLamina: item.observacoesLamina.trim() || null,
          })),
          produtosAdicionais: [],
        },
      });

      if (error) throw error;

      const numeroPedido = data?.numero_pedido ?? '—';
      const blingOk = data?.bling?.sucesso !== false;

      setSucesso({ numero: numeroPedido, prazo: data?.prazo ?? '', blingOk, blingErro: data?.bling?.erro });

      if (blingOk) {
        toast.success(`Pedido ${numeroPedido} criado no sistema e no Bling!`);
      } else {
        toast.warning(
          `Pedido ${numeroPedido} salvo no sistema, mas falhou no Bling: ${data?.bling?.erro ?? 'erro desconhecido'}`,
          { duration: 8000 }
        );
      }

      resetForm();
    } catch (err: any) {
      // FunctionsHttpError esconde o corpo — extrai a mensagem real da edge function
      let msg = err?.message ?? 'Erro ao lançar pedido';
      try {
        if (err?.context && typeof err.context.json === 'function') {
          const body = await err.context.json();
          if (body?.erro) msg = body.erro;
        }
      } catch { /* mantém msg genérica */ }
      toast.error(msg, { duration: 8000 });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Lançar Pedido — Bling</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Cole o fechamento para preencher automaticamente, ou preencha manualmente.
        </p>
      </div>

      {/* Sucesso */}
      {sucesso && (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
          sucesso.blingOk
            ? 'border-green-500/30 bg-green-500/10'
            : 'border-yellow-500/30 bg-yellow-500/10'
        }`}>
          <CheckCircle className={`h-5 w-5 shrink-0 mt-0.5 ${sucesso.blingOk ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
          <div className="text-sm">
            <p className={`font-semibold ${sucesso.blingOk ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
              Pedido <span className="font-mono">{sucesso.numero}</span>{' '}
              {sucesso.blingOk ? 'criado no sistema e no Bling!' : 'salvo no sistema (falhou no Bling)'}
            </p>
            {sucesso.prazo && (
              <p className="text-xs mt-0.5 opacity-80">Prazo: {sucesso.prazo}</p>
            )}
            {!sucesso.blingOk && sucesso.blingErro && (
              <p className="text-xs mt-1 text-yellow-700 dark:text-yellow-500 font-mono break-all">
                {sucesso.blingErro}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── COLAR FECHAMENTO ── */}
      <section className="rounded-xl border bg-card overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
          onClick={() => setColarAberto(o => !o)}
        >
          <span className="flex items-center gap-2">
            <ClipboardPaste className="h-4 w-4 text-accent" />
            Colar fechamento
          </span>
          {colarAberto
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {colarAberto && (
          <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
            <Textarea
              value={textoColar}
              onChange={e => setTextoColar(e.target.value)}
              placeholder="Cole aqui o texto do fechamento do pedido..."
              className="text-sm min-h-[140px] resize-none font-mono text-xs leading-relaxed"
            />
            <Button onClick={aplicarFechamento} size="sm" className="w-full gap-2">
              <ClipboardPaste className="h-3.5 w-3.5" />
              Importar para o formulário
            </Button>
          </div>
        )}
      </section>

      {/* ── CLIENTE ── */}
      <Section title="Cliente">
        <Field label="Nome completo *">
          <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="José Carlos Mehring" className="h-8 text-sm" />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="CPF">
            <Input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" className="h-8 text-sm" />
          </Field>
          <Field label="Celular">
            <Input value={celular} onChange={e => setCelular(e.target.value)} placeholder="54 99999-9999" className="h-8 text-sm" />
          </Field>
        </div>

        <Field label="E-mail">
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@email.com" className="h-8 text-sm" />
        </Field>

        <div className="flex gap-2 items-end">
          <Field label="CEP">
            <Input
              value={cep}
              onChange={e => setCep(e.target.value)}
              onBlur={buscarCep}
              onKeyDown={e => e.key === 'Enter' && buscarCep()}
              placeholder="00000-000"
              className="h-8 text-sm w-32"
            />
          </Field>
          <Button variant="outline" size="sm" onClick={buscarCep} disabled={buscandoCep} className="h-8 shrink-0 mb-px">
            {buscandoCep ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          </Button>
          <Field label="Estado">
            <Input value={estado} onChange={e => setEstado(e.target.value)} placeholder="RS" className="h-8 text-sm w-16" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Cidade">
            <Input value={cidade} onChange={e => setCidade(e.target.value)} className="h-8 text-sm" />
          </Field>
          <Field label="Bairro">
            <Input value={bairro} onChange={e => setBairro(e.target.value)} className="h-8 text-sm" />
          </Field>
        </div>

        <div className="grid grid-cols-[1fr_80px_80px] gap-2">
          <Field label="Endereço">
            <Input value={endereco} onChange={e => setEndereco(e.target.value)} className="h-8 text-sm" />
          </Field>
          <Field label="Número">
            <Input value={numero} onChange={e => setNumero(e.target.value)} className="h-8 text-sm" />
          </Field>
          <Field label="Compl.">
            <Input value={complemento} onChange={e => setComplemento(e.target.value)} className="h-8 text-sm" />
          </Field>
        </div>

        <div className="max-w-[200px]">
          <Field label="Data de nascimento">
            <Input value={dataNasc} onChange={e => setDataNasc(e.target.value)} placeholder="DD/MM/AAAA" className="h-8 text-sm" />
          </Field>
        </div>
      </Section>

      {/* ── ITENS ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Itens</h2>
          <Button
            variant="outline" size="sm"
            onClick={() => setItens(prev => [...prev, itemVazio()])}
            className="h-7 text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar item
          </Button>
        </div>

        {itens.map((item, idx) => (
          <div key={idx} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Item {idx + 1}</span>
              {itens.length > 1 && (
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setItens(prev => prev.filter((_, i) => i !== idx))}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <Field label="Produto / Modelo *">
              <Input value={item.modelo} onChange={e => updateItem(idx, 'modelo', e.target.value)} placeholder="Jagunço, Camiseta, Acessório..." className="h-8 text-sm" />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Variação 1 (ex: Aço)">
                <Input value={item.aco} onChange={e => updateItem(idx, 'aco', e.target.value)} placeholder="Sandvik 14c28n" className="h-8 text-sm" />
              </Field>
              <Field label="Variação 2 (ex: Acabamento)">
                <Input value={item.acabamento} onChange={e => updateItem(idx, 'acabamento', e.target.value)} placeholder="Acetinado" className="h-8 text-sm" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Variação 3 (ex: Empunhadura)">
                <Input value={item.empunhadura} onChange={e => updateItem(idx, 'empunhadura', e.target.value)} placeholder="G10 Preto Dragon S" className="h-8 text-sm" />
              </Field>
              <Field label="Variação 4 (ex: Bainha)">
                <Input value={item.bainha} onChange={e => updateItem(idx, 'bainha', e.target.value)} placeholder="Porte Velado" className="h-8 text-sm" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Variação 5 (ex: Cor)">
                <Input value={item.corBainha} onChange={e => updateItem(idx, 'corBainha', e.target.value)} placeholder="Preto" className="h-8 text-sm" />
              </Field>
              <Field label="Personalização / Laser">
                <Input value={item.textoLaser} onChange={e => updateItem(idx, 'textoLaser', e.target.value)} placeholder="Sem gravação" className="h-8 text-sm" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Embalagem">
                <Input value={item.embalagem} onChange={e => updateItem(idx, 'embalagem', e.target.value)} placeholder="Embalagem Tradicional" className="h-8 text-sm" />
              </Field>
              <Field label="Obs. do item">
                <Input value={item.observacoesLamina} onChange={e => updateItem(idx, 'observacoesLamina', e.target.value)} placeholder="" className="h-8 text-sm" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Valor unitário (R$)">
                <Input
                  value={item.valorUnit}
                  onChange={e => updateItem(idx, 'valorUnit', e.target.value)}
                  placeholder="1015,00"
                  className="h-8 text-sm"
                />
              </Field>
              <Field label="Quantidade">
                <Input
                  type="number" min={1}
                  value={item.quantidade}
                  onChange={e => updateItem(idx, 'quantidade', Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-8 text-sm"
                />
              </Field>
            </div>
          </div>
        ))}
      </div>

      {/* ── PEDIDO ── */}
      <Section title="Pedido">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Valor total (R$)">
            <Input value={valorTotal} onChange={e => setValorTotal(e.target.value)} placeholder="1015,00" className="h-8 text-sm" />
          </Field>
          <Field label="Forma de pagamento">
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {FORMAS_PAG.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Canal de venda">
            <Select value={canal} onValueChange={setCanal}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {CANAIS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Vendedor">
            <Select value={vendedorId} onValueChange={setVendedorId}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {vendedores.map(v => <SelectItem key={v.id} value={v.id}>{v.nome_vendedor}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Nome proprietário p/ certificado">
          <Input
            value={nomeCertificado}
            onChange={e => setNomeCertificado(e.target.value)}
            placeholder={nome || 'Igual ao nome do cliente'}
            className="h-8 text-sm"
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Cupom">
            <Input value={cupom} onChange={e => setCupom(e.target.value)} placeholder="-" className="h-8 text-sm" />
          </Field>
          <Field label="Prazo de entrega">
            <Input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} className="h-8 text-sm" />
          </Field>
        </div>

        <Field label="Status do pedido">
          <Select value={statusPedido} onValueChange={setStatusPedido}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Brindes">
          <Input value={brindes} onChange={e => setBrindes(e.target.value)} placeholder="-" className="h-8 text-sm" />
        </Field>

        <Field label="Observações">
          <Textarea
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            placeholder="OBS: ..."
            className="text-sm min-h-[80px] resize-none"
          />
        </Field>
      </Section>

      {/* Submit */}
      <Button onClick={handleSubmit} disabled={loading} size="lg" className="w-full gap-2">
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Lançando pedido...</>
          : <><Send className="h-4 w-4" /> Lançar Pedido no Bling</>
        }
      </Button>

      <div className="h-4" />
    </div>
  );
}
