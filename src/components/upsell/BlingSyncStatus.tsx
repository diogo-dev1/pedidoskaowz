import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { dataHora } from '@/lib/upsellMensagem';

/** Última sincronização bem-sucedida do Bling e atalho para sincronizar quando atrasada (> 24h). */
export default function BlingSyncStatus() {
  const qc = useQueryClient();
  const [rodando, setRodando] = useState(false);
  const { data: ultima } = useQuery({
    queryKey: ['bling-ultima-sync'],
    queryFn: async () => {
      const { data } = await supabase.from('bling_sync_log').select('finished_at')
        .eq('status', 'completed').not('finished_at', 'is', null)
        .order('finished_at', { ascending: false }).limit(1).maybeSingle();
      return data?.finished_at ?? null;
    },
    staleTime: 60_000,
  });
  const atrasada = !ultima || Date.now() - new Date(ultima).getTime() > 24 * 3600_000;

  const sincronizar = async () => {
    setRodando(true);
    const { error } = await supabase.functions.invoke('bling-sync', { body: { type: 'incremental' } });
    setRodando(false);
    if (error) { toast.error('Não foi possível sincronizar o Bling agora'); return; }
    toast.success('Base do Bling sincronizada');
    qc.invalidateQueries({ queryKey: ['bling-ultima-sync'] });
    qc.invalidateQueries({ queryKey: ['upsell-clientes'] });
    qc.invalidateQueries({ queryKey: ['upsell-resumo'] });
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        Base do Bling atualizada em {ultima ? dataHora(ultima) : '—'}
      </p>
      {atrasada && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-600">
          <p className="flex items-center gap-2 text-xs font-medium flex-1 min-w-0">
            <AlertTriangle className="h-4 w-4 shrink-0" /> Sincronização do Bling atrasada
          </p>
          <Button size="sm" variant="outline" className="gap-2 h-8" onClick={sincronizar} disabled={rodando}>
            {rodando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sincronizar agora
          </Button>
        </div>
      )}
    </div>
  );
}
