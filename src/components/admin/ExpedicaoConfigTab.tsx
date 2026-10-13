import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

/** Aba "Expedição": equipe que envia, feriados e horário de corte da Pronta Entrega. */
export default function ExpedicaoConfigTab() {
  const qc = useQueryClient();
  const [novoNome, setNovoNome] = useState('');
  const [novaData, setNovaData] = useState('');
  const [novaDesc, setNovaDesc] = useState('');
  const [corte, setCorte] = useState<string | null>(null);

  const { data: equipe = [] } = useQuery({
    queryKey: ['equipe-expedicao'],
    queryFn: async () => (await supabase.from('equipe_expedicao').select('*').order('nome')).data ?? [],
  });
  const { data: feriados = [] } = useQuery({
    queryKey: ['feriados-lista'],
    queryFn: async () => (await supabase.from('feriados').select('*').order('data')).data ?? [],
  });
  const { data: corteSalvo = '14:00' } = useQuery({
    queryKey: ['horario-corte'],
    queryFn: async () => (await supabase.from('config_expedicao').select('valor').eq('chave', 'horario_corte').maybeSingle()).data?.valor ?? '14:00',
  });
  const atualizar = () => {
    ['equipe-expedicao', 'equipe-expedicao-ativos', 'feriados-lista', 'feriados', 'horario-corte'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
  const erro = (e: { message: string } | null) => { if (e) { toast.error(e.message); return true; } return false; };

  const addPessoa = async () => {
    if (!novoNome.trim()) return;
    if (erro((await supabase.from('equipe_expedicao').insert({ nome: novoNome.trim() })).error)) return;
    setNovoNome(''); toast.success('Pessoa adicionada'); atualizar();
  };
  const addFeriado = async () => {
    if (!novaData) { toast.error('Escolha a data do feriado'); return; }
    if (erro((await supabase.from('feriados').upsert({ data: novaData, descricao: novaDesc.trim() || null })).error)) return;
    setNovaData(''); setNovaDesc(''); toast.success('Feriado adicionado'); atualizar();
  };
  const salvarCorte = async () => {
    if (erro((await supabase.from('config_expedicao').upsert({ chave: 'horario_corte', valor: corte ?? corteSalvo })).error)) return;
    toast.success('Horário de corte salvo'); setCorte(null); atualizar();
  };

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Equipe da expedição</h3>
        <p className="text-[11px] text-muted-foreground">Pessoas que aparecem em "Quem está enviando" na Pronta Entrega. Desative quem saiu, sem apagar o histórico.</p>
        <div className="flex gap-2">
          <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPessoa(); } }} className="h-10 flex-1" />
          <Button className="h-10 gap-1.5" onClick={addPessoa}><Plus className="w-4 h-4" /> Adicionar</Button>
        </div>
        {equipe.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Ninguém cadastrado ainda. Sem isso, não dá para marcar pedidos como enviados.</div>
        ) : equipe.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-lg border p-2">
            <span className="flex-1 text-sm truncate">{p.nome}</span>
            <Switch checked={p.ativo} onCheckedChange={async (v) => { if (!erro((await supabase.from('equipe_expedicao').update({ ativo: v }).eq('id', p.id)).error)) atualizar(); }} />
            <Button variant="ghost" size="icon" onClick={async () => { if (!erro((await supabase.from('equipe_expedicao').delete().eq('id', p.id)).error)) atualizar(); }}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Horário de corte</h3>
        <p className="text-[11px] text-muted-foreground">Pedido pago depois deste horário começa a contar o prazo só no próximo dia útil.</p>
        <div className="flex gap-2 items-end">
          <div className="space-y-1"><Label className="text-xs">Horário</Label>
            <Input type="time" value={corte ?? corteSalvo} onChange={(e) => setCorte(e.target.value)} className="h-10 w-32" /></div>
          <Button className="h-10 gap-1.5" onClick={salvarCorte} disabled={corte === null}><Save className="w-4 h-4" /> Salvar</Button>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Feriados</h3>
        <p className="text-[11px] text-muted-foreground">Dias que não contam como dia útil no prazo de envio. Sábados e domingos já não contam.</p>
        <div className="flex flex-wrap gap-2">
          <Input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} className="h-10 w-40" />
          <Input value={novaDesc} onChange={(e) => setNovaDesc(e.target.value)} placeholder="Descrição (ex.: Aniversário da cidade)" className="h-10 flex-1 min-w-[160px]" />
          <Button className="h-10 gap-1.5" onClick={addFeriado}><Plus className="w-4 h-4" /> Adicionar</Button>
        </div>
        <div className="space-y-1">
          {feriados.map((f) => (
            <div key={f.data} className="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm">
              <span className="tabular-nums w-24">{f.data.split('-').reverse().join('/')}</span>
              <span className="flex-1 truncate text-muted-foreground">{f.descricao}</span>
              <Button variant="ghost" size="icon" onClick={async () => { if (!erro((await supabase.from('feriados').delete().eq('data', f.data)).error)) atualizar(); }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
