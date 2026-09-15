import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  AlertTriangle, ClipboardList, Download, Loader2, MessageCircle,
  RotateCcw, Save, Trash2, Upload,
} from 'lucide-react';
import { toast } from 'sonner';

interface Contato {
  id: string;
  telefone: string;
  nome: string | null;
  origem: string | null;
  enviado: boolean;
  enviado_em: string | null;
  observacao: string | null;
  created_at: string;
}

interface Template {
  id: string;
  nome: string;
  mensagem: string;
  ativo: boolean;
}

interface Processado {
  validos: Array<{ telefone: string; nome: string | null }>;
  invalidos: string[];
  duplicados: number;
}

const contatoSchema = z.object({
  telefone: z.string().regex(/^55\d{10,11}$/),
  nome: z.string().trim().max(150).nullable(),
});
const origemSchema = z.string().trim().max(200);
const mensagemSchema = z.string().trim().min(1, 'Escreva uma mensagem').max(4000, 'A mensagem está muito longa');
const observacaoSchema = z.string().trim().max(1000);
const META_KEY = 'kaowz-upsell-lista-avulsa-meta';

function normalizarNumero(valor: string): string | null {
  let digitos = valor.replace(/\D/g, '').replace(/^0+/, '');
  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) return digitos;
  if (digitos.length === 10 && ['6', '7', '8', '9'].includes(digitos[2])) {
    digitos = `${digitos.slice(0, 2)}9${digitos.slice(2)}`;
  }
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  return digitos.length === 12 || digitos.length === 13 ? digitos : null;
}

function formatarTelefone(telefone: string) {
  const nacional = telefone.startsWith('55') ? telefone.slice(2) : telefone;
  const ddd = nacional.slice(0, 2);
  const numero = nacional.slice(2);
  if (numero.length === 9) return `+55 (${ddd}) ${numero.slice(0, 5)}-${numero.slice(5)}`;
  return `+55 (${ddd}) ${numero.slice(0, 4)}-${numero.slice(4)}`;
}

