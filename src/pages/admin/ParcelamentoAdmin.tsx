import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Copy, Trash2, ExternalLink, Plus, Save, Share2 } from 'lucide-react';

interface Taxa {
  id: string;
  parcelas: number;
  taxa_percentual: number;
  rotulo: string | null;
  ativo: boolean;
  ordem: number;
}

interface Orcamento {
  id: string;
  slug: string;
  descricao: string;
  valor: number;
  parcelas_sem_juros_max: number;
  parcelas_max: number;
  observacao: string | null;
  whatsapp: string | null;
  ativo: boolean;
  created_at: string;
}

// Base URL pública para compartilhar (sem domínio de preview)
const PUBLIC_BASE = 'https://pedidoskaowz.lovable.app';

function makeSlug() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

export default function ParcelamentoAdmin() {
  const [taxas, setTaxas] = useState<Taxa[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [semJurosMax, setSemJurosMax] = useState('0');
  const [parcelasMax, setParcelasMax] = useState('12');
  const [observacao, setObservacao] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: t }, { data: o }] = await Promise.all([
      supabase.from('parcelamento_taxas').select('*').order('parcelas'),
      supabase.from('parcelamento_orcamentos').select('*').order('created_at', { ascending: false }),
    ]);
    setTaxas((t as Taxa[]) || []);
    setOrcamentos((o as Orcamento[]) || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveTaxa(t: Taxa) {
    const { error } = await supabase
      .from('parcelamento_taxas')
      .update({ taxa_percentual: t.taxa_percentual, rotulo: t.rotulo, ativo: t.ativo })
      .eq('id', t.id);
    if (error) toast.error('Erro ao salvar taxa');
    else toast.success(`${t.parcelas}x atualizado`);
  }

  async function createOrcamento() {
    const v = parseFloat(valor.replace(',', '.'));
    if (!descricao.trim() || !v || v <= 0) {
      toast.error('Preencha descrição e valor');
      return;
    }
    setCreating(true);
    const slug = makeSlug();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('parcelamento_orcamentos')
      .insert({
        slug,
        descricao: descricao.trim(),
        valor: v,
        parcelas_sem_juros_max: parseInt(semJurosMax) || 0,
        parcelas_max: parseInt(parcelasMax) || 12,
        observacao: observacao.trim() || null,
        whatsapp: whatsapp.replace(/\D/g, '') || null,
        created_by: user?.id,
      })
      .select()
      .single();
    setCreating(false);
    if (error) {
      toast.error('Erro ao criar orçamento');
      return;
    }
    setDescricao(''); setValor(''); setObservacao(''); setSemJurosMax('0'); setWhatsapp('');
    await load();
    copyLink((data as Orcamento).slug);
    toast.success('Orçamento criado! Link copiado.');
  }

  function copyLink(slug: string) {
    const url = `${PUBLIC_BASE}/p/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado');
  }

  function shareWhatsApp(o: Orcamento) {
    const url = `${PUBLIC_BASE}/p/${o.slug}`;
    const msg = `Olá! Aqui está sua simulação de parcelamento para *${o.descricao}*:\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  async function removeOrcamento(id: string) {
    if (!confirm('Excluir este orçamento? O link ficará inválido.')) return;
    const { error } = await supabase.from('parcelamento_orcamentos').delete().eq('id', id);
    if (error) toast.error('Erro ao excluir');
    else { toast.success('Excluído'); load(); }
  }

  async function toggleAtivo(o: Orcamento) {
    await supabase.from('parcelamento_orcamentos').update({ ativo: !o.ativo }).eq('id', o.id);
    load();
  }

  return (
    <div className="container max-w-5xl mx-auto p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Simulador de Parcelamento</h1>
        <p className="text-sm text-muted-foreground">
          Crie orçamentos com link público para o cliente visualizar as opções de parcelamento.
        </p>
      </div>

      <Tabs defaultValue="orcamentos">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
          <TabsTrigger value="taxas">Taxas</TabsTrigger>
        </TabsList>

        <TabsContent value="orcamentos" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" /> Novo orçamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Descrição do produto/serviço *</Label>
                <Input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Kit Sandvik EDC + bainha personalizada"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Valor (R$) *</Label>
                  <Input
                    inputMode="decimal"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Parcelas sem juros</Label>
                  <Input
                    type="number" min="0" max="12"
                    value={semJurosMax}
                    onChange={(e) => setSemJurosMax(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Máx. de parcelas</Label>
                  <Input
                    type="number" min="1" max="12"
                    value={parcelasMax}
                    onChange={(e) => setParcelasMax(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>WhatsApp para receber a escolha (com DDD)</Label>
                <Input
                  inputMode="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ex: 11999998888"
                />
                <p className="text-[10px] text-muted-foreground">
                  Quando o cliente escolher uma parcela, será enviada uma mensagem para esse número.
                </p>
              </div>
              <div className="space-y-1">
                <Label>Observação (opcional)</Label>
                <Textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Mensagem que aparecerá ao cliente"
                  rows={2}
                />
              </div>
              <Button onClick={createOrcamento} disabled={creating} className="w-full sm:w-auto">
                {creating ? 'Criando...' : 'Criar e copiar link'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Orçamentos ativos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : orcamentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum orçamento criado ainda.</p>
              ) : (
                orcamentos.map((o) => (
                  <div key={o.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{o.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          R$ {Number(o.valor).toFixed(2).replace('.', ',')} ·{' '}
                          {o.parcelas_sem_juros_max > 0 ? `${o.parcelas_sem_juros_max}x sem juros · ` : ''}
                          até {o.parcelas_max}x
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          /p/{o.slug} · {new Date(o.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Switch checked={o.ativo} onCheckedChange={() => toggleAtivo(o)} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => copyLink(o.slug)}>
                        <Copy className="h-3 w-3 mr-1" /> Copiar link
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => shareWhatsApp(o)}>
                        <Share2 className="h-3 w-3 mr-1" /> WhatsApp
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={`/p/${o.slug}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" /> Abrir
                        </a>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeOrcamento(o.id)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Excluir
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="taxas" className="space-y-3 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Taxas por parcela (CET da maquininha)</CardTitle>
              <p className="text-xs text-muted-foreground">
                A taxa é embutida no valor da parcela mostrada ao cliente, sem exibir o total com juros.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {taxas.map((t, idx) => (
                <div key={t.id} className="grid grid-cols-[80px_1fr_100px_auto] gap-2 items-center">
                  <span className="text-sm font-medium">{t.parcelas}x</span>
                  <Input
                    value={t.rotulo || ''}
                    onChange={(e) => {
                      const copy = [...taxas]; copy[idx] = { ...t, rotulo: e.target.value }; setTaxas(copy);
                    }}
                    placeholder="Rótulo"
                    className="h-9"
                  />
                  <div className="relative">
                    <Input
                      type="number" step="0.01"
                      value={t.taxa_percentual}
                      onChange={(e) => {
                        const copy = [...taxas]; copy[idx] = { ...t, taxa_percentual: parseFloat(e.target.value) || 0 }; setTaxas(copy);
                      }}
                      className="h-9 pr-7"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => saveTaxa(t)}>
                    <Save className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
