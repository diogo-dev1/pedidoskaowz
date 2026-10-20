import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, Bell, BellOff, Send } from 'lucide-react';
import { toast } from 'sonner';

type Estado = 'carregando' | 'sem_suporte' | 'ios_instalar' | 'sem_sw' | 'negado' | 'ativado' | 'desativado';

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

function plataforma() {
  const ua = navigator.userAgent;
  if (isIOS()) return 'iPhone/iPad';
  if (/android/i.test(ua)) return 'Android';
  if (/windows/i.test(ua)) return 'Windows';
  if (/mac/i.test(ua)) return 'Mac';
  return 'Outro';
}

function base64ParaUint8(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registroAtivo(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  const regs = await navigator.serviceWorker.getRegistrations();
  return regs.find((r) => r.active) ?? null;
}

const dataHora = (iso: string | null) => iso
  ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  : 'nenhum ainda';

export default function NotificacoesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [estado, setEstado] = useState<Estado>('carregando');
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const { data: aparelhos } = useQuery({
    queryKey: ['push-aparelhos'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from('push_aparelhos')
        .select('id, nome, plataforma, ultimo_envio_em, endpoint').eq('ativo', true).order('created_at');
      if (error) throw error;
      return data ?? [];
    },
  });

  const avaliar = useCallback(async () => {
    if (isIOS() && !standalone()) return setEstado('ios_instalar');
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return setEstado('sem_suporte');
    const reg = await registroAtivo();
    if (!reg) return setEstado('sem_sw');
    if (Notification.permission === 'denied') return setEstado('negado');
    const sub = await reg.pushManager.getSubscription();
    setEndpoint(sub?.endpoint ?? null);
    setEstado(sub ? 'ativado' : 'desativado');
  }, []);

  useEffect(() => { if (open) { setEstado('carregando'); avaliar(); } }, [open, avaliar]);

  const testar = async (ep: string) => {
    const { data, error } = await supabase.functions.invoke('notificar-carrinhos', { body: { acao: 'testar', endpoint: ep } });
    if (error || !data?.enviado) toast.error('Não foi possível enviar o teste');
    else toast.success('Teste enviado — confira a notificação');
    qc.invalidateQueries({ queryKey: ['push-aparelhos'] });
  };

  const ativar = async () => {
    if (!nome.trim()) { toast.error('Dê um nome ao aparelho (ex.: Celular Mel)'); return; }
    setOcupado(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setEstado(perm === 'denied' ? 'negado' : 'desativado'); return; }
      const reg = await registroAtivo();
      if (!reg) { setEstado('sem_sw'); return; }
      const { data, error } = await supabase.functions.invoke('notificar-carrinhos', { body: { acao: 'chave_publica' } });
      if (error || !data?.chave) throw new Error('Não foi possível obter a chave');
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ParaUint8(data.chave) });
      const j = sub.toJSON();
      const { error: e2 } = await supabase.from('push_aparelhos').upsert({
        nome: nome.trim(), endpoint: sub.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth,
        plataforma: plataforma(), user_agent: navigator.userAgent.slice(0, 300),
        ativo: true, falhas: 0, ultimo_erro: null,
      }, { onConflict: 'endpoint' });
      if (e2) throw e2;
      setEndpoint(sub.endpoint);
      setEstado('ativado');
      await testar(sub.endpoint);
    } catch (e) {
      toast.error('Erro ao ativar: ' + (e as Error).message);
    } finally { setOcupado(false); }
  };

  const desativar = async () => {
    setOcupado(true);
    try {
      const reg = await registroAtivo();
      const sub = await reg?.pushManager.getSubscription();
      const ep = sub?.endpoint ?? endpoint;
      await sub?.unsubscribe();
      if (ep) await supabase.from('push_aparelhos').delete().eq('endpoint', ep);
      setEndpoint(null);
      setEstado('desativado');
      toast.success('Notificações desativadas neste aparelho');
      qc.invalidateQueries({ queryKey: ['push-aparelhos'] });
    } finally { setOcupado(false); }
  };

  const remover = async (id: string) => {
    const { error } = await supabase.from('push_aparelhos').delete().eq('id', id);
    if (error) { toast.error('Erro ao remover'); return; }
    qc.invalidateQueries({ queryKey: ['push-aparelhos'] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Notificações de carrinho perdido</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p className="text-xs text-muted-foreground">
            Avisamos este aparelho assim que um novo carrinho abandonado aparecer nesta tela (verificação a cada 5 minutos).
          </p>

          <div className="flex items-center justify-between rounded-md border p-3">
            <span className="font-medium">Este aparelho</span>
            {estado === 'carregando' ? <Loader2 className="h-4 w-4 animate-spin" /> :
              <Badge variant={estado === 'ativado' ? 'default' : 'secondary'}>{estado === 'ativado' ? 'Ativado' : 'Desativado'}</Badge>}
          </div>

          {estado === 'ios_instalar' && (
            <div className="rounded-md border p-3 space-y-1">
              <p>No Safari: <b>Compartilhar → Adicionar à Tela de Início</b>. Depois abra o app pelo ícone e ative aqui.</p>
              <p className="text-xs text-muted-foreground">Requer iOS 16.4 ou mais novo.</p>
            </div>
          )}
          {estado === 'sem_sw' && (
            <p className="rounded-md border p-3">As notificações funcionam só no app publicado (pedidoskaowz.lovable.app).</p>
          )}
          {estado === 'sem_suporte' && (
            <p className="rounded-md border p-3">Este navegador não aceita notificações. Tente o Chrome, Edge ou o app instalado.</p>
          )}
          {estado === 'negado' && (
            <div className="rounded-md border p-3 space-y-1">
              <p>As notificações foram bloqueadas para este site.</p>
              <p className="text-xs text-muted-foreground">
                Toque no cadeado ao lado do endereço (ou em Configurações do navegador → Configurações do site → Notificações),
                permita para pedidoskaowz.lovable.app e reabra esta janela.
              </p>
            </div>
          )}

          {estado === 'desativado' && (
            <div className="space-y-2">
              <Input placeholder="Nome do aparelho (ex.: Celular Mel)" value={nome} onChange={(e) => setNome(e.target.value)} />
              <Button className="w-full gap-2" onClick={ativar} disabled={ocupado}>
                {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />} Ativar neste aparelho
              </Button>
            </div>
          )}

          {estado === 'ativado' && endpoint && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => testar(endpoint)} disabled={ocupado}>
                <Send className="h-4 w-4" /> Enviar teste
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={desativar} disabled={ocupado}>
                <BellOff className="h-4 w-4" /> Desativar neste aparelho
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aparelhos ativos</p>
            {(aparelhos ?? []).length === 0 && <p className="text-xs text-muted-foreground">Nenhum aparelho ativado ainda.</p>}
            {(aparelhos ?? []).map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-md border p-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{a.nome}{a.endpoint === endpoint ? ' (este)' : ''}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.plataforma ?? '—'} · último aviso: {dataHora(a.ultimo_envio_em)}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => remover(a.id)} aria-label={`Remover ${a.nome}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