function extrairEntrada(entrada: string) {
  const limpa = entrada.trim();
  const trecho = limpa.match(/\+?\d[\d().\s-]{7,}\d/)?.[0];
  if (!trecho) return { invalido: limpa };
  const telefone = normalizarNumero(trecho);
  if (!telefone) return { invalido: limpa };
  const nome = limpa
    .replace(trecho, ' ')
    .replace(/^[\s,;:|–—-]+|[\s,;:|–—-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { telefone, nome: nome ? nome.slice(0, 150) : null };
}

function montarMensagem(texto: string, nome: string | null) {
  const primeiroNome = nome?.trim().split(/\s+/)[0] ?? '';
  return texto
    .split('{nome}').join(primeiroNome)
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/([,.;!?])\1+/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function csvCampo(valor: string | boolean | null) {
  const texto = valor === null ? '' : String(valor);
  return `"${texto.split('"').join('""')}"`;
}

export default function UpsellListaAvulsa() {
  const queryClient = useQueryClient();
  const [entrada, setEntrada] = useState('');
  const [origem, setOrigem] = useState('');
  const [processado, setProcessado] = useState<Processado | null>(null);
  const [processando, setProcessando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [templateId, setTemplateId] = useState('livre');
  const [mensagem, setMensagem] = useState('');
  const [aba, setAba] = useState('pendentes');
  const [filtroOrigem, setFiltroOrigem] = useState('todas');
  const [meta, setMeta] = useState(() => {
    const salva = Number(localStorage.getItem(META_KEY));
    return Number.isFinite(salva) && salva > 0 ? salva : 40;
  });

  const { data: contatos = [], isLoading } = useQuery({
    queryKey: ['upsell-lista-avulsa'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upsell_lista_avulsa')
        .select('*')
        .order('enviado', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Contato[];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['upsell-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('upsell_clientes_templates')
        .select('id, nome, mensagem, ativo')
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return data as Template[];
    },
  });

  useEffect(() => {
    localStorage.setItem(META_KEY, String(meta));
  }, [meta]);

  const origens = useMemo(
    () => Array.from(new Set(contatos.map((c) => c.origem).filter((v): v is string => Boolean(v)))).sort(),
    [contatos],
  );
  const enviados = contatos.filter((c) => c.enviado).length;
  const hoje = new Date().toDateString();
  const enviadosHoje = contatos.filter((c) => c.enviado_em && new Date(c.enviado_em).toDateString() === hoje).length;
  const listaFiltrada = contatos.filter((c) => {
    const statusOk = aba === 'todos' || (aba === 'enviados' ? c.enviado : !c.enviado);
    return statusOk && (filtroOrigem === 'todas' || c.origem === filtroOrigem);
  });

  const processarLista = async () => {
    if (!entrada.trim()) { toast.error('Cole ao menos um contato'); return; }
    setProcessando(true);
    const partes = entrada.split(/[\n,;]+/).map((v) => v.trim()).filter(Boolean);
    const validosMap = new Map<string, { telefone: string; nome: string | null }>();
    const invalidos: string[] = [];
    for (const parte of partes) {
      const resultado = extrairEntrada(parte);
      if ('invalido' in resultado) invalidos.push(resultado.invalido);
      else if (resultado.telefone) validosMap.set(resultado.telefone, { telefone: resultado.telefone, nome: resultado.nome ?? null });
    }
    const candidatos = Array.from(validosMap.values());
    let existentes = new Set<string>();
    if (candidatos.length) {
      const { data, error } = await supabase
        .from('upsell_lista_avulsa')
        .select('telefone')
        .in('telefone', candidatos.map((c) => c.telefone));
      if (error) { toast.error('Não foi possível conferir os contatos existentes'); setProcessando(false); return; }
      existentes = new Set((data ?? []).map((c) => c.telefone));
    }
    setProcessado({
      validos: candidatos.filter((c) => !existentes.has(c.telefone)),
      invalidos,
      duplicados: existentes.size,
    });
    setProcessando(false);
  };

  const salvarLista = async () => {
    if (!processado?.validos.length) { toast.error('Não há contatos novos para salvar'); return; }
    const origemValidada = origemSchema.safeParse(origem);
    if (!origemValidada.success) { toast.error('A origem deve ter no máximo 200 caracteres'); return; }
    const todosValidos = processado.validos.every((c) => contatoSchema.safeParse(c).success);
    if (!todosValidos) { toast.error('Há um contato com dados inválidos'); return; }
    const linhas = processado.validos.map((c) => ({
      telefone: c.telefone,
      nome: c.nome,
      origem: origemValidada.data || null,
    }));
    setSalvando(true);
    const { error } = await supabase.from('upsell_lista_avulsa').upsert(linhas, { onConflict: 'telefone', ignoreDuplicates: true });
    setSalvando(false);
    if (error) { toast.error('Erro ao salvar contatos: ' + error.message); return; }
    toast.success(`${linhas.length} contato(s) salvo(s)`);
    setEntrada(''); setProcessado(null);
    queryClient.invalidateQueries({ queryKey: ['upsell-lista-avulsa'] });
  };

  const escolherTemplate = (id: string) => {
    setTemplateId(id);
    if (id === 'livre') { setMensagem(''); return; }
    setMensagem(templates.find((t) => t.id === id)?.mensagem ?? '');
  };

  const atualizarContato = async (id: string, alteracoes: Partial<Contato>) => {
    const { error } = await supabase.from('upsell_lista_avulsa').update(alteracoes).eq('id', id);
    if (error) { toast.error('Erro ao atualizar contato'); return false; }
    await queryClient.invalidateQueries({ queryKey: ['upsell-lista-avulsa'] });
    return true;
  };

  const abrirWhatsApp = async (contato: Contato) => {
    const validacao = mensagemSchema.safeParse(mensagem);
    if (!validacao.success) { toast.error(validacao.error.issues[0]?.message ?? 'Mensagem inválida'); return; }
    const texto = montarMensagem(validacao.data, contato.nome);
    window.open(`https://wa.me/${contato.telefone}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
    const salvo = await atualizarContato(contato.id, { enviado: true, enviado_em: new Date().toISOString() });
    if (salvo) toast.success('Contato marcado como enviado');
  };

  const salvarObservacao = async (contato: Contato, valor: string) => {
    if (valor === (contato.observacao ?? '')) return;
    const validacao = observacaoSchema.safeParse(valor);
    if (!validacao.success) { toast.error('A observação deve ter no máximo 1.000 caracteres'); return; }
    const salvo = await atualizarContato(contato.id, { observacao: validacao.data || null });
    if (salvo) toast.success('Observação salva');
  };

  const excluirContato = async (id: string) => {
    const { error } = await supabase.from('upsell_lista_avulsa').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir contato'); return; }
    toast.success('Contato excluído');
    queryClient.invalidateQueries({ queryKey: ['upsell-lista-avulsa'] });
  };

  const limparEnviados = async () => {
    const { error } = await supabase.from('upsell_lista_avulsa').delete().eq('enviado', true);
    if (error) { toast.error('Erro ao limpar enviados'); return; }
    toast.success('Contatos enviados removidos');
    queryClient.invalidateQueries({ queryKey: ['upsell-lista-avulsa'] });
  };

  const exportarCsv = () => {
    const cabecalho = ['telefone', 'nome', 'origem', 'enviado', 'enviado_em'];
    const linhas = contatos.map((c) => [c.telefone, c.nome, c.origem, c.enviado, c.enviado_em].map(csvCampo).join(','));
    const blob = new Blob([`\uFEFF${cabecalho.join(',')}\n${linhas.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `lista-avulsa-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-4 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
          <div>
            <h1 className="text-lg sm:text-2xl font-bold leading-tight">Lista Avulsa</h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Contatos capturados em feiras e eventos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 flex-1 sm:flex-none" onClick={exportarCsv} disabled={!contatos.length}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 flex-1 sm:flex-none text-destructive" disabled={!enviados}>
                <Trash2 className="h-4 w-4" /> Limpar enviados
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="w-[calc(100vw-1.5rem)] rounded-lg">
              <AlertDialogHeader><AlertDialogTitle>Limpar contatos enviados?</AlertDialogTitle><AlertDialogDescription>Esta ação excluirá permanentemente todos os contatos marcados como enviados.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={limparEnviados} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir enviados</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {enviadosHoje >= meta && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Você atingiu a meta de hoje. Continuar pode aumentar o risco de bloqueio.</span>
        </div>
      )}

      <section className="border rounded-xl bg-card p-3 sm:p-4 space-y-3">
        <div><h2 className="font-semibold text-sm">Colar lista</h2><p className="text-[11px] text-muted-foreground">Aceita contatos por linha, vírgula ou ponto e vírgula.</p></div>
        <Textarea value={entrada} onChange={(e) => setEntrada(e.target.value)} rows={7} maxLength={20000} className="text-sm min-h-[150px]" placeholder={'Maria Silva - (28) 99902-5695\n+55 11 98888-7777 João\n(27) 3333-4444; Ana, 21987654321'} />
        <Button onClick={processarLista} disabled={processando} className="gap-2 w-full sm:w-auto">
          {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Processar lista
        </Button>
        {processado && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-lg font-bold text-emerald-600">{processado.validos.length}</p><p className="text-[10px] text-muted-foreground">válidos novos</p></div>
              <div><p className="text-lg font-bold text-destructive">{processado.invalidos.length}</p><p className="text-[10px] text-muted-foreground">inválidos</p></div>
              <div><p className="text-lg font-bold text-amber-600">{processado.duplicados}</p><p className="text-[10px] text-muted-foreground">já existentes</p></div>
            </div>
            {processado.invalidos.length > 0 && <p className="text-[10px] text-muted-foreground break-words"><span className="font-semibold">Confira os inválidos:</span> {processado.invalidos.join(' · ')}</p>}
            <div className="space-y-1.5"><label className="text-xs font-medium">Origem/Rótulo do lote</label><Input value={origem} onChange={(e) => setOrigem(e.target.value)} maxLength={200} placeholder="Ex.: Feira de Cutelaria — set/2026" /></div>
            <Button onClick={salvarLista} disabled={salvando || !processado.validos.length} className="gap-2 w-full sm:w-auto"><Save className="h-4 w-4" /> Salvar na lista</Button>
          </div>
        )}
      </section>

      <section className="border rounded-xl bg-card p-3 sm:p-4 space-y-3">
        <div><h2 className="font-semibold text-sm">Mensagem geral</h2><p className="text-[11px] text-muted-foreground">A mesma mensagem será usada para todos os contatos.</p></div>
        <Select value={templateId} onValueChange={escolherTemplate}><SelectTrigger><SelectValue placeholder="Escolha um modelo do Upsell" /></SelectTrigger><SelectContent><SelectItem value="livre">Mensagem livre</SelectItem>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent></Select>
        <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={6} maxLength={4000} placeholder="Olá {nome}, tudo bem?" className="text-sm" />
        <p className="text-[11px] text-muted-foreground">Mensagens idênticas em massa aumentam o risco de bloqueio. Use {'{nome}'} e evite enviar link na primeira mensagem.</p>
        {mensagem && <div className="rounded-lg bg-muted/50 border p-2.5"><p className="text-[10px] font-medium text-muted-foreground mb-1">Pré-visualização</p><p className="text-xs whitespace-pre-wrap">{montarMensagem(mensagem, 'Maria Silva')}</p></div>}
      </section>

      <section className="space-y-3">
        <div className="border rounded-xl bg-card p-3 sm:p-4 space-y-3">
          <div className="flex items-end justify-between gap-3"><div><h2 className="font-semibold text-sm">Contatos</h2><p className="text-xs text-muted-foreground">{enviados} de {contatos.length} enviados</p></div><div className="w-28"><label className="text-[10px] text-muted-foreground">Meta do dia</label><Input type="number" min={1} max={500} value={meta} onChange={(e) => setMeta(Math.min(500, Math.max(1, Number(e.target.value) || 1)))} className="h-8" /></div></div>
          <Progress value={contatos.length ? (enviados / contatos.length) * 100 : 0} className="h-2" />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>{enviadosHoje} enviados hoje</span><span>Meta: {meta}</span></div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Tabs value={aba} onValueChange={setAba}><TabsList className="grid grid-cols-3 w-full"><TabsTrigger value="pendentes">Pendentes</TabsTrigger><TabsTrigger value="enviados">Enviados</TabsTrigger><TabsTrigger value="todos">Todos</TabsTrigger></TabsList></Tabs>
            <Select value={filtroOrigem} onValueChange={setFiltroOrigem}><SelectTrigger className="sm:w-56"><SelectValue placeholder="Todas as origens" /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as origens</SelectItem>{origens.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
          </div>
        </div>

        {isLoading ? <div className="py-12 flex justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div> : listaFiltrada.length === 0 ? <div className="border rounded-xl py-12 text-center text-sm text-muted-foreground">Nenhum contato nesta seleção.</div> : listaFiltrada.map((contato) => (
          <div key={contato.id} className={`border rounded-xl bg-card p-3 space-y-2.5 ${contato.enviado ? 'opacity-65' : ''}`}>
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="flex items-center gap-1.5"><p className="font-semibold text-sm truncate">{contato.nome || 'Sem nome'}</p>{contato.enviado && <Badge variant="secondary" className="text-[10px]">Enviado</Badge>}</div><p className="text-xs text-muted-foreground">{formatarTelefone(contato.telefone)}</p>{contato.origem && <p className="text-[10px] text-muted-foreground truncate">{contato.origem}</p>}</div><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => excluirContato(contato.id)} title="Excluir contato"><Trash2 className="h-4 w-4" /></Button></div>
            <Input defaultValue={contato.observacao ?? ''} maxLength={1000} onBlur={(e) => salvarObservacao(contato, e.target.value)} placeholder="Observação deste contato" className="h-9 text-xs" />
            <div className="flex gap-2">
              {!contato.enviado ? <Button className="gap-2 flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => abrirWhatsApp(contato)}><MessageCircle className="h-4 w-4" /> WhatsApp</Button> : <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={() => atualizarContato(contato.id, { enviado: false, enviado_em: null })}><RotateCcw className="h-4 w-4" /> Desmarcar</Button>}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
